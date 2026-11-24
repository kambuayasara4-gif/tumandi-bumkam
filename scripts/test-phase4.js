// scripts/test-phase4.js
// Pengujian Integrasi Otomatis Fase 4: Pembelian Bahan Sablon, Kartu Stok, HPP, dan Stock Opname TUMANDI

const { prisma } = require('../lib/prisma');
const { generateTransactionNumber, postJournalEntry } = require('../lib/accounting');
const { Decimal } = require('decimal.js');

async function runPhase4Tests() {
  console.log('🧪 ========================================================');
  console.log('🧪 MEMULAI PENGUJIAN OTOMATIS FASE 4: PEMBELIAN & STOK');
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
    // Ambil data referensi
    const supplier = await prisma.contact.findFirst({ where: { type: 'SUPPLIER' } });
    const kaosItem = await prisma.item.findUnique({ where: { code: 'KP-30S-BLK-L' } });
    const tintaItem = await prisma.item.findUnique({ where: { code: 'TNT-PLST-BLK' } });
    const kasAcc = await prisma.account.findUnique({ where: { code: '1-1100' } });
    const bankAcc = await prisma.account.findUnique({ where: { code: '1-1110' } });
    const persediaanAcc = await prisma.account.findUnique({ where: { code: '1-1310' } });
    const utangAcc = await prisma.account.findUnique({ where: { code: '2-1100' } });

    assert(supplier && kaosItem && tintaItem && kasAcc && persediaanAcc && utangAcc, 'Data master supplier, item bahan, dan CoA ditemukan');

    const testDate = new Date('2026-04-22T09:00:00');

    // ----------------------------------------------------
    // UJI 1: PEMBELIAN BAHAN TUNAI LUNAS (PAID)
    // ----------------------------------------------------
    console.log('\n--- 1. UJI PEMBELIAN BAHAN TUNAI LUNAS (PAID) ---');
    const initialKaosStock = new Decimal(kaosItem.currentStock.toString());
    const buyQty = new Decimal('50.00'); // 50 pcs kaos
    const buyPrice = new Decimal('38000.00'); // Rp 38.000 / pcs
    const buyTotal = buyQty.times(buyPrice); // Rp 1.900.000

    const pCount1 = await prisma.purchaseInvoice.count();
    const poNumber1 = generateTransactionNumber('PO', pCount1 + 1, testDate);
    const jCount1 = await prisma.journalEntry.count();
    const jNumber1 = generateTransactionNumber('JU', jCount1 + 1, testDate);

    // Auto-jurnal pembelian lunas: Debit Persediaan, Kredit Kas
    const journal1 = await postJournalEntry(prisma, {
      entryNumber: jNumber1,
      date: testDate,
      referenceType: 'PURCHASE',
      referenceId: poNumber1,
      description: `Pembelian 50 pcs Kaos Polos Combed 30s [${poNumber1}] dari ${supplier.name} (Lunas)`,
      items: [
        { accountId: persediaanAcc.id, debit: buyTotal.toString(), credit: '0.00', memo: 'Persediaan kaos masuk' },
        { accountId: kasAcc.id, debit: '0.00', credit: buyTotal.toString(), memo: 'Dibayar tunai dari kas workshop' },
      ],
    });

    const po1 = await prisma.purchaseInvoice.create({
      data: {
        purchaseNumber: poNumber1,
        date: testDate,
        supplierId: supplier.id,
        totalAmount: buyTotal.toString(),
        paidAmount: buyTotal.toString(),
        paymentStatus: 'PAID',
        cashAccountId: kasAcc.id,
        journalEntryId: journal1.id,
        items: {
          create: [
            {
              itemId: kaosItem.id,
              quantity: buyQty.toString(),
              unitPrice: buyPrice.toString(),
              totalPrice: buyTotal.toString(),
            },
          ],
        },
      },
    });

    // Catat mutasi kartu stok & update kuantitas fisik
    await prisma.inventoryTransaction.create({
      data: {
        date: testDate,
        itemId: kaosItem.id,
        type: 'PURCHASE_IN',
        quantity: buyQty.toString(),
        unitCost: buyPrice.toString(),
        totalCost: buyTotal.toString(),
        referenceType: 'PURCHASE',
        referenceId: poNumber1,
        notes: `Restock bahan kaos polos dari ${supplier.name}`,
      },
    });

    const updatedKaos = await prisma.item.update({
      where: { id: kaosItem.id },
      data: {
        currentStock: initialKaosStock.plus(buyQty).toString(),
      },
    });

    assert(po1.paymentStatus === 'PAID', `Faktur ${poNumber1} berstatus PAID`);
    assert(new Decimal(journal1.totalDebit).equals(buyTotal), 'Debit Jurnal tepat Rp 1.900.000,00');
    assert(new Decimal(journal1.totalCredit).equals(buyTotal), 'Kredit Jurnal tepat Rp 1.900.000,00');
    assert(new Decimal(updatedKaos.currentStock).equals(initialKaosStock.plus(buyQty)), `Stok kaos bertambah +50 pcs (sekarang: ${updatedKaos.currentStock} Pcs)`);

    // ----------------------------------------------------
    // UJI 2: PEMBELIAN BAHAN TEMPO / UTANG USAHA (UNPAID)
    // ----------------------------------------------------
    console.log('\n--- 2. UJI PEMBELIAN BAHAN TEMPO / UTANG USAHA (UNPAID) ---');
    const initialTintaStock = new Decimal(tintaItem.currentStock.toString());
    const tintaQty = new Decimal('5.00'); // 5 kg
    const tintaPrice = new Decimal('125000.00'); // Rp 125.000 / kg
    const tintaTotal = tintaQty.times(tintaPrice); // Rp 625.000

    const pCount2 = await prisma.purchaseInvoice.count();
    const poNumber2 = generateTransactionNumber('PO', pCount2 + 1, testDate);
    const jCount2 = await prisma.journalEntry.count();
    const jNumber2 = generateTransactionNumber('JU', jCount2 + 1, testDate);

    // Auto-jurnal pembelian kredit: Debit Persediaan, Kredit Utang Usaha (2-1100)
    const journal2 = await postJournalEntry(prisma, {
      entryNumber: jNumber2,
      date: testDate,
      referenceType: 'PURCHASE',
      referenceId: poNumber2,
      description: `Pembelian Tinta Plastisol [${poNumber2}] dari ${supplier.name} (Tempo)`,
      items: [
        { accountId: persediaanAcc.id, debit: tintaTotal.toString(), credit: '0.00', memo: 'Persediaan tinta masuk' },
        { accountId: utangAcc.id, debit: '0.00', credit: tintaTotal.toString(), memo: `Utang usaha ke ${supplier.name}` },
      ],
    });

    const po2 = await prisma.purchaseInvoice.create({
      data: {
        purchaseNumber: poNumber2,
        date: testDate,
        dueDate: new Date('2026-05-22'),
        supplierId: supplier.id,
        totalAmount: tintaTotal.toString(),
        paidAmount: '0.00',
        paymentStatus: 'UNPAID',
        journalEntryId: journal2.id,
        items: {
          create: [
            {
              itemId: tintaItem.id,
              quantity: tintaQty.toString(),
              unitPrice: tintaPrice.toString(),
              totalPrice: tintaTotal.toString(),
            },
          ],
        },
      },
    });

    const updatedTinta = await prisma.item.update({
      where: { id: tintaItem.id },
      data: {
        currentStock: initialTintaStock.plus(tintaQty).toString(),
      },
    });

    assert(po2.paymentStatus === 'UNPAID', `Faktur ${poNumber2} berstatus UNPAID (Tempo)`);
    assert(new Decimal(po2.totalAmount).equals(tintaTotal), 'Total tagihan utang tercatat Rp 625.000,00');
    assert(new Decimal(updatedTinta.currentStock).equals(initialTintaStock.plus(tintaQty)), `Stok tinta fisik bertambah +5 kg (sekarang: ${updatedTinta.currentStock} Kg)`);

    // ----------------------------------------------------
    // UJI 3: PEMBELIAN MAJEMUK DENGAN DP (PARTIAL)
    // ----------------------------------------------------
    console.log('\n--- 3. UJI PEMBELIAN BAHAN DENGAN DP (PARTIAL) ---');
    const partTotal = new Decimal('1000000.00');
    const partDP = new Decimal('400000.00');
    const partSisaUtang = partTotal.minus(partDP); // Rp 600.000

    const pCount3 = await prisma.purchaseInvoice.count();
    const poNumber3 = generateTransactionNumber('PO', pCount3 + 1, testDate);
    const jCount3 = await prisma.journalEntry.count();
    const jNumber3 = generateTransactionNumber('JU', jCount3 + 1, testDate);

    // Jurnal 3 Baris: Debit Persediaan Rp 1.000.000 == Kredit Bank Rp 400.000 + Kredit Utang Rp 600.000
    const journal3 = await postJournalEntry(prisma, {
      entryNumber: jNumber3,
      date: testDate,
      referenceType: 'PURCHASE',
      referenceId: poNumber3,
      description: `Pembelian Bahan [${poNumber3}] dengan DP 40%`,
      items: [
        { accountId: persediaanAcc.id, debit: partTotal.toString(), credit: '0.00', memo: 'Persediaan bahan' },
        { accountId: bankAcc.id, debit: '0.00', credit: partDP.toString(), memo: 'Pembayaran DP via Bank BUMKam' },
        { accountId: utangAcc.id, debit: '0.00', credit: partSisaUtang.toString(), memo: 'Sisa utang usaha tempo' },
      ],
    });

    assert(new Decimal(journal3.totalDebit).equals(partTotal), 'Debit jurnal majemuk seimbang Rp 1.000.000,00');
    assert(new Decimal(journal3.totalCredit).equals(partTotal), 'Kredit jurnal majemuk seimbang (DP 400rb + Utang 600rb)');

    // ----------------------------------------------------
    // UJI 4: STOCK OPNAME FISIK & AUTO-JURNAL PENYESUAIAN
    // ----------------------------------------------------
    console.log('\n--- 4. UJI STOCK OPNAME FISIK & AUTO-JURNAL SELISIH ---');
    // Skenario: Kaos hitam dihitung fisik di gudang ternyata berkurang 2 pcs (50 -> 48 pcs karena noda tinta)
    const currentStockBefore = new Decimal(updatedKaos.currentStock.toString());
    const physicalStockReal = currentStockBefore.minus(2); // 48 pcs
    const selisihQty = physicalStockReal.minus(currentStockBefore); // -2
    const bebanSelisihAcc = await prisma.account.findUnique({ where: { code: '6-9000' } });
    const selisihNilai = selisihQty.abs().times(new Decimal(updatedKaos.costPrice.toString()));

    const soCount = await prisma.inventoryTransaction.count({ where: { type: 'OPNAME_ADJUSTMENT' } });
    const soRef = generateTransactionNumber('SO', soCount + 1, testDate);
    const jCount4 = await prisma.journalEntry.count();
    const jNumber4 = generateTransactionNumber('JU', jCount4 + 1, testDate);

    // Auto-Jurnal Opname Kurang: Debit Beban Selisih, Kredit Persediaan
    const journalOpname = await postJournalEntry(prisma, {
      entryNumber: jNumber4,
      date: testDate,
      referenceType: 'ADJUSTMENT',
      referenceId: soRef,
      description: `Stock Opname Kurang [${soRef}]: 2 pcs Kaos rusak noda tinta`,
      items: [
        { accountId: bebanSelisihAcc.id, debit: selisihNilai.toString(), credit: '0.00', memo: 'Beban kerusakan kaos' },
        { accountId: persediaanAcc.id, debit: '0.00', credit: selisihNilai.toString(), memo: 'Penurunan persediaan kaos' },
      ],
    });

    // Catat mutasi opname
    await prisma.inventoryTransaction.create({
      data: {
        date: testDate,
        itemId: updatedKaos.id,
        type: 'OPNAME_ADJUSTMENT',
        quantity: selisihQty.toString(),
        unitCost: updatedKaos.costPrice.toString(),
        totalCost: selisihNilai.toString(),
        referenceType: 'OPNAME',
        referenceId: soRef,
        notes: '2 pcs kaos cacat noda tinta sablon',
      },
    });

    const opnameItemFinal = await prisma.item.update({
      where: { id: updatedKaos.id },
      data: { currentStock: physicalStockReal.toString() },
    });

    assert(journalOpname.isPosted === true, `Jurnal Opname ${jNumber4} berhasil diposting`);
    assert(new Decimal(journalOpname.totalDebit).equals(selisihNilai), `Beban selisih persediaan tercatat presisi Rp ${selisihNilai.toFixed(2)}`);
    assert(new Decimal(opnameItemFinal.currentStock).equals(physicalStockReal), `Stok fisik di sistem disesuaikan menjadi tepat ${physicalStockReal} Pcs`);

  } catch (err) {
    console.error('💥 Terjadi kesalahan tidak terduga saat pengujian Fase 4:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n========================================================');
  console.log(`📊 HASIL PENGUJIAN FASE 4: ${passed} BERHASIL, ${failed} GAGAL`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests();
