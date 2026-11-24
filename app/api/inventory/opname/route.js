import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTransactionNumber, postJournalEntry } from '@/lib/accounting';
import { Decimal } from 'decimal.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { itemId, physicalStock, date, notes } = body;

    if (!itemId || physicalStock === undefined || physicalStock === '') {
      return NextResponse.json(
        { success: false, message: 'Item barang dan jumlah stok fisik wajib diisi.' },
        { status: 400 }
      );
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { category: true },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Item barang tidak ditemukan.' },
        { status: 404 }
      );
    }

    const txDate = date ? new Date(date) : new Date();
    const systemStock = new Decimal(item.currentStock.toString());
    const realStock = new Decimal(physicalStock);
    const diffQty = realStock.minus(systemStock);
    const costPrice = new Decimal(item.costPrice.toString());
    const diffAmount = diffQty.abs().times(costPrice);

    // Jika tidak ada selisih stok
    if (diffQty.equals(0)) {
      return NextResponse.json({
        success: true,
        message: 'Stok fisik cocok dengan stok sistem. Tidak ada jurnal penyesuaian yang diperlukan.',
        difference: 0,
      });
    }

    const opnameCount = await prisma.inventoryTransaction.count({ where: { type: 'OPNAME_ADJUSTMENT' } });
    const opnameRef = generateTransactionNumber('SO', opnameCount + 1, txDate);
    const journalCount = await prisma.journalEntry.count();
    const journalNumber = generateTransactionNumber('JU', journalCount + 1, txDate);

    // Ambil akun-akun terkait
    const persediaanAcc = await prisma.account.findUnique({ where: { code: '1-1310' } });
    const bebanSelisihAcc = await prisma.account.findUnique({ where: { code: '6-9000' } }); // Beban Operasional Lainnya
    const pendapatanSelisihAcc = await prisma.account.findUnique({ where: { code: '4-9000' } }); // Pendapatan Lainnya

    let journalItems = [];
    let journalDesc = '';

    if (diffQty.isNegative()) {
      // Selisih Kurang (Barang Rusak/Hilang): Debit Beban, Kredit Persediaan
      journalDesc = `Penyesuaian Stok Opname Kurang [${opnameRef}]: ${item.name} (-${diffQty.abs()} ${item.unit}) karena ${notes || 'kerusakan/selisih'}`;
      journalItems = [
        {
          accountId: bebanSelisihAcc.id,
          debit: diffAmount.toString(),
          credit: '0.00',
          memo: `Beban selisih stok opname ${item.name}`,
        },
        {
          accountId: persediaanAcc.id,
          debit: '0.00',
          credit: diffAmount.toString(),
          memo: `Pengurangan nilai persediaan ${item.name}`,
        },
      ];
    } else {
      // Selisih Lebih (Ditemukan barang ekstra): Debit Persediaan, Kredit Pendapatan Lain-lain
      journalDesc = `Penyesuaian Stok Opname Lebih [${opnameRef}]: ${item.name} (+${diffQty} ${item.unit})`;
      journalItems = [
        {
          accountId: persediaanAcc.id,
          debit: diffAmount.toString(),
          credit: '0.00',
          memo: `Penambahan persediaan hasil opname ${item.name}`,
        },
        {
          accountId: pendapatanSelisihAcc.id,
          debit: '0.00',
          credit: diffAmount.toString(),
          memo: `Pendapatan penyesuaian stok lebih ${item.name}`,
        },
      ];
    }

    // Eksekusi transaksi database
    const result = await prisma.$transaction(async (tx) => {
      // 1. Posting Jurnal
      const journal = await postJournalEntry(tx, {
        entryNumber: journalNumber,
        date: txDate,
        referenceType: 'ADJUSTMENT',
        referenceId: opnameRef,
        description: journalDesc,
        items: journalItems,
      });

      // 2. Catat Mutasi Kartu Stok
      await tx.inventoryTransaction.create({
        data: {
          date: txDate,
          itemId: item.id,
          type: 'OPNAME_ADJUSTMENT',
          quantity: diffQty.toString(),
          unitCost: costPrice.toString(),
          totalCost: diffAmount.toString(),
          referenceType: 'OPNAME',
          referenceId: opnameRef,
          notes: notes?.trim() || `Penyesuaian fisik: ${systemStock} -> ${realStock} ${item.unit}`,
        },
      });

      // 3. Update Stok Fisik Item
      const updatedItem = await tx.item.update({
        where: { id: item.id },
        data: { currentStock: realStock.toString() },
      });

      return { journal, updatedItem, opnameRef };
    });

    return NextResponse.json({
      success: true,
      message: `Stock Opname berhasil diproses. Stok ${item.name} disesuaikan menjadi ${realStock} ${item.unit} dengan Jurnal ${journalNumber}.`,
      item: result.updatedItem,
      journal: result.journal,
    });
  } catch (error) {
    console.error('Error stock opname:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memproses stock opname.' },
      { status: 500 }
    );
  }
}
