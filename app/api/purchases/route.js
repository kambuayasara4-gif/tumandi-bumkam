import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTransactionNumber, postJournalEntry } from '@/lib/accounting';
import { Decimal } from 'decimal.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const paymentStatus = searchParams.get('paymentStatus');

    const where = {};
    if (supplierId && supplierId !== 'ALL') {
      where.supplierId = supplierId;
    }
    if (paymentStatus && paymentStatus !== 'ALL') {
      where.paymentStatus = paymentStatus;
    }

    const purchases = await prisma.purchaseInvoice.findMany({
      where,
      include: {
        supplier: true,
        cashAccount: true,
        journalEntry: true,
        items: {
          include: { item: { include: { category: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(purchases);
  } catch (error) {
    console.error('Error get purchases:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat daftar pembelian.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      date,
      dueDate,
      supplierId,
      items,
      cashAccountId,
      paidAmount,
      notes,
    } = body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Pemasok dan minimal 1 item barang pembelian wajib diisi.' },
        { status: 400 }
      );
    }

    const supplier = await prisma.contact.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json(
        { success: false, message: 'Data pemasok tidak ditemukan di database.' },
        { status: 404 }
      );
    }

    const txDate = date ? new Date(date) : new Date();
    const txDueDate = dueDate ? new Date(dueDate) : null;

    // 1. Hitung Total Pembelian & Validasi Tiap Baris Item
    let totalAmountDec = new Decimal(0);
    const validatedItems = [];

    for (const line of items) {
      const qDec = new Decimal(line.quantity || 0);
      const pDec = new Decimal(line.unitPrice || 0);

      if (!qDec.greaterThan(0)) {
        return NextResponse.json(
          { success: false, message: 'Kuantitas setiap item harus lebih dari nol.' },
          { status: 400 }
        );
      }

      const lineTotal = qDec.times(pDec);
      totalAmountDec = totalAmountDec.plus(lineTotal);

      validatedItems.push({
        itemId: line.itemId,
        quantity: qDec,
        unitPrice: pDec,
        totalPrice: lineTotal,
      });
    }

    // 2. Hitung Status Pembayaran (Lunas, Sebagian/DP, Tempo/Utang)
    const paidDec = new Decimal(paidAmount || 0);
    let paymentStatus = 'UNPAID';
    if (paidDec.greaterThanOrEqualTo(totalAmountDec)) {
      paymentStatus = 'PAID';
    } else if (paidDec.greaterThan(0)) {
      paymentStatus = 'PARTIAL';
    }

    const unpaidDec = totalAmountDec.minus(paidDec);

    // Ambil Akun Kas/Bank jika ada pembayaran
    let cashAccount = null;
    if (paidDec.greaterThan(0)) {
      if (!cashAccountId) {
        return NextResponse.json(
          { success: false, message: 'Pilih rekening Kas/Bank untuk mencatat pembayaran pengadaan bahan.' },
          { status: 400 }
        );
      }
      cashAccount = await prisma.account.findUnique({ where: { id: cashAccountId } });
    }

    // Ambil Akun Utang Usaha (2-1100) jika ada sisa belum lunas
    let utangUsahaAcc = null;
    if (unpaidDec.greaterThan(0)) {
      utangUsahaAcc = await prisma.account.findUnique({ where: { code: '2-1100' } });
      if (!utangUsahaAcc) {
        return NextResponse.json(
          { success: false, message: 'Akun Utang Usaha (2-1100) tidak ditemukan di database.' },
          { status: 500 }
        );
      }
    }

    // 3. Buat Nomor Pembelian & Jurnal Otomatis
    const purchaseCount = await prisma.purchaseInvoice.count();
    const purchaseNumber = generateTransactionNumber('PO', purchaseCount + 1, txDate);
    const journalCount = await prisma.journalEntry.count();
    const journalNumber = generateTransactionNumber('JU', journalCount + 1, txDate);

    // 4. Susun Jurnal Double-Entry
    // Sisi Debit: Persediaan Bahan Kaos / Tinta (1-1310 / 1-1320)
    // Sisi Kredit: Kas/Bank (sebesar paidAmount) dan Utang Usaha (sebesar unpaidDec)
    const defaultPersediaanAcc = await prisma.account.findUnique({ where: { code: '1-1310' } });

    const journalItems = [
      {
        accountId: defaultPersediaanAcc.id,
        debit: totalAmountDec.toString(),
        credit: '0.00',
        memo: `Pengadaan Bahan Sablon [${purchaseNumber}] dari ${supplier.name}`,
      },
    ];

    if (paidDec.greaterThan(0) && cashAccount) {
      journalItems.push({
        accountId: cashAccount.id,
        debit: '0.00',
        credit: paidDec.toString(),
        memo: `Pembayaran bahan via ${cashAccount.name}`,
      });
    }

    if (unpaidDec.greaterThan(0) && utangUsahaAcc) {
      journalItems.push({
        accountId: utangUsahaAcc.id,
        debit: '0.00',
        credit: unpaidDec.toString(),
        memo: `Utang usaha pembelian bahan [${purchaseNumber}] ke ${supplier.name}`,
      });
    }

    // 5. Eksekusi Atomic Transaction Database (Prisma)
    const result = await prisma.$transaction(async (tx) => {
      // A. Posting Jurnal Double-Entry
      const journalEntry = await postJournalEntry(tx, {
        entryNumber: journalNumber,
        date: txDate,
        referenceType: 'PURCHASE',
        referenceId: purchaseNumber,
        description: `Pembelian Bahan Sablon [${purchaseNumber}] dari ${supplier.name} (Status: ${paymentStatus})`,
        items: journalItems,
      });

      // B. Buat Purchase Invoice Header
      const purchaseInvoice = await tx.purchaseInvoice.create({
        data: {
          purchaseNumber,
          date: txDate,
          dueDate: txDueDate,
          supplierId: supplier.id,
          totalAmount: totalAmountDec.toString(),
          paidAmount: paidDec.toString(),
          paymentStatus,
          cashAccountId: cashAccount ? cashAccount.id : null,
          notes: notes?.trim() || null,
          journalEntryId: journalEntry.id,
        },
      });

      // C. Simpan Rincian Item, Mutasi Kartu Stok, dan Perbarui Nilai HPP Rata-Rata
      for (const line of validatedItems) {
        await tx.purchaseInvoiceItem.create({
          data: {
            purchaseInvoiceId: purchaseInvoice.id,
            itemId: line.itemId,
            quantity: line.quantity.toString(),
            unitPrice: line.unitPrice.toString(),
            totalPrice: line.totalPrice.toString(),
          },
        });

        // Catat Kartu Stok (Inventory Transaction)
        await tx.inventoryTransaction.create({
          data: {
            date: txDate,
            itemId: line.itemId,
            type: 'PURCHASE_IN',
            quantity: line.quantity.toString(),
            unitCost: line.unitPrice.toString(),
            totalCost: line.totalPrice.toString(),
            referenceType: 'PURCHASE',
            referenceId: purchaseNumber,
            notes: `Masuk dari faktur pembelian ${purchaseNumber}`,
          },
        });

        // Update Kuantitas Stok & HPP Rata-Rata Bergerak (Moving Average)
        const currentItem = await tx.item.findUnique({ where: { id: line.itemId } });
        if (currentItem) {
          const oldStock = new Decimal(currentItem.currentStock.toString());
          const oldCost = new Decimal(currentItem.costPrice.toString());
          const newStock = oldStock.plus(line.quantity);

          let newAvgCost = line.unitPrice;
          if (newStock.greaterThan(0)) {
            // (oldStock * oldCost + newQty * newPrice) / newStock
            const oldTotalValue = oldStock.times(oldCost);
            const newTotalValue = oldTotalValue.plus(line.totalPrice);
            newAvgCost = newTotalValue.dividedBy(newStock);
          }

          await tx.item.update({
            where: { id: line.itemId },
            data: {
              currentStock: newStock.toString(),
              costPrice: newAvgCost.toFixed(2),
            },
          });
        }
      }

      return { purchaseInvoice, journalEntry };
    });

    return NextResponse.json({
      success: true,
      message: `Faktur Pembelian ${purchaseNumber} berhasil diposting. Stok bahan dan jurnal telah diperbarui.`,
      purchase: result.purchaseInvoice,
      journalEntry: result.journalEntry,
    });
  } catch (error) {
    console.error('Error posting purchase invoice:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memproses pembelian bahan.' },
      { status: 500 }
    );
  }
}
