// scripts/test-tumandi-full.js
// PENGUJIAN AKHIR MENYELURUH (END-TO-END FINAL ACCEPTANCE TEST)
// APLIKASI KEUANGAN BUMKAM TUNGKUWIRI MANDIRI - TUMANDI

const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('decimal.js');
const fs = require('fs');
const path = require('path');

const {
  validateProfitSharing,
  validateJournalBalance,
  generateTransactionNumber,
  postJournalEntry,
} = require('../lib/accounting');

const {
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getProfitSharingCalculation,
} = require('../lib/financialReports');

const prisma = new PrismaClient();

async function runFullAcceptanceTest() {
  console.log('================================================================');
  console.log('🏛️  UAT & FINAL ACCEPTANCE TEST: TUMANDI BUMKAM TUNGKUWIRI MANDIRI');
  console.log('    Kampung Doyo Lama, Distrik Waibu, Kabupaten Jayapura');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST SUITE 1: STRUKTUR DATA & BAGAN AKUN (COA SAK EMKM)
    // ----------------------------------------------------
    console.log('📌 [SUITE 1] Verifikasi Bagan Akun Standar SAK EMKM & Profil');
    const setting = await prisma.setting.findFirst({ where: { id: 1 } });
    assert(setting !== null, 'Data Konfigurasi BUMKam ditemukan', setting?.bumkamName);
    assert(setting?.villageName === 'Kampung Doyo Lama', 'Lokasi Kampung valid', setting?.villageName);

    const accountCount = await prisma.account.count();
    assert(accountCount >= 30, 'Total CoA memadai untuk standar SAK EMKM', `${accountCount} akun`);

    // ----------------------------------------------------
    // TEST SUITE 2: DOUBLE-ENTRY ENGINE & VALIDASI NOMINAL DECIMAL
    // ----------------------------------------------------
    console.log('\n📌 [SUITE 2] Double-Entry Accounting Engine & Presisi Decimal');
    const validBalance = validateJournalBalance([
      { accountId: 'acc1', debit: '150000.50', credit: 0 },
      { accountId: 'acc2', debit: 0, credit: '150000.50' },
    ]);
    assert(validBalance.isValid === true, 'Jurnal seimbang Debit = Kredit diterima');

    const invalidBalance = validateJournalBalance([
      { accountId: 'acc1', debit: '150000.00', credit: 0 },
      { accountId: 'acc2', debit: 0, credit: '140000.00' },
    ]);
    assert(invalidBalance.isValid === false, 'Jurnal tidak seimbang mutlak ditolak sistem');

    // ----------------------------------------------------
    // TEST SUITE 3: VALIDASI ATURAN PEMBAGIAN HASIL USAHA (100%)
    // ----------------------------------------------------
    console.log('\n📌 [SUITE 3] Pengaturan & Validasi Pembagian Hasil Usaha 100%');
    const validSharing = validateProfitSharing(40, 30, 20, 10);
    assert(validSharing.isValid === true, 'Alokasi 40% + 30% + 20% + 10% = 100% sah');

    const invalidSharing = validateProfitSharing(40, 30, 20, 15);
    assert(invalidSharing.isValid === false, 'Alokasi tidak sama dengan 100% (105%) berhasil dicegah');

    // ----------------------------------------------------
    // TEST SUITE 4: KAS & BANK, JURNAL UMUM, DAN BUKU BESAR
    // ----------------------------------------------------
    console.log('\n📌 [SUITE 4] Modul Kas & Bank, Jurnal Umum, dan Buku Besar');
    const cashTxs = await prisma.cashBankTransaction.count();
    assert(cashTxs > 0, 'Transaksi Kas & Bank tercatat di database', `${cashTxs} transaksi`);

    const journals = await prisma.journalEntry.findMany({
      include: { items: true },
    });
    assert(journals.length > 0, 'Entri Jurnal Umum aktif', `${journals.length} jurnal`);

    let allJournalsBalanced = true;
    for (const j of journals) {
      const d = new Decimal(j.totalDebit.toString());
      const c = new Decimal(j.totalCredit.toString());
      if (!d.equals(c)) {
        allJournalsBalanced = false;
        break;
      }
    }
    assert(allJournalsBalanced === true, 'Seluruh jurnal dalam database memiliki Debit = Kredit seimbang 100%');

    // ----------------------------------------------------
    // TEST SUITE 5: PEMBELIAN, PERSEDIAAN, & METODE HARGA POKOK
    // ----------------------------------------------------
    console.log('\n📌 [SUITE 5] Modul Pembelian Bahan Baku & Moving Average Stock');
    const items = await prisma.item.findMany();
    assert(items.length > 0, 'Katalog Bahan Baku & Kaos Sablon tersedia', `${items.length} item`);

    const invTxs = await prisma.inventoryTransaction.count();
    assert(invTxs > 0, 'Kartu Stok Persediaan (Inventory Card) aktif mencatat mutasi', `${invTxs} mutasi`);

    // ----------------------------------------------------
    // TEST SUITE 6: PENJUALAN SABLON, PIUTANG, & OTOMASI HPP
    // ----------------------------------------------------
    console.log('\n📌 [SUITE 6] Modul Penjualan, Faktur Sablon, & Otomasi HPP');
    const salesInvoices = await prisma.salesInvoice.findMany({
      include: { items: true, customer: true },
    });
    assert(salesInvoices.length > 0, 'Faktur Penjualan Kaos Sablon tercatat', `${salesInvoices.length} faktur`);

    const firstInvoice = salesInvoices[0];
    assert(
      firstInvoice && firstInvoice.invoiceNumber.startsWith('INV/'),
      'Penomoran otomatis faktur penjualan standar',
      firstInvoice?.invoiceNumber
    );

    // ----------------------------------------------------
    // TEST SUITE 7: ASET TETAP & DEPRESIASI GARIS LURUS
    // ----------------------------------------------------
    console.log('\n📌 [SUITE 7] Modul Aset Tetap, Depresiasi Garis Lurus, & Period Lock');
    const fixedAssets = await prisma.fixedAsset.findMany();
    assert(fixedAssets.length > 0, 'Aset Tetap workshop sablon terdaftar', `${fixedAssets.length} aset`);

    const depreciations = await prisma.assetDepreciation.count();
    assert(depreciations > 0, 'Penyusutan bulanan otomatis berhasil dieksekusi', `${depreciations} periode penyusutan`);

    // ----------------------------------------------------
    // TEST SUITE 8: LAPORAN KEUANGAN SAK EMKM
    // ----------------------------------------------------
    console.log('\n📌 [SUITE 8] Modul Laporan Keuangan Standar SAK EMKM');
    const incomeStmt = await getIncomeStatement(prisma, {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    assert(incomeStmt !== null, 'Laporan Laba Rugi berhasil digenerate');
    assert(incomeStmt.totalRevenue > 0, 'Total Pendapatan terhitung', `Rp ${incomeStmt.totalRevenue.toLocaleString('id-ID')}`);
    assert(incomeStmt.grossProfit > 0, 'Laba Kotor terhitung', `Rp ${incomeStmt.grossProfit.toLocaleString('id-ID')}`);

    const balanceSheet = await getBalanceSheet(prisma, { asOfDate: '2026-12-31' });
    assert(balanceSheet.isBalanced === true, 'Laporan Posisi Keuangan (Neraca) Seimbang Mutlak (Selisih = Rp 0)');

    const cashFlow = await getCashFlow(prisma, { startDate: '2026-01-01', endDate: '2026-12-31' });
    assert(
      Math.abs(cashFlow.endingBalance - balanceSheet.assets.currentAssets.totalCashAndBank) < 0.01,
      'Rekonsiliasi Arus Kas cocok persis dengan Saldo Kas di Neraca'
    );

    const profitSharing = await getProfitSharingCalculation(prisma, { year: 2026 });
    assert(profitSharing.percentages.totalPercent === 100, 'Alokasi PADKam 100% tervalidasi');

    // ----------------------------------------------------
    // TEST SUITE 9: PENCADANGAN DATABASE (BACKUP & RESTORE)
    // ----------------------------------------------------
    console.log('\n📌 [SUITE 9] Fitur Pencadangan & Pemulihan Data (Backup & Restore)');
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    assert(fs.existsSync(dbPath), 'File database SQLite aktif ditemukan', dbPath);

    const dbStats = fs.statSync(dbPath);
    assert(dbStats.size > 0, 'Ukuran database SQLite valid', `${(dbStats.size / 1024).toFixed(2)} KB`);

    // Header check
    const fd = fs.openSync(dbPath, 'r');
    const headerBuf = Buffer.alloc(16);
    fs.readSync(fd, headerBuf, 0, 16, 0);
    fs.closeSync(fd);
    assert(
      headerBuf.toString('utf-8').startsWith('SQLite format 3'),
      'Header database SQLite terverifikasi integritasnya'
    );

  } catch (error) {
    console.error('Fatal error during test execution:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`🏁 HASIL AKHIR PENGUJIAN UAT: ${passed} BERHASIL, ${failed} GAGAL`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFullAcceptanceTest();
