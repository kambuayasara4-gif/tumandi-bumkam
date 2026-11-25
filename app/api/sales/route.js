import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTransactionNumber, postJournalEntry } from '@/lib/accounting';
import { Decimal } from 'decimal.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const paymentStatus = searchParams.get('paymentStatus');

    const where = {};
    if (customerId && customerId !== 'ALL') {
      where.customerId = customerId;
    }
    if (paymentStatus && paymentStatus !== 'ALL') {
      where.paymentStatus = paymentStatus;
    }

    const sales = await prisma.salesInvoice.findMany({
      where,
      include: {
        customer: true,
        cashAccount: true,
        journalEntry: true,
        items: {
          include: { item: { include: { category: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Error get sales:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat daftar pesanan penjualan.' },
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
      customerId,
      items,
      discountAmount,
      cashAccountId,
      paidAmount,
      notes,
    } = body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Pelanggan dan minimal 1 rincian pesanan sablon wajib diisi.' },
        { status: 400 }
      );
    }

    const customer = await prisma.contact.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Data pelanggan tidak ditemukan di database.' },
        { status: 404 }
      );
    }

    const txDate = date ? new Date(date) : new Date();
    const txDueDate = dueDate ? new Date(dueDate) : null;

    // 1. Validasi Tiap Baris Pesanan, Hitung Subtotal, dan HPP
    let subtotalDec = new Decimal(0);
    let totalHppDec = new Decimal(0);
    const validatedItems = [];

    for (const line of items) {
      const qDec = new Decimal(line.quantity || 0);
      const pDec = new Decimal(line.unitPrice || 0);

      if (!qDec.greaterThan(0)) {
        return NextResponse.json(
          { success: false, message: 'Jumlah kuantitas pesanan harus lebih dari nol.' },
          { status: 400 }
        );
      }

      const itemRecord = await prisma.item.findUnique({ where: { id: line.itemId } });
      if (!itemRecord) {
        return NextResponse.json(
          { success: false, message: 'Item pesanan tidak ditemukan di database.' },
          { status: 404 }
        );
      }

      const lineTotal = qDec.times(pDec);
      subtotalDec = subtotalDec.plus(lineTotal);

      // Hitung HPP untuk barang fisik yang dipotong stoknya
      const costDec = new Decimal(itemRecord.costPrice.toString());
      if (itemRecord.type !== 'SERVICE') {
        totalHppDec = totalHppDec.plus(qDec.times(costDec));
      }

      validatedItems.push({
        itemId: itemRecord.id,
        itemType: itemRecord.type,
        itemName: itemRecord.name,
        unit: itemRecord.unit,
        description: line.description || null,
        quantity: qDec,
        unitPrice: pDec,
        costPrice: costDec,
        totalPrice: lineTotal,
      });
    }

    const discountDec = new Decimal(discountAmount || 0);
    const grandTotalDec = Decimal.max(0, subtotalDec.minus(discountDec));

    // 2. Tentukan Status Pembayaran (Lunas, DP / Sebagian, Piutang)
    const paidDec = new Decimal(paidAmount || 0);
    let paymentStatus = 'UNPAID';
    if (paidDec.greaterThanOrEqualTo(grandTotalDec)) {
      paymentStatus = 'PAID';
    } else if (paidDec.greaterThan(0)) {
      paymentStatus = 'PARTIAL';
    }

    const unpaidDec = grandTotalDec.minus(paidDec);

    // Ambil Akun Kas/Bank jika ada penerimaan uang tunai / transfer DP
    let cashAccount = null;
    if (paidDec.greaterThan(0)) {
      if (!cashAccountId) {
        return NextResponse.json(
          { success: false, message: 'Pilih rekening Kas/Bank penampung penerimaan pembayaran pesanan.' },
          { status: 400 }
        );
      }
      cashAccount = await prisma.account.findUnique({ where: { id: cashAccountId } });
    }

    // Ambil Akun Piutang Usaha (1-1200) jika ada sisa belum lunas
    let piutangAcc = null;
    if (unpaidDec.greaterThan(0)) {
      piutangAcc = await prisma.account.findUnique({ where: { code: '1-1200' } });
      if (!piutangAcc) {
        return NextResponse.json(
          { success: false, message: 'Akun Piutang Usaha Pelanggan (1-1200) tidak ditemukan.' },
          { status: 500 }
        );
      }
    }

    // Akun Pendapatan Sablon Kustom (4-2000)
    const pendapatanAcc = await prisma.account.findUnique({ where: { code: '4-2000' } });
    // Akun HPP (5-1000) dan Persediaan Bahan (1-1310)
    const hppAcc = await prisma.account.findUnique({ where: { code: '5-1000' } });
    const persediaanAcc = await prisma.account.findUnique({ where: { code: '1-1310' } });

    // 3. Buat Nomor Faktur & Nomor Jurnal Otomatis
    const salesCount = await prisma.salesInvoice.count();
    const invoiceNumber = generateTransactionNumber('INV', salesCount + 1, txDate);
    const journalCount = await prisma.journalEntry.count();
    const journalNumber = generateTransactionNumber('JU', journalCount + 1, txDate);

    // 4. Susun Jurnal Penjualan Double-Entry
    // Sisi Kredit: Pendapatan Jasa Sablon (sebesar grandTotalDec)
    // Sisi Debit: Kas/Bank (sebesar paidDec) dan Piutang Usaha (sebesar unpaidDec)
    const journalItems = [];

    if (paidDec.greaterThan(0) && cashAccount) {
      journalItems.push({
        accountId: cashAccount.id,
        debit: paidDec.toString(),
        credit: '0.00',
        memo: `Penerimaan bayar/DP via ${cashAccount.name}`,
      });
    }

    if (unpaidDec.greaterThan(0) && piutangAcc) {
      journalItems.push({
        accountId: piutangAcc.id,
        debit: unpaidDec.toString(),
        credit: '0.00',
        memo: `Piutang pesanan sablon [${invoiceNumber}] dari ${customer.name}`,
      });
    }

    journalItems.push({
      accountId: pendapatanAcc.id,
      debit: '0.00',
      credit: grandTotalDec.toString(),
      memo: `Pendapatan pesanan sablon [${invoiceNumber}] untuk ${customer.name}`,
    });

    // 5. Eksekusi Posting Penjualan
    // A. Posting Jurnal Penjualan
    const journalEntry = await postJournalEntry(prisma, {
      entryNumber: journalNumber,
      date: txDate,
      referenceType: 'SALES',
      referenceId: invoiceNumber,
      description: `Penjualan & Pesanan Sablon [${invoiceNumber}] untuk ${customer.name} (Status: ${paymentStatus})`,
      items: journalItems,
    });

    // B. Buat Faktur Penjualan
    const salesInvoice = await prisma.salesInvoice.create({
      data: {
        invoiceNumber,
        date: txDate,
        dueDate: txDueDate,
        customerId: customer.id,
        subtotal: subtotalDec.toString(),
        discountAmount: discountDec.toString(),
        grandTotal: grandTotalDec.toString(),
        paidAmount: paidDec.toString(),
        paymentStatus,
        cashAccountId: cashAccount ? cashAccount.id : null,
        notes: notes?.trim() || null,
        journalEntryId: journalEntry.id,
      },
    });

    // C. Simpan Rincian Item, Potong Stok Bahan Fisik, dan Catat Kartu Stok
    for (const line of validatedItems) {
      await prisma.salesInvoiceItem.create({
        data: {
          salesInvoiceId: salesInvoice.id,
          itemId: line.itemId,
          description: line.description,
          quantity: line.quantity.toString(),
          unitPrice: line.unitPrice.toString(),
          costPrice: line.costPrice.toString(),
          totalPrice: line.totalPrice.toString(),
        },
      });

      // Jika bukan jasa murni (memakai bahan kaos polos/kemasan fisik), potong stok
      if (line.itemType !== 'SERVICE') {
        await prisma.inventoryTransaction.create({
          data: {
            date: txDate,
            itemId: line.itemId,
            type: 'SALES_OUT',
            quantity: line.quantity.negated().toString(), // Kuantitas keluar (negatif)
            unitCost: line.costPrice.toString(),
            totalCost: line.quantity.times(line.costPrice).toString(),
            referenceType: 'SALES',
            referenceId: invoiceNumber,
            notes: `Keluar untuk pesanan sablon ${invoiceNumber} (${customer.name})`,
          },
        });

        // Kurangi stok di master item
        const itRecord = await prisma.item.findUnique({ where: { id: line.itemId } });
        if (itRecord) {
          const oldStock = new Decimal(itRecord.currentStock.toString());
          const newStock = oldStock.minus(line.quantity);
          await prisma.item.update({
            where: { id: line.itemId },
            data: { currentStock: newStock.toString() },
          });
        }
      }
    }

    // D. Otomasi Pengakuan HPP (Harga Pokok Penjualan) jika ada pemakaian bahan fisik
    if (totalHppDec.greaterThan(0)) {
      const hppJournalCount = await prisma.journalEntry.count();
      const hppJournalNumber = generateTransactionNumber('JU', hppJournalCount + 1, txDate);

      await postJournalEntry(prisma, {
        entryNumber: hppJournalNumber,
        date: txDate,
        referenceType: 'SALES',
        referenceId: invoiceNumber,
        description: `Pengakuan Beban Pokok (HPP) Bahan Sablon untuk Faktur [${invoiceNumber}]`,
        items: [
          {
            accountId: hppAcc.id,
            debit: totalHppDec.toString(),
            credit: '0.00',
            memo: `Beban pemakaian bahan kaos [${invoiceNumber}]`,
          },
          {
            accountId: persediaanAcc.id,
            debit: '0.00',
            credit: totalHppDec.toString(),
            memo: `Pengurangan persediaan bahan kaos [${invoiceNumber}]`,
          },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      message: `Faktur Penjualan ${invoiceNumber} berhasil diposting. Jurnal pendapatan, pemotongan stok bahan, dan HPP telah dicatat otomatis.`,
      sales: salesInvoice,
      journalEntry: journalEntry,
    });
  } catch (error) {
    console.error('Error posting sales invoice:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memproses pesanan penjualan.' },
      { status: 500 }
    );
  }
}
