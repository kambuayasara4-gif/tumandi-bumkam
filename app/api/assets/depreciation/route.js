import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTransactionNumber, postJournalEntry } from '@/lib/accounting';
import { Decimal } from 'decimal.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { periodMonth, periodYear } = body;

    const month = parseInt(periodMonth, 10);
    const year = parseInt(periodYear, 10);

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, message: 'Bulan (1-12) dan Tahun periode penyusutan wajib diisi.' },
        { status: 400 }
      );
    }

    // Tanggal akhir bulan periode penyusutan
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // Ambil seluruh aset aktif yang tanggal perolehannya <= akhir bulan terkait
    const activeAssets = await prisma.fixedAsset.findMany({
      where: {
        status: 'ACTIVE',
        acquisitionDate: { lte: endOfMonth },
      },
      include: {
        assetAccount: true,
        depreciationAccount: true,
        expenseAccount: true,
        depreciations: {
          where: {
            periodMonth: month,
            periodYear: year,
          },
        },
      },
    });

    const eligibleAssets = activeAssets.filter((a) => a.depreciations.length === 0);

    if (eligibleAssets.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Tidak ada aset yang perlu disusutkan untuk periode ${month}/${year}. (Semua aset sudah disusutkan atau belum aktif).`,
        processedCount: 0,
        totalAmount: 0,
      });
    }

    let processedCount = 0;
    let totalDepreciationDec = new Decimal(0);

    for (const asset of eligibleAssets) {
      const cost = new Decimal(asset.acquisitionCost.toString());
      const salvage = new Decimal(asset.salvageValue.toString());
      const accumulated = new Decimal(asset.accumulatedDepreciation.toString());
      const monthly = new Decimal(asset.monthlyDepreciation.toString());

      const maxDepreciable = Decimal.max(0, cost.minus(salvage));
      const remaining = Decimal.max(0, maxDepreciable.minus(accumulated));

      if (!remaining.greaterThan(0)) {
        // Aset sudah habis disusutkan
        await prisma.fixedAsset.update({
          where: { id: asset.id },
          data: { status: 'FULLY_DEPRECIATED' },
        });
        continue;
      }

      // Nominal penyusutan bulan ini
      const actualAmount = Decimal.min(monthly, remaining);
      totalDepreciationDec = totalDepreciationDec.plus(actualAmount);

      // Posting Jurnal Penyusutan Otomatis: Debit Beban Penyusutan, Kredit Akumulasi Penyusutan
      const jCount = await prisma.journalEntry.count();
      const jNumber = generateTransactionNumber('JU', jCount + 1, endOfMonth);

      const journal = await postJournalEntry(prisma, {
        entryNumber: jNumber,
        date: endOfMonth,
        referenceType: 'DEPRECIATION',
        referenceId: `${asset.code}-${year}-${String(month).padStart(2, '0')}`,
        description: `Penyusutan Bulanan Aset [${asset.code}]: ${asset.name} Periode ${month}/${year}`,
        items: [
          {
            accountId: asset.expenseAccountId,
            debit: actualAmount.toString(),
            credit: '0.00',
            memo: `Beban penyusutan ${asset.name}`,
          },
          {
            accountId: asset.depreciationAccountId,
            debit: '0.00',
            credit: actualAmount.toString(),
            memo: `Akumulasi penyusutan ${asset.name}`,
          },
        ],
      });

      // Catat riwayat depresiasi
      await prisma.assetDepreciation.create({
        data: {
          fixedAssetId: asset.id,
          periodMonth: month,
          periodYear: year,
          amount: actualAmount.toString(),
          journalEntryId: journal.id,
        },
      });

      // Update akumulasi penyusutan aset
      const newAccumulated = accumulated.plus(actualAmount);
      const newStatus = newAccumulated.greaterThanOrEqualTo(maxDepreciable)
        ? 'FULLY_DEPRECIATED'
        : 'ACTIVE';

      await prisma.fixedAsset.update({
        where: { id: asset.id },
        data: {
          accumulatedDepreciation: newAccumulated.toString(),
          status: newStatus,
        },
      });

      processedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Penyusutan periode ${month}/${year} berhasil dijalankan untuk ${processedCount} aset. Total beban penyusutan: Rp ${totalDepreciationDec.toFixed(2)}.`,
      processedCount,
      totalAmount: totalDepreciationDec.toString(),
    });
  } catch (error) {
    console.error('Error run depreciation:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menjalankan penyusutan aset otomatis.' },
      { status: 500 }
    );
  }
}
