import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProfitSharingCalculation } from '@/lib/financialReports';
import { postJournalEntry, generateTransactionNumber } from '@/lib/accounting';
import { Decimal } from 'decimal.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear();

    const calculation = await getProfitSharingCalculation(prisma, { year });

    return NextResponse.json({
      success: true,
      data: calculation,
    });
  } catch (error) {
    console.error('Error calculating profit sharing:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghitung alokasi hasil usaha: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { year, notes } = body;

    if (!year) {
      return NextResponse.json(
        { success: false, message: 'Tahun buku wajib ditentukan.' },
        { status: 400 }
      );
    }

    const calculation = await getProfitSharingCalculation(prisma, { year });

    if (calculation.netProfit <= 0) {
      return NextResponse.json(
        { success: false, message: 'Laba Bersih tahun buku ini belum positif atau bernilai Rp 0, tidak ada hasil usaha untuk dialokasikan.' },
        { status: 400 }
      );
    }

    // Cek apakah sudah pernah dibukukan
    const existing = await prisma.profitSharingHistory.findUnique({
      where: { fiscalYear: parseInt(year, 10) },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Pembagian hasil usaha untuk tahun buku ${year} sudah pernah dibukukan sebelumnya.` },
        { status: 400 }
      );
    }

    // Ambil akun-akun yang terlibat untuk Jurnal Penutupan Alokasi Laba
    const accLabaBerjalan = await prisma.account.findFirst({
      where: { code: '3-4000' },
    });
    const accUtangPadkam = await prisma.account.findFirst({
      where: { code: '2-1500' },
    });
    const accCadanganModal = await prisma.account.findFirst({
      where: { code: '3-5000' },
    });
    const accUtangPengurus = await prisma.account.findFirst({
      where: { code: '2-1600' },
    });
    const accUtangSosial = await prisma.account.findFirst({
      where: { code: '2-1300' },
    });

    if (!accLabaBerjalan || !accUtangPadkam || !accCadanganModal || !accUtangPengurus || !accUtangSosial) {
      return NextResponse.json(
        {
          success: false,
          message: 'Bagan akun alokasi laba (3-4000, 2-1500, 3-5000, 2-1600, 2-1300) belum lengkap di master akun.',
        },
        { status: 400 }
      );
    }

    const { padkamAmount, reserveAmount, bonusAmount, socialAmount, totalAllocated } = calculation.allocations;

    // Nomor Jurnal Otomatis
    const countJournals = await prisma.journalEntry.count();
    const entryNumber = generateTransactionNumber('JU', countJournals + 1, new Date(`${year}-12-31`));

    // Jurnal Double-Entry Alokasi Laba:
    // Debit: Saldo Laba Periode Berjalan (3-4000)
    // Kredit: Utang Bagi Hasil PADKam Kampung Doyo Lama (2-1500)
    // Kredit: Cadangan Umum BUMKam (3-5000)
    // Kredit: Utang Jasa Pengurus & Karyawan (2-1600)
    // Kredit: Dana Sosial Kampung (2-1300)
    const journalItems = [
      {
        accountId: accLabaBerjalan.id,
        debit: totalAllocated,
        credit: 0,
        memo: `Alokasi Hasil Usaha (PADKam & Cadangan) Tahun ${year}`,
      },
      {
        accountId: accUtangPadkam.id,
        debit: 0,
        credit: padkamAmount,
        memo: `Alokasi PADKam Kampung Doyo Lama (${calculation.percentages.padkamPercent}%)`,
      },
      {
        accountId: accCadanganModal.id,
        debit: 0,
        credit: reserveAmount,
        memo: `Alokasi Cadangan Modal BUMKam (${calculation.percentages.reservePercent}%)`,
      },
      {
        accountId: accUtangPengurus.id,
        debit: 0,
        credit: bonusAmount,
        memo: `Alokasi Jasa Pengurus & Karyawan (${calculation.percentages.bonusPercent}%)`,
      },
      {
        accountId: accUtangSosial.id,
        debit: 0,
        credit: socialAmount,
        memo: `Alokasi Dana Sosial & Pendidikan Kampung (${calculation.percentages.socialPercent}%)`,
      },
    ];

    const journal = await postJournalEntry(prisma, {
      entryNumber,
      date: new Date(`${year}-12-31`),
      referenceType: 'PROFIT_SHARING',
      referenceId: String(year),
      description: `Pembukuan Alokasi Pembagian Hasil Usaha BUMKam Tungkuwiri Mandiri Tahun Buku ${year}`,
      items: journalItems,
    });

    // Simpan ke riwayat pembagian hasil usaha
    const record = await prisma.profitSharingHistory.create({
      data: {
        fiscalYear: parseInt(year, 10),
        netProfit: calculation.netProfit.toString(),
        padkamPercent: calculation.percentages.padkamPercent.toString(),
        padkamAmount: padkamAmount.toString(),
        reserveFundPercent: calculation.percentages.reservePercent.toString(),
        reserveFundAmount: reserveAmount.toString(),
        managementBonusPercent: calculation.percentages.bonusPercent.toString(),
        managementBonusAmount: bonusAmount.toString(),
        socialFundPercent: calculation.percentages.socialPercent.toString(),
        socialFundAmount: socialAmount.toString(),
        journalEntryId: journal.id,
        notes: notes || `Dibukukan otomatis melalui sistem TUMANDI pada tanggal ${new Date().toLocaleDateString('id-ID')}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Hasil usaha tahun ${year} berhasil dialokasikan dan dijurnal dengan nomor ${entryNumber}.`,
      data: record,
    });
  } catch (error) {
    console.error('Error posting profit sharing:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal membukukan pembagian hasil usaha: ' + error.message },
      { status: 500 }
    );
  }
}
