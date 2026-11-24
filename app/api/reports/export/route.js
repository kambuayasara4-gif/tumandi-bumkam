import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import {
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getProfitSharingCalculation,
} from '@/lib/financialReports';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'income-statement';
    const startDate = searchParams.get('startDate') || `${new Date().getFullYear()}-01-01`;
    const endDate = searchParams.get('endDate') || `${new Date().getFullYear()}-12-31`;
    const asOfDate = searchParams.get('asOfDate') || endDate;
    const year = searchParams.get('year') || new Date().getFullYear();

    const setting = await prisma.setting.findFirst({ where: { id: 1 } });
    const bumkamTitle = setting ? setting.bumkamName : 'BUMKam Tungkuwiri Mandiri';
    const villageTitle = setting ? `${setting.villageName}, ${setting.districtName}, ${setting.regencyName}` : 'Kampung Doyo Lama';

    const wb = XLSX.utils.book_new();
    let filename = `laporan_${type}_${Date.now()}.xlsx`;

    if (type === 'income-statement') {
      const report = await getIncomeStatement(prisma, { startDate, endDate });
      filename = `Laba_Rugi_${startDate}_sd_${endDate}.xlsx`;

      const rows = [
        [bumkamTitle],
        [villageTitle],
        ['LAPORAN LABA RUGI (INCOME STATEMENT) - SAK EMKM'],
        [`Periode: ${startDate} s/d ${endDate}`],
        ['Dicetak pada:', new Date().toLocaleString('id-ID')],
        [],
        ['KODE AKUN', 'NAMA AKUN / KETERANGAN', 'JUMLAH (RP)'],
        ['1. PENDAPATAN USAHA (REVENUE)'],
      ];

      for (const rev of report.revenues) {
        rows.push([rev.code, rev.name, rev.amount]);
      }
      rows.push(['', 'TOTAL PENDAPATAN USAHA', report.totalRevenue]);
      rows.push([]);

      rows.push(['2. BEBAN POKOK PENJUALAN (HPP)']);
      for (const hpp of report.cogsItems) {
        rows.push([hpp.code, hpp.name, hpp.amount]);
      }
      rows.push(['', 'TOTAL BEBAN POKOK PENJUALAN', report.totalHpp]);
      rows.push([]);

      rows.push(['', 'LABA KOTOR (GROSS PROFIT)', report.grossProfit]);
      rows.push([]);

      rows.push(['3. BEBAN OPERASIONAL']);
      for (const exp of report.operatingExpenses) {
        rows.push([exp.code, exp.name, exp.amount]);
      }
      rows.push(['', 'TOTAL BEBAN OPERASIONAL', report.totalOperatingExpenses]);
      rows.push([]);

      rows.push(['', 'LABA OPERASIONAL', report.operatingProfit]);
      rows.push([]);

      if (report.otherRevenues.length > 0 || report.otherExpenses.length > 0) {
        rows.push(['4. PENDAPATAN & (BEBAN) NON-OPERASIONAL']);
        for (const oRev of report.otherRevenues) {
          rows.push([oRev.code, oRev.name, oRev.amount]);
        }
        for (const oExp of report.otherExpenses) {
          rows.push([oExp.code, oExp.name, -oExp.amount]);
        }
        rows.push(['', 'NET PENDAPATAN / (BEBAN) LAIN-LAIN', report.netOther]);
        rows.push([]);
      }

      rows.push(['', 'LABA BERSIH PERIODE BERJALAN', report.netProfit]);
      rows.push(['', 'MARGIN LABA BERSIH (%)', `${report.profitMarginPercent}%`]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 15 }, { wch: 45 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Laba Rugi');

    } else if (type === 'balance-sheet') {
      const report = await getBalanceSheet(prisma, { asOfDate });
      filename = `Neraca_Keuangan_per_${asOfDate}.xlsx`;

      const rows = [
        [bumkamTitle],
        [villageTitle],
        ['LAPORAN POSISI KEUANGAN / NERACA (BALANCE SHEET) - SAK EMKM'],
        [`Posisi Per Tanggal: ${asOfDate}`],
        ['Status Keseimbangan:', report.isBalanced ? 'SEIMBANG (Rp 0 Selisih)' : 'TIDAK SEIMBANG'],
        [],
        ['KODE AKUN', 'KOMPONEN NERACA', 'JUMLAH (RP)'],
        ['A. ASET LANCAR'],
      ];

      rows.push(['', '-- Kas dan Setara Kas --']);
      for (const item of report.assets.currentAssets.cashAndBank) {
        rows.push([item.code, item.name, item.amount]);
      }
      rows.push(['', 'Subtotal Kas & Bank', report.assets.currentAssets.totalCashAndBank]);

      rows.push(['', '-- Piutang Usaha --']);
      for (const item of report.assets.currentAssets.receivables) {
        rows.push([item.code, item.name, item.amount]);
      }
      rows.push(['', 'Subtotal Piutang Usaha', report.assets.currentAssets.totalReceivables]);

      rows.push(['', '-- Persediaan Bahan Sablon & Kaos --']);
      for (const item of report.assets.currentAssets.inventories) {
        rows.push([item.code, item.name, item.amount]);
      }
      rows.push(['', 'Subtotal Persediaan', report.assets.currentAssets.totalInventories]);

      if (report.assets.currentAssets.otherCurrentAssets.length > 0) {
        rows.push(['', '-- Aset Lancar Lainnya --']);
        for (const item of report.assets.currentAssets.otherCurrentAssets) {
          rows.push([item.code, item.name, item.amount]);
        }
      }
      rows.push(['', 'TOTAL ASET LANCAR', report.assets.currentAssets.totalCurrentAssets]);
      rows.push([]);

      rows.push(['B. ASET TETAP']);
      for (const item of report.assets.fixedAssets.items) {
        rows.push([item.code, item.name, item.amount]);
      }
      for (const item of report.assets.fixedAssets.accumulatedDepreciations) {
        rows.push([item.code, item.name, -item.amount]);
      }
      rows.push(['', 'NILAI BUKU BERSIH ASET TETAP', report.assets.fixedAssets.netFixedAssets]);
      rows.push([]);
      rows.push(['', 'TOTAL ASET (AKTIVA)', report.assets.totalAssets]);
      rows.push([]);

      rows.push(['C. KEWAJIBAN / LIABILITAS']);
      for (const item of report.liabilities.currentLiabilities) {
        rows.push([item.code, item.name, item.amount]);
      }
      rows.push(['', 'TOTAL KEWAJIBAN', report.liabilities.totalLiabilities]);
      rows.push([]);

      rows.push(['D. EKUITAS / MODAL']);
      for (const item of report.equity.accounts) {
        rows.push([item.code, item.name, item.amount]);
      }
      rows.push(['', 'Laba Bersih Periode Berjalan', report.equity.currentEarnings]);
      rows.push(['', 'TOTAL EKUITAS', report.equity.totalEquity]);
      rows.push([]);

      rows.push(['', 'TOTAL KEWAJIBAN DAN EKUITAS (PASIVA)', report.totalLiabilitiesAndEquity]);
      rows.push(['', 'SELISIH (BALANCE CHECK)', report.difference]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 15 }, { wch: 45 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Neraca');

    } else if (type === 'cash-flow') {
      const report = await getCashFlow(prisma, { startDate, endDate });
      filename = `Arus_Kas_${startDate}_sd_${endDate}.xlsx`;

      const rows = [
        [bumkamTitle],
        [villageTitle],
        ['LAPORAN ARUS KAS (CASH FLOW STATEMENT) - SAK EMKM'],
        [`Periode: ${startDate} s/d ${endDate}`],
        [],
        ['URAIAN ARUS KAS', 'NILAI (RP)'],
        ['A. ARUS KAS DARI AKTIVITAS OPERASIONAL'],
        ['Arus Kas Masuk Operasional', report.operating.inflow],
        ['Arus Kas Keluar Operasional', -report.operating.outflow],
        ['ARUS KAS BERSIH DARI AKTIVITAS OPERASIONAL', report.operating.net],
        [],
        ['B. ARUS KAS DARI AKTIVITAS INVESTASI'],
        ['Arus Kas Masuk Investasi', report.investing.inflow],
        ['Arus Kas Keluar Investasi (Perolehan Aset)', -report.investing.outflow],
        ['ARUS KAS BERSIH DARI AKTIVITAS INVESTASI', report.investing.net],
        [],
        ['C. ARUS KAS DARI AKTIVITAS PENDANAAN'],
        ['Arus Kas Masuk Pendanaan (Modal)', report.financing.inflow],
        ['Arus Kas Keluar Pendanaan (Bagi Hasil)', -report.financing.outflow],
        ['ARUS KAS BERSIH DARI AKTIVITAS PENDANAAN', report.financing.net],
        [],
        ['KENAIKAN / (PENURUNAN) KAS BERSIH', report.netCashChange],
        ['SALDO AWAL KAS DAN BANK', report.beginningBalance],
        ['SALDO AKHIR KAS DAN BANK', report.endingBalance],
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 50 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Arus Kas');

    } else if (type === 'profit-sharing') {
      const report = await getProfitSharingCalculation(prisma, { year });
      filename = `Alokasi_PADKam_Tahun_${year}.xlsx`;

      const rows = [
        [bumkamTitle],
        [villageTitle],
        [`LAPORAN ALOKASI PEMBAGIAN HASIL USAHA TAHUN BUKU ${year}`],
        ['Dasar: AD/ART BUMKam & Musyawarah Kampung Doyo Lama'],
        [],
        ['KOMPONEN', 'PERSENTASE (%)', 'NOMINAL ALOKASI (RP)'],
        ['Total Laba Bersih Tahun Terkait', '', report.netProfit],
        [],
        ['1. PADKam (Pendapatan Asli Desa/Kampung)', `${report.percentages.padkamPercent}%`, report.allocations.padkamAmount],
        ['2. Cadangan Modal BUMKam', `${report.percentages.reservePercent}%`, report.allocations.reserveAmount],
        ['3. Jasa Pengurus & Karyawan Sablon', `${report.percentages.bonusPercent}%`, report.allocations.bonusAmount],
        ['4. Dana Sosial & Pendidikan Kampung', `${report.percentages.socialPercent}%`, report.allocations.socialAmount],
        [],
        ['TOTAL ALOKASI (HARUS 100%)', `${report.percentages.totalPercent}%`, report.allocations.totalAllocated],
        ['Status Pembukuan:', report.isAlreadyPosted ? 'SUDAH DIJURNAL' : 'BELUM DIJURNAL'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 45 }, { wch: 18 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Alokasi PADKam');
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting excel:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengekspor laporan: ' + error.message },
      { status: 500 }
    );
  }
}
