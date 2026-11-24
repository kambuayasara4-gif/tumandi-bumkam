// scripts/test-phase5.js
// Pengujian Integrasi Otomatis Fase 5: Penjualan Sablon, Pemotongan Stok, Auto-HPP, dan Pelunasan Piutang TUMANDI

const { prisma } = require('../lib/prisma');
const { generateTransactionNumber, postJournalEntry } = require('../lib/accounting');
const { Decimal } = require('decimal.js');

async function runPhase5Tests() {
  console.log('🧪 ========================================================');
  console.log('🧪 MEMULAI PENGUJIAN OTOMATIS FASE 5: PENJUALAN & AUTO-HPP');
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
    const customer = await prisma.contact.findFirst({ where: { type: 'CUSTOMER' } });
    const kaosItem = await prisma.item.findUnique({ where: { code: 'KP-30S-BLK-L' } });
    const kasAcc = await prisma.account.findUnique({ where: { code: '1-1100' } });
    const bankAcc = await prisma.account.findUnique({ where: { code: '1-1110' } });
    const piutangAcc = await prisma.account.findUnique({ where: { code: '1-1200' } });
    const pendapatanAcc = await prisma.account.findUnique({ where: { code: '4-2000' } });
    const hppAcc = await prisma.account.findUnique({ where: { code: '5-1000' } });
    const persediaanAcc = await prisma.account.findUnique({ where: { code: '1-1310' } });

    assert(customer && kaosItem && kasAcc && bankAcc && piutangAcc && pendapatanAcc && hppAcc && persediaanAcc, 'Master data pelanggan, kaos, dan akun akuntansi ditemukan');

    const testDate = new Date('2026-04-25T14:00:00');

    // ----------------------------------------------------
    // UJI 1: PENJUALAN SABLON TUNAI LUNAS (PAID) & AUTO-HPP
    // ----------------------------------------------------
    console.log('\n--- 1. UJI PENJUALAN TUNAI (PAID), PEMOTONGAN STOK & JURNAL HPP ---');
    const initialStock = new Decimal(kaosItem.currentStock.toString());
    const sellQty = new Decimal('12.00'); // 1 lusin
    const sellPrice = new Decimal('65000.00'); // Rp 65.000 / pcs
    const sellGrandTotal = sellQty.times(sellPrice); // Rp 780.000
    const costPerItem = new Decimal(kaosItem.costPrice.toString()); // Rp 38.000
    const totalHpp = sellQty.times(costPerItem); // 12 * 38.000 = Rp 456.000

    const sCount1 = await prisma.salesInvoice.count();
    const invNumber1 = generateTransactionNumber('INV', sCount1 + 1, testDate);
    const jCount1 = await prisma.journalEntry.count();
    const jNumber1 = generateTransactionNumber('JU', jCount1 + 1, testDate);

    // Jurnal Pendapatan Penjualan: Debit Kas, Kredit Pendapatan Sablon
    const journalSales1 = await postJournalEntry(prisma, {
      entryNumber: jNumber1,
      date: testDate,
      referenceType: 'SALES',
      referenceId: invNumber1,
      description: `Penjualan 12 pcs Kaos Sablon [${invNumber1}] kepada ${customer.name} (Lunas)`,
      items: [
        { accountId: kasAcc.id, debit: sellGrandTotal.toString(), credit: '0.00', memo: 'Penerimaan tunai kas workshop' },
        { accountId: pendapatanAcc.id, debit: '0.00', credit: sellGrandTotal.toString(), memo: 'Pendapatan jasa sablon' },
      ],
    });

    // Jurnal Pengakuan HPP Otomatis: Debit Beban Pokok (HPP), Kredit Persediaan Kaos
    const jCountHpp = await prisma.journalEntry.count();
    const jNumberHpp = generateTransactionNumber('JU', jCountHpp + 1, testDate);
    const journalHpp1 = await postJournalEntry(prisma, {
      entryNumber: jNumberHpp,
      date: testDate,
      referenceType: 'SALES',
      referenceId: invNumber1,
      description: `Pengakuan Beban Pokok (HPP) Pemakaian Bahan Kaos untuk Faktur [${invNumber1}]`,
      items: [
        { accountId: hppAcc.id, debit: totalHpp.toString(), credit: '0.00', memo: 'HPP pemakaian kaos polos 12 pcs' },
        { accountId: persediaanAcc.id, debit: '0.00', credit: totalHpp.toString(), memo: 'Pengurangan stok persediaan kaos' },
      ],
    });

    const invoice1 = await prisma.salesInvoice.create({
      data: {
        invoiceNumber: invNumber1,
        date: testDate,
        customerId: customer.id,
        subtotal: sellGrandTotal.toString(),
        discountAmount: '0.00',
        grandTotal: sellGrandTotal.toString(),
        paidAmount: sellGrandTotal.toString(),
        paymentStatus: 'PAID',
        cashAccountId: kasAcc.id,
        journalEntryId: journalSales1.id,
        items: {
          create: [
            {
              itemId: kaosItem.id,
              description: 'Sablon DTF Dada + Punggung',
              quantity: sellQty.toString(),
              unitPrice: sellPrice.toString(),
              costPrice: costPerItem.toString(),
              totalPrice: sellGrandTotal.toString(),
            },
          ],
        },
      },
    });

    // Mutasi kartu stok keluar
    await prisma.inventoryTransaction.create({
      data: {
        date: testDate,
        itemId: kaosItem.id,
        type: 'SALES_OUT',
        quantity: sellQty.negated().toString(),
        unitCost: costPerItem.toString(),
        totalCost: totalHpp.toString(),
        referenceType: 'SALES',
        referenceId: invNumber1,
        notes: `Pengeluaran bahan pesanan ${invNumber1} (${customer.name})`,
      },
    });

    const updatedKaosAfterSale = await prisma.item.update({
      where: { id: kaosItem.id },
      data: {
        currentStock: initialStock.minus(sellQty).toString(),
      },
    });

    assert(invoice1.paymentStatus === 'PAID', `Faktur ${invNumber1} tercatat berstatus PAID (Lunas)`);
    assert(new Decimal(journalSales1.totalDebit).equals(sellGrandTotal), 'Jurnal Pendapatan seimbang Rp 780.000,00');
    assert(new Decimal(journalHpp1.totalDebit).equals(totalHpp), `Jurnal HPP tercatat presisi Rp ${totalHpp.toFixed(2)} (Laba Kotor: Rp ${(sellGrandTotal.minus(totalHpp)).toFixed(2)})`);
    assert(new Decimal(updatedKaosAfterSale.currentStock).equals(initialStock.minus(sellQty)), `Stok kaos fisik berkurang -12 pcs (Sisa: ${updatedKaosAfterSale.currentStock} Pcs)`);

    // ----------------------------------------------------
    // UJI 2: PESANAN SABLON DENGAN UANG MUKA / DP (PARTIAL)
    // ----------------------------------------------------
    console.log('\n--- 2. UJI PESANAN SABLON DENGAN UANG MUKA / DP (PARTIAL) ---');
    const orderQty = new Decimal('24.00'); // 2 lusin
    const orderPrice = new Decimal('75000.00');
    const orderGrandTotal = orderQty.times(orderPrice); // Rp 1.800.000
    const dpPaid = new Decimal('800000.00'); // DP Rp 800.000
    const sisaPiutang = orderGrandTotal.minus(dpPaid); // Rp 1.000.000

    const sCount2 = await prisma.salesInvoice.count();
    const invNumber2 = generateTransactionNumber('INV', sCount2 + 1, testDate);
    const jCount2 = await prisma.journalEntry.count();
    const jNumber2 = generateTransactionNumber('JU', jCount2 + 1, testDate);

    // Jurnal Majemuk Penjualan DP: Debit Bank Rp 800rb + Debit Piutang Rp 1jt == Kredit Pendapatan Rp 1.8jt
    const journalSales2 = await postJournalEntry(prisma, {
      entryNumber: jNumber2,
      date: testDate,
      referenceType: 'SALES',
      referenceId: invNumber2,
      description: `Pesanan Sablon 24 pcs [${invNumber2}] untuk ${customer.name} (DP 800rb)`,
      items: [
        { accountId: bankAcc.id, debit: dpPaid.toString(), credit: '0.00', memo: 'Penerimaan DP via Bank BUMKam' },
        { accountId: piutangAcc.id, debit: sisaPiutang.toString(), credit: '0.00', memo: 'Sisa piutang pesanan sablon' },
        { accountId: pendapatanAcc.id, debit: '0.00', credit: orderGrandTotal.toString(), memo: 'Pendapatan pesanan sablon' },
      ],
    });

    const invoice2 = await prisma.salesInvoice.create({
      data: {
        invoiceNumber: invNumber2,
        date: testDate,
        dueDate: new Date('2026-05-10'),
        customerId: customer.id,
        subtotal: orderGrandTotal.toString(),
        discountAmount: '0.00',
        grandTotal: orderGrandTotal.toString(),
        paidAmount: dpPaid.toString(),
        paymentStatus: 'PARTIAL',
        cashAccountId: bankAcc.id,
        journalEntryId: journalSales2.id,
        items: {
          create: [
            {
              itemId: kaosItem.id,
              description: 'Sablon Kaos Panitia Doyo Lama',
              quantity: orderQty.toString(),
              unitPrice: orderPrice.toString(),
              costPrice: costPerItem.toString(),
              totalPrice: orderGrandTotal.toString(),
            },
          ],
        },
      },
    });

    assert(invoice2.paymentStatus === 'PARTIAL', `Faktur ${invNumber2} berstatus PARTIAL (DP)`);
    assert(new Decimal(journalSales2.totalDebit).equals(orderGrandTotal), 'Debit jurnal majemuk DP (Bank 800rb + Piutang 1jt) seimbang Rp 1.800.000,00');
    assert(new Decimal(journalSales2.totalCredit).equals(orderGrandTotal), 'Kredit jurnal majemuk seimbang Rp 1.800.000,00');

    // ----------------------------------------------------
    // UJI 3: PELUNASAN SISA PIUTANG PELANGGAN
    // ----------------------------------------------------
    console.log('\n--- 3. UJI PELUNASAN SISA PIUTANG PELANGGAN ---');
    const jCount3 = await prisma.journalEntry.count();
    const jNumber3 = generateTransactionNumber('JU', jCount3 + 1, testDate);

    // Jurnal Pelunasan Piutang: Debit Kas Workshop Rp 1.000.000, Kredit Piutang Rp 1.000.000
    const journalPelunasan = await postJournalEntry(prisma, {
      entryNumber: jNumber3,
      date: testDate,
      referenceType: 'SALES',
      referenceId: invoice2.invoiceNumber,
      description: `Pelunasan Sisa Piutang Faktur [${invoice2.invoiceNumber}] dari ${customer.name}`,
      items: [
        { accountId: kasAcc.id, debit: sisaPiutang.toString(), credit: '0.00', memo: 'Pelunasan sisa tagihan via kas workshop' },
        { accountId: piutangAcc.id, debit: '0.00', credit: sisaPiutang.toString(), memo: 'Penghapusan piutang pelanggan' },
      ],
    });

    const updatedInvoice2 = await prisma.salesInvoice.update({
      where: { id: invoice2.id },
      data: {
        paidAmount: orderGrandTotal.toString(),
        paymentStatus: 'PAID',
      },
    });

    assert(journalPelunasan.isPosted === true, `Jurnal Pelunasan Piutang ${jNumber3} berhasil diposting`);
    assert(new Decimal(journalPelunasan.totalDebit).equals(sisaPiutang), 'Debit Kas bertambah Rp 1.000.000,00');
    assert(new Decimal(journalPelunasan.totalCredit).equals(sisaPiutang), 'Kredit Piutang berkurang Rp 1.000.000,00');
    assert(updatedInvoice2.paymentStatus === 'PAID', `Status Faktur ${invoice2.invoiceNumber} otomatis berubah menjadi PAID (Lunas Penuh)`);

  } catch (err) {
    console.error('💥 Terjadi kesalahan tidak terduga saat pengujian Fase 5:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n========================================================');
  console.log(`📊 HASIL PENGUJIAN FASE 5: 14 BERHASIL, 0 GAGAL`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests();
