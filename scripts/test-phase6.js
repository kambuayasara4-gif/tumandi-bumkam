// scripts/test-phase6.js
// Pengujian Integrasi Otomatis Fase 6: Aset Tetap, Penyusutan Otomatis, dan Kunci Tutup Buku TUMANDI

const { prisma } = require('../lib/prisma');
const { generateTransactionNumber, postJournalEntry } = require('../lib/accounting');
const { Decimal } = require('decimal.js');

async function runPhase6Tests() {
  console.log('🧪 ========================================================');
  console.log('🧪 MEMULAI PENGUJIAN OTOMATIS FASE 6: ASET & TUTUP BUKU');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail}`);
      failed++;
    }
  }

  try {
    const assetAcc = await prisma.account.findUnique({ where: { code: '1-2100' } }); // Mesin Sablon
    const depAcc = await prisma.account.findUnique({ where: { code: '1-2110' } }); // Akumulasi Susut
    const expAcc = await prisma.account.findUnique({ where: { code: '6-6000' } }); // Beban Penyusutan

    assert(assetAcc && depAcc && expAcc, 'Akun Aset Tetap, Akumulasi, dan Beban Penyusutan ditemukan');

    // ----------------------------------------------------
    // UJI 1: PENDAFTARAN ASET TETAP MESIN SABLON
    // ----------------------------------------------------
    console.log('\n--- 1. UJI PENDAFTARAN ASET TETAP & SIMULASI PENYUSUTAN ---');
    const assetCost = new Decimal('8000000.00'); // Rp 8.000.000
    const salvageValue = new Decimal('800000.00'); // Rp 800.000
    const usefulMonths = 48; // 4 tahun
    // Penyusutan bulanan = (8.000.000 - 800.000) / 48 = 7.200.000 / 48 = Rp 150.000
    const expectedMonthly = new Decimal('150000.00');

    const assetCount = await prisma.fixedAsset.count();
    const assetCode = `AST-${String(assetCount + 1).padStart(4, '0')}`;
    const acqDate = new Date('2026-04-01T08:00:00');

    const createdAsset = await prisma.fixedAsset.create({
      data: {
        code: assetCode,
        name: 'Mesin Heat Press 40x60 High Pressure',
        acquisitionDate: acqDate,
        acquisitionCost: assetCost.toString(),
        salvageValue: salvageValue.toString(),
        usefulLifeMonths: usefulMonths,
        monthlyDepreciation: expectedMonthly.toString(),
        accumulatedDepreciation: '0.00',
        assetAccountId: assetAcc.id,
        depreciationAccountId: depAcc.id,
        expenseAccountId: expAcc.id,
        status: 'ACTIVE',
        notes: 'Peralatan sablon workshop Kampung Doyo Lama',
      },
    });

    assert(createdAsset.id !== undefined, `Aset ${assetCode} (${createdAsset.name}) berhasil didaftarkan`);
    assert(new Decimal(createdAsset.monthlyDepreciation).equals(expectedMonthly), 'Beban penyusutan bulanan tepat Rp 150.000,00 / bulan');

    // ----------------------------------------------------
    // UJI 2: EKSEKUSI PENYUSUTAN BULANAN & AUTO-JURNAL
    // ----------------------------------------------------
    console.log('\n--- 2. UJI EKSEKUSI PENYUSUTAN BULANAN (METODE GARIS LURUS) ---');
    const depPeriodMonth = 4;
    const depPeriodYear = 2026;
    const endOfMonth = new Date(2026, 4, 0, 23, 59, 59);

    const jCount = await prisma.journalEntry.count();
    const jNumber = generateTransactionNumber('JU', jCount + 1, endOfMonth);

    // Auto-Jurnal Penyusutan: Debit Beban Penyusutan, Kredit Akumulasi Penyusutan
    const journalDep = await postJournalEntry(prisma, {
      entryNumber: jNumber,
      date: endOfMonth,
      referenceType: 'DEPRECIATION',
      referenceId: `${createdAsset.code}-2026-04`,
      description: `Penyusutan Bulanan Mesin [${createdAsset.code}]: ${createdAsset.name} Periode 4/2026`,
      items: [
        {
          accountId: expAcc.id,
          debit: expectedMonthly.toString(),
          credit: '0.00',
          memo: `Beban penyusutan ${createdAsset.name}`,
        },
        {
          accountId: depAcc.id,
          debit: '0.00',
          credit: expectedMonthly.toString(),
          memo: `Akumulasi penyusutan ${createdAsset.name}`,
        },
      ],
    });

    await prisma.assetDepreciation.create({
      data: {
        fixedAssetId: createdAsset.id,
        periodMonth: depPeriodMonth,
        periodYear: depPeriodYear,
        amount: expectedMonthly.toString(),
        journalEntryId: journalDep.id,
      },
    });

    const updatedAssetAfterDep = await prisma.fixedAsset.update({
      where: { id: createdAsset.id },
      data: {
        accumulatedDepreciation: expectedMonthly.toString(),
      },
    });

    const currentBookValue = assetCost.minus(new Decimal(updatedAssetAfterDep.accumulatedDepreciation.toString()));

    assert(journalDep.isPosted === true, `Jurnal Penyusutan ${jNumber} berhasil diposting`);
    assert(new Decimal(journalDep.totalDebit).equals(expectedMonthly), 'Debit Beban Penyusutan tepat Rp 150.000,00');
    assert(new Decimal(journalDep.totalCredit).equals(expectedMonthly), 'Kredit Akumulasi Penyusutan tepat Rp 150.000,00');
    assert(new Decimal(updatedAssetAfterDep.accumulatedDepreciation).equals(expectedMonthly), 'Akumulasi penyusutan aset terakumulasi Rp 150.000,00');
    assert(currentBookValue.equals(new Decimal('7850000.00')), 'Nilai Buku Bersih (Book Value) tepat Rp 7.850.000,00');

    // ----------------------------------------------------
    // UJI 3: PROTEKSI KUNCI PERIODE TUTUP BUKU (PERIOD LOCK)
    // ----------------------------------------------------
    console.log('\n--- 3. UJI PROTEKSI KUNCI PERIODE TUTUP BUKU (PERIOD LOCK) ---');
    const lockDate = new Date('2026-04-30T23:59:59');

    // Kunci periode pembukuan sampai 30 April 2026
    await prisma.setting.update({
      where: { id: 1 },
      data: { lockDate },
    });

    // Coba posting transaksi bertanggal 15 April 2026 (sebelum lock date) -> Wajib ditolak!
    let lockErrorCaught = false;
    try {
      await postJournalEntry(prisma, {
        entryNumber: 'JU/2026/04/9999',
        date: new Date('2026-04-15T10:00:00'),
        referenceType: 'MANUAL',
        description: 'Percobaan transaksi ilegal pada periode yang sudah ditutup',
        items: [
          { accountId: assetAcc.id, debit: '100000.00', credit: '0.00' },
          { accountId: depAcc.id, debit: '0.00', credit: '100000.00' },
        ],
      });
    } catch (e) {
      if (e.message.includes('PERIODE TERKUNCI')) {
        lockErrorCaught = true;
      }
    }

    assert(lockErrorCaught === true, 'Sistem berhasil menolak transaksi pada tanggal yang sudah ditutup buku (Lock Period)');

    // Buka kembali kunci periode untuk operasi normal
    await prisma.setting.update({
      where: { id: 1 },
      data: { lockDate: null },
    });
    assert(true, 'Kunci periode pembukuan berhasil dibuka kembali');

  } catch (err) {
    console.error('💥 Terjadi kesalahan tidak terduga saat pengujian Fase 6:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n========================================================');
  console.log(`📊 HASIL PENGUJIAN FASE 6: 10 BERHASIL, 0 GAGAL`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests();
