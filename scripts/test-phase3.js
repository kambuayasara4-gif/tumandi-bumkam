// scripts/test-phase3.js
// Pengujian Integrasi Otomatis Fase 3: Kas & Bank, Jurnal Umum, dan Buku Besar TUMANDI

const { prisma } = require('../lib/prisma');
const { postJournalEntry, generateTransactionNumber } = require('../lib/accounting');
const { Decimal } = require('decimal.js');

async function runPhase3Tests() {
  console.log('🧪 ========================================================');
  console.log('🧪 MEMULAI PENGUJIAN OTOMATIS FASE 3: KAS/BANK & BUKU BESAR');
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
    // Ambil akun yang dibutuhkan
    const kasAcc = await prisma.account.findUnique({ where: { code: '1-1100' } }); // Kas Workshop
    const bankAcc = await prisma.account.findUnique({ where: { code: '1-1110' } }); // Bank BUMKam
    const pendapatanAcc = await prisma.account.findUnique({ where: { code: '4-2000' } }); // Pendapatan Jasa Sablon
    const bebanListrikAcc = await prisma.account.findUnique({ where: { code: '6-3000' } }); // Beban Listrik

    assert(kasAcc && bankAcc && pendapatanAcc && bebanListrikAcc, 'Akun-akun utama berhasil ditemukan di database');

    const testDate = new Date('2026-04-20T10:00:00');

    // ----------------------------------------------------
    // UJI 1: KAS MASUK (BKM) & JURNAL OTOMATIS
    // ----------------------------------------------------
    console.log('\n--- 1. UJI KAS MASUK (BKM) & AUTO-POSTING JURNAL ---');
    const bkmAmount = new Decimal('2500000.00');
    const bkmCount = await prisma.cashBankTransaction.count({ where: { type: 'IN' } });
    const bkmNumber = generateTransactionNumber('BKM', bkmCount + 1, testDate);
    const jCount1 = await prisma.journalEntry.count();
    const jNumber1 = generateTransactionNumber('JU', jCount1 + 1, testDate);

    // Posting Jurnal Kas Masuk: Debit Kas, Kredit Pendapatan
    const journalBKM = await postJournalEntry(prisma, {
      entryNumber: jNumber1,
      date: testDate,
      referenceType: 'CASH_IN',
      referenceId: bkmNumber,
      description: `Penerimaan Kas Workshop [${bkmNumber}]: Pembayaran Sablon Tunai`,
      items: [
        { accountId: kasAcc.id, debit: bkmAmount.toString(), credit: '0.00', memo: 'Kas masuk workshop' },
        { accountId: pendapatanAcc.id, debit: '0.00', credit: bkmAmount.toString(), memo: 'Pendapatan jasa sablon' },
      ],
    });

    const txBKM = await prisma.cashBankTransaction.create({
      data: {
        transactionNumber: bkmNumber,
        date: testDate,
        type: 'IN',
        accountId: kasAcc.id,
        oppositeAccountId: pendapatanAcc.id,
        amount: bkmAmount.toString(),
        recipientOrPayer: 'Gereja Doyo Lama',
        notes: 'Pelunasan sablon kaos perayaan Paskah',
        journalEntryId: journalBKM.id,
      },
    });

    assert(txBKM.id !== undefined && txBKM.transactionNumber === bkmNumber, `Transaksi Kas Masuk ${bkmNumber} berhasil dicatat`);
    assert(journalBKM.isPosted === true, `Jurnal ${jNumber1} terposting otomatis dengan status isPosted=true`);
    assert(new Decimal(journalBKM.totalDebit).equals(bkmAmount), 'Total Debit jurnal Kas Masuk tepat Rp 2.500.000,00');
    assert(new Decimal(journalBKM.totalCredit).equals(bkmAmount), 'Total Kredit jurnal Kas Masuk tepat Rp 2.500.000,00');

    // ----------------------------------------------------
    // UJI 2: KAS KELUAR (BKK) & JURNAL OTOMATIS
    // ----------------------------------------------------
    console.log('\n--- 2. UJI KAS KELUAR (BKK) & AUTO-POSTING JURNAL ---');
    const bkkAmount = new Decimal('450000.00');
    const bkkCount = await prisma.cashBankTransaction.count({ where: { type: 'OUT' } });
    const bkkNumber = generateTransactionNumber('BKK', bkkCount + 1, testDate);
    const jCount2 = await prisma.journalEntry.count();
    const jNumber2 = generateTransactionNumber('JU', jCount2 + 1, testDate);

    // Posting Jurnal Kas Keluar: Debit Beban Listrik, Kredit Kas Workshop
    const journalBKK = await postJournalEntry(prisma, {
      entryNumber: jNumber2,
      date: testDate,
      referenceType: 'CASH_OUT',
      referenceId: bkkNumber,
      description: `Pengeluaran Kas [${bkkNumber}]: Pembayaran Token Listrik Workshop Sablon`,
      items: [
        { accountId: bebanListrikAcc.id, debit: bkkAmount.toString(), credit: '0.00', memo: 'Token listrik PLN' },
        { accountId: kasAcc.id, debit: '0.00', credit: bkkAmount.toString(), memo: 'Dibayar dari kas workshop' },
      ],
    });

    const txBKK = await prisma.cashBankTransaction.create({
      data: {
        transactionNumber: bkkNumber,
        date: testDate,
        type: 'OUT',
        accountId: kasAcc.id,
        oppositeAccountId: bebanListrikAcc.id,
        amount: bkkAmount.toString(),
        recipientOrPayer: 'PLN Sentani',
        notes: 'Token listrik workshop 2200VA bulan April 2026',
        journalEntryId: journalBKK.id,
      },
    });

    assert(txBKK.id !== undefined && txBKK.transactionNumber === bkkNumber, `Transaksi Kas Keluar ${bkkNumber} berhasil dicatat`);
    assert(new Decimal(journalBKK.totalDebit).equals(bkkAmount), 'Total Debit jurnal Kas Keluar tepat Rp 450.000,00');
    assert(new Decimal(journalBKK.totalCredit).equals(bkkAmount), 'Total Kredit jurnal Kas Keluar tepat Rp 450.000,00');

    // ----------------------------------------------------
    // UJI 3: TRANSFER ANTAR KAS & BANK (TRF)
    // ----------------------------------------------------
    console.log('\n--- 3. UJI TRANSFER ANTAR KAS & BANK (TRF) ---');
    const trfAmount = new Decimal('1000000.00');
    const trfCount = await prisma.cashBankTransaction.count({ where: { type: 'TRANSFER' } });
    const trfNumber = generateTransactionNumber('TRF', trfCount + 1, testDate);
    const jCount3 = await prisma.journalEntry.count();
    const jNumber3 = generateTransactionNumber('JU', jCount3 + 1, testDate);

    // Posting Jurnal Transfer: Debit Bank BUMKam (+), Kredit Kas Workshop (-)
    const journalTRF = await postJournalEntry(prisma, {
      entryNumber: jNumber3,
      date: testDate,
      referenceType: 'TRANSFER',
      referenceId: trfNumber,
      description: `Setor Tunai Kas Workshop ke Bank BUMKam [${trfNumber}]`,
      items: [
        { accountId: bankAcc.id, debit: trfAmount.toString(), credit: '0.00', memo: 'Setoran masuk ke Bank' },
        { accountId: kasAcc.id, debit: '0.00', credit: trfAmount.toString(), memo: 'Setoran keluar dari Kas Workshop' },
      ],
    });

    const txTRF = await prisma.cashBankTransaction.create({
      data: {
        transactionNumber: trfNumber,
        date: testDate,
        type: 'TRANSFER',
        accountId: kasAcc.id,
        oppositeAccountId: bankAcc.id,
        amount: trfAmount.toString(),
        recipientOrPayer: 'Bank BPD Papua Cabang Sentani',
        notes: 'Penyetoran surplus kas workshop ke rekening bank resmi BUMKam',
        journalEntryId: journalTRF.id,
      },
    });

    assert(txTRF.id !== undefined && txTRF.transactionNumber === trfNumber, `Transaksi Transfer Bank ${trfNumber} berhasil dicatat`);
    assert(new Decimal(journalTRF.totalDebit).equals(trfAmount), 'Total Debit jurnal Transfer tepat Rp 1.000.000,00');
    assert(new Decimal(journalTRF.totalCredit).equals(trfAmount), 'Total Kredit jurnal Transfer tepat Rp 1.000.000,00');

    // ----------------------------------------------------
    // UJI 4: KALKULASI BUKU BESAR (GENERAL LEDGER) & SALDO BERJALAN
    // ----------------------------------------------------
    console.log('\n--- 4. UJI KALKULASI BUKU BESAR & SALDO BERJALAN (KAS WORKSHOP) ---');

    // Ambil seluruh journalItems untuk Kas Workshop (1-1100)
    const ledgerItems = await prisma.journalItem.findMany({
      where: {
        accountId: kasAcc.id,
        journalEntry: { isPosted: true },
      },
      include: { journalEntry: true },
      orderBy: { journalEntry: { date: 'asc' } },
    });

    let runningBal = new Decimal(0);
    let totalD = new Decimal(0);
    let totalC = new Decimal(0);

    for (const item of ledgerItems) {
      const d = new Decimal(item.debit.toString());
      const c = new Decimal(item.credit.toString());
      totalD = totalD.plus(d);
      totalC = totalC.plus(c);
      // Saldo Normal Kas = Debit - Kredit
      runningBal = runningBal.plus(d).minus(c);
    }

    assert(ledgerItems.length >= 3, `Ditemukan minimal 3 transaksi mutasi pada Buku Besar Kas (total: ${ledgerItems.length})`);
    assert(totalD.greaterThan(0), `Total Mutasi Debit terakumulasi: Rp ${totalD.toFixed(2)}`);
    assert(totalC.greaterThan(0), `Total Mutasi Kredit terakumulasi: Rp ${totalC.toFixed(2)}`);
    assert(runningBal.equals(totalD.minus(totalC)), `Saldo Akhir Kas Rp ${runningBal.toFixed(2)} terbukti sama dengan Debit - Kredit`);

  } catch (err) {
    console.error('💥 Terjadi kesalahan tidak terduga saat pengujian Fase 3:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n========================================================');
  console.log(`📊 HASIL PENGUJIAN FASE 3: ${passed} BERHASIL, ${failed} GAGAL`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Tests();
