// scripts/test-accounting.js
// Pengujian Sistematis Akuntansi Double-Entry & Validasi BUMKam TUMANDI

const { PrismaClient } = require('@prisma/client');
const {
  validateProfitSharing,
  validateJournalBalance,
  generateTransactionNumber,
  postJournalEntry,
} = require('../lib/accounting');
const { Decimal } = require('decimal.js');

const prisma = new PrismaClient();

async function runTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 MEMULAI PENGUJIAN OTOMATIS FASE 1: TUMANDI ACCOUNTING');
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
    // ----------------------------------------------------
    // UJI 1: VALIDASI PERSENTASE BAGI HASIL USAHA HARUS 100%
    // ----------------------------------------------------
    console.log('--- 1. UJI VALIDASI PEMBAGIAN HASIL USAHA (AD/ART BUMKAM) ---');
    
    // Kasus 1: Tepat 100% (40% PADKam + 30% Cadangan + 20% Jasa Pengurus + 10% Sosial)
    const test1A = validateProfitSharing(40, 30, 20, 10);
    assert(test1A.isValid === true && test1A.total === 100, 'Kombinasi persentase total 100% harus VALID');

    // Kasus 2: Kurang dari 100% (Misal total 90%)
    const test1B = validateProfitSharing(35, 25, 20, 10);
    assert(test1B.isValid === false, 'Kombinasi total 90% harus DITOLAK sistem');

    // Kasus 3: Lebih dari 100% (Misal total 110%)
    const test1C = validateProfitSharing(50, 30, 20, 10);
    assert(test1C.isValid === false, 'Kombinasi total 110% harus DITOLAK sistem');

    // Kasus 4: Ada angka negatif
    const test1D = validateProfitSharing(120, -10, -10, 0);
    assert(test1D.isValid === false, 'Kombinasi dengan angka negatif harus DITOLAK sistem');

    // Kasus 5: Pecahan desimal yang tepat 100% (misal 37.5 + 32.5 + 18 + 12 = 100)
    const test1E = validateProfitSharing('37.5', '32.5', '18.0', '12.0');
    assert(test1E.isValid === true, 'Kombinasi pecahan desimal total 100.00% harus VALID');

    // ----------------------------------------------------
    // UJI 2: VALIDASI KESEIMBANGAN JURNAL (DOUBLE-ENTRY)
    // ----------------------------------------------------
    console.log('\n--- 2. UJI KESEIMBANGAN JURNAL (DEBIT == KREDIT) ---');

    // Kasus 1: Jurnal Seimbang (Kas bertambah Rp 1.500.000, Pendapatan bertambah Rp 1.500.000)
    const balancedItems = [
      { accountId: 'acc-1', debit: '1500000.00', credit: 0 },
      { accountId: 'acc-2', debit: 0, credit: '1500000.00' },
    ];
    const test2A = validateJournalBalance(balancedItems);
    assert(test2A.isValid === true, 'Jurnal dengan Debit Rp 1.500.000 == Kredit Rp 1.500.000 harus VALID');

    // Kasus 2: Jurnal Tidak Seimbang (Debit Rp 1.500.000 != Kredit Rp 1.400.000)
    const unbalancedItems = [
      { accountId: 'acc-1', debit: '1500000.00', credit: 0 },
      { accountId: 'acc-2', debit: 0, credit: '1400000.00' },
    ];
    const test2B = validateJournalBalance(unbalancedItems);
    assert(test2B.isValid === false && test2B.difference.equals(100000), 'Jurnal selisih Rp 100.000 harus DITOLAK dengan selisih terdeteksi');

    // Kasus 3: Multi-baris jurnal majemuk seimbang (DP + Piutang = Total Penjualan)
    // Kas Rp 500.000 + Piutang Rp 1.000.000 = Pendapatan Rp 1.500.000
    const compoundItems = [
      { accountId: 'kas', debit: '500000.00', credit: 0 },
      { accountId: 'piutang', debit: '1000000.00', credit: 0 },
      { accountId: 'pendapatan', debit: 0, credit: '1500000.00' },
    ];
    const test2C = validateJournalBalance(compoundItems);
    assert(test2C.isValid === true, 'Jurnal majemuk (3 baris) Debit Rp 1.500.000 == Kredit Rp 1.500.000 harus VALID');

    // ----------------------------------------------------
    // UJI 3: GENERATOR NOMOR TRANSAKSI OTOMATIS
    // ----------------------------------------------------
    console.log('\n--- 3. UJI NOMOR TRANSAKSI OTOMATIS ---');
    const fixedDate = new Date('2026-04-15T10:00:00');
    const invNum = generateTransactionNumber('INV', 1, fixedDate);
    const poNum = generateTransactionNumber('PO', 42, fixedDate);
    const juNum = generateTransactionNumber('JU', 999, fixedDate);

    assert(invNum === 'INV/2026/04/0001', `Format nomor invoice harus INV/2026/04/0001 (hasil: ${invNum})`);
    assert(poNum === 'PO/2026/04/0042', `Format nomor PO harus PO/2026/04/0042 (hasil: ${poNum})`);
    assert(juNum === 'JU/2026/04/0999', `Format nomor jurnal harus JU/2026/04/0999 (hasil: ${juNum})`);

    // ----------------------------------------------------
    // UJI 4: INTEGRASI DATABASE & POSTING JURNAL REAL
    // ----------------------------------------------------
    console.log('\n--- 4. UJI INTEGRASI TRANSAKSI POSTING JURNAL KE DATABASE ---');

    // Ambil akun Kas dan Modal dari database hasil seed
    const kasAccount = await prisma.account.findUnique({ where: { code: '1-1100' } });
    const modalAccount = await prisma.account.findUnique({ where: { code: '3-1000' } });
    const pendapatanAccount = await prisma.account.findUnique({ where: { code: '4-2000' } });

    assert(kasAccount !== null && modalAccount !== null, 'Akun Kas (1-1100) dan Modal (3-1000) harus ditemukan di database');

    // Skenario 1: Simpan Jurnal Setoran Modal Awal Seimbang Rp 25.000.000
    const entryNum1 = 'JU/TEST/' + Date.now();
    const createdJournal = await postJournalEntry(prisma, {
      entryNumber: entryNum1,
      date: fixedDate,
      referenceType: 'MANUAL',
      referenceId: 'REF-MODAL-001',
      description: 'Penyertaan Modal Awal dari Pemerintah Kampung Doyo Lama',
      items: [
        { accountId: kasAccount.id, debit: '25000000.00', credit: '0.00', memo: 'Kas bertambah di workshop' },
        { accountId: modalAccount.id, debit: '0.00', credit: '25000000.00', memo: 'Penyertaan modal Kampung Doyo Lama' },
      ],
    });

    assert(createdJournal.id !== undefined, `Jurnal ${entryNum1} berhasil disimpan ke database`);
    assert(new Decimal(createdJournal.totalDebit).equals('25000000'), 'Total Debit tersimpan presisi Rp 25.000.000,00');
    assert(new Decimal(createdJournal.totalCredit).equals('25000000'), 'Total Kredit tersimpan presisi Rp 25.000.000,00');

    // Skenario 2: Percobaan Simpan Jurnal TIDAK SEIMBANG ke Database (Wajib Ditolak & Tidak Tersimpan)
    let errorThrown = false;
    try {
      await postJournalEntry(prisma, {
        entryNumber: 'JU/2026/04/9999',
        date: fixedDate,
        referenceType: 'MANUAL',
        description: 'Jurnal Cacat yang Sengaja Dibuat Tidak Seimbang',
        items: [
          { accountId: kasAccount.id, debit: '1000000.00', credit: '0.00' },
          { accountId: pendapatanAccount.id, debit: '0.00', credit: '800000.00' }, // Selisih 200rb
        ],
      });
    } catch (e) {
      errorThrown = true;
    }
    assert(errorThrown === true, 'Sistem berhasil menolak penyimpanan jurnal tidak seimbang ke database');

    // Verifikasi jurnal cacat tidak masuk ke tabel
    const invalidCheck = await prisma.journalEntry.findUnique({ where: { entryNumber: 'JU/2026/04/9999' } });
    assert(invalidCheck === null, 'Jurnal tidak seimbang terbukti tidak tersimpan di database');

    // ----------------------------------------------------
    // UJI 5: PRESISI MONETER & DESIMAL
    // ----------------------------------------------------
    console.log('\n--- 5. UJI PRESISI KOMPUTASI MONETER ---');
    const a = new Decimal('1000000.15');
    const b = new Decimal('2000000.85');
    const total = a.plus(b);
    assert(total.equals('3000001.00'), 'Penjumlahan nilai pecahan moneter tepat tanpa floating-point bug');

  } catch (error) {
    console.error('💥 Terjadi kesalahan tidak terduga saat pengujian:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n========================================================');
  console.log(`📊 HASIL PENGUJIAN AKHIR: ${passed} BERHASIL, ${failed} GAGAL`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
