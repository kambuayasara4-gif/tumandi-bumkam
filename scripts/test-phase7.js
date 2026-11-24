// scripts/test-phase7.js
// Pengujian Otomatis Fase 7: Modul Laporan Keuangan Standar SAK EMKM & Pembagian Hasil Usaha

const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('decimal.js');
const {
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getProfitSharingCalculation,
} = require('../lib/financialReports');
const { postJournalEntry, generateTransactionNumber } = require('../lib/accounting');

const prisma = new PrismaClient();

async function runPhase7Tests() {
  console.log('🧪 ========================================================');
  console.log('🧪 MEMULAI PENGUJIAN OTOMATIS FASE 7: LAPORAN KEUANGAN SAK EMKM');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // 1. UJI LAPORAN LABA RUGI (INCOME STATEMENT)
    // ----------------------------------------------------
    console.log('--- 1. UJI LAPORAN LABA RUGI (INCOME STATEMENT) ---');
    const incomeStmt = await getIncomeStatement(prisma, {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });

    assert(incomeStmt !== null && typeof incomeStmt === 'object', 'Laporan Laba Rugi berhasil dihitung');
    assert(incomeStmt.totalRevenue >= 0, `Total Pendapatan valid (Rp ${incomeStmt.totalRevenue.toLocaleString('id-ID')})`);
    assert(incomeStmt.totalHpp >= 0, `Total Beban Pokok (HPP) valid (Rp ${incomeStmt.totalHpp.toLocaleString('id-ID')})`);
    
    // Verifikasi rumus: Laba Kotor = Pendapatan - HPP
    const expectedGross = incomeStmt.totalRevenue - incomeStmt.totalHpp;
    assert(
      Math.abs(incomeStmt.grossProfit - expectedGross) < 0.01,
      `Kalkulasi Laba Kotor tepat: Pendapatan - HPP = Rp ${incomeStmt.grossProfit.toLocaleString('id-ID')}`
    );

    // Verifikasi rumus: Laba Bersih = Laba Operasional + Net Non-Operasional
    const expectedNet = (incomeStmt.grossProfit - incomeStmt.totalOperatingExpenses) + incomeStmt.netOther;
    assert(
      Math.abs(incomeStmt.netProfit - expectedNet) < 0.01,
      `Kalkulasi Laba Bersih tepat: Rp ${incomeStmt.netProfit.toLocaleString('id-ID')}`
    );

    // ----------------------------------------------------
    // 2. UJI LAPORAN POSISI KEUANGAN / NERACA (BALANCE SHEET)
    // ----------------------------------------------------
    console.log('\n--- 2. UJI POSISI KEUANGAN / NERACA (BALANCE SHEET) ---');
    const balanceSheet = await getBalanceSheet(prisma, {
      asOfDate: '2026-12-31',
    });

    assert(balanceSheet !== null, 'Neraca Keuangan berhasil digenerate');
    assert(balanceSheet.assets.totalAssets > 0, `Total Aset terhitung valid: Rp ${balanceSheet.assets.totalAssets.toLocaleString('id-ID')}`);
    assert(
      balanceSheet.liabilities.totalLiabilities >= 0,
      `Total Kewajiban terhitung: Rp ${balanceSheet.liabilities.totalLiabilities.toLocaleString('id-ID')}`
    );
    assert(
      balanceSheet.equity.totalEquity !== 0,
      `Total Ekuitas terhitung: Rp ${balanceSheet.equity.totalEquity.toLocaleString('id-ID')}`
    );

    // UJI KESEIMBANGAN MUTLAK NERACA: ASET == KEWAJIBAN + EKUITAS
    console.log(`   * Total Aset: Rp ${balanceSheet.assets.totalAssets.toLocaleString('id-ID')}`);
    console.log(`   * Total Kewajiban: Rp ${balanceSheet.liabilities.totalLiabilities.toLocaleString('id-ID')}`);
    console.log(`   * Total Ekuitas: Rp ${balanceSheet.equity.totalEquity.toLocaleString('id-ID')}`);
    console.log(`   * Total Pasiva (Kewajiban + Ekuitas): Rp ${balanceSheet.totalLiabilitiesAndEquity.toLocaleString('id-ID')}`);
    console.log(`   * Selisih: Rp ${balanceSheet.difference.toFixed(2)}`);

    assert(
      balanceSheet.isBalanced === true,
      'NERACA SEIMBANG MUTLAK: Total Aset = Total Kewajiban + Total Ekuitas (Selisih = 0)'
    );

    // ----------------------------------------------------
    // 3. UJI LAPORAN ARUS KAS (CASH FLOW STATEMENT)
    // ----------------------------------------------------
    console.log('\n--- 3. UJI LAPORAN ARUS KAS (CASH FLOW STATEMENT) ---');
    const cashFlow = await getCashFlow(prisma, {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });

    assert(cashFlow !== null, 'Laporan Arus Kas berhasil dihitung');
    const expectedEndCash = cashFlow.beginningBalance + cashFlow.netCashChange;
    assert(
      Math.abs(cashFlow.endingBalance - expectedEndCash) < 0.01,
      `Rekonsiliasi Saldo Kas tepat: Awal (Rp ${cashFlow.beginningBalance.toLocaleString('id-ID')}) + Perubahan (Rp ${cashFlow.netCashChange.toLocaleString('id-ID')}) = Akhir (Rp ${cashFlow.endingBalance.toLocaleString('id-ID')})`
    );

    // Verifikasi Saldo Akhir Kas pada Arus Kas sama dengan Kas & Bank di Neraca
    const bsCashTotal = balanceSheet.assets.currentAssets.totalCashAndBank;
    assert(
      Math.abs(cashFlow.endingBalance - bsCashTotal) < 0.01,
      `Integritas Data Lintas Laporan: Saldo Akhir Arus Kas (Rp ${cashFlow.endingBalance.toLocaleString('id-ID')}) sama persis dengan Kas & Bank di Neraca (Rp ${bsCashTotal.toLocaleString('id-ID')})`
    );

    // ----------------------------------------------------
    // 4. UJI PERHITUNGAN PEMBAGIAN HASIL USAHA (PADKAM)
    // ----------------------------------------------------
    console.log('\n--- 4. UJI PERHITUNGAN ALOKASI HASIL USAHA (PADKAM) ---');
    const profitSharing = await getProfitSharingCalculation(prisma, { year: 2026 });

    assert(profitSharing !== null, 'Perhitungan Alokasi PADKam berhasil dieksekusi');
    assert(
      profitSharing.percentages.totalPercent === 100,
      `Total persentase alokasi tepat 100% (${profitSharing.percentages.padkamPercent}% PADKam, ${profitSharing.percentages.reservePercent}% Cadangan, ${profitSharing.percentages.bonusPercent}% Pengurus, ${profitSharing.percentages.socialPercent}% Sosial)`
    );

    if (profitSharing.netProfit > 0) {
      assert(
        profitSharing.allocations.padkamAmount > 0,
        `Alokasi PADKam Kampung Doyo Lama: Rp ${profitSharing.allocations.padkamAmount.toLocaleString('id-ID')}`
      );
      assert(
        profitSharing.allocations.reserveAmount > 0,
        `Alokasi Cadangan Modal BUMKam: Rp ${profitSharing.allocations.reserveAmount.toLocaleString('id-ID')}`
      );

      const totalAllocated = profitSharing.allocations.totalAllocated;
      assert(
        Math.abs(totalAllocated - profitSharing.netProfit) <= 1,
        `Total Dana yang Dialokasikan (Rp ${totalAllocated.toLocaleString('id-ID')}) cocok dengan Laba Bersih (Rp ${profitSharing.netProfit.toLocaleString('id-ID')})`
      );
    } else {
      console.log('   * Info: Laba Bersih belum positif pada periode ini, alokasi bernilai 0.');
    }

  } catch (error) {
    console.error('Terjadi error selama pengujian:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n========================================================');
  console.log(`📊 HASIL PENGUJIAN FASE 7: ${passed} BERHASIL, ${failed} GAGAL`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7Tests();
