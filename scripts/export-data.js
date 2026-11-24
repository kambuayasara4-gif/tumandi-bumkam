// scripts/export-data.js
// Ekspor seluruh data dari SQLite lokal ke JSON untuk migrasi ke PostgreSQL Cloud

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportAllData() {
  console.log('📦 Memulai ekspor data dari SQLite lokal...');

  try {
    const users = await prisma.user.findMany();
    const settings = await prisma.setting.findMany();
    const accounts = await prisma.account.findMany();
    const contacts = await prisma.contact.findMany();
    const categories = await prisma.itemCategory.findMany();
    const items = await prisma.item.findMany();
    const fixedAssets = await prisma.fixedAsset.findMany();
    const assetDepreciations = await prisma.assetDepreciation.findMany();
    const salesInvoices = await prisma.salesInvoice.findMany({ include: { items: true } });
    const purchaseInvoices = await prisma.purchaseInvoice.findMany({ include: { items: true } });
    const cashTransactions = await prisma.cashBankTransaction.findMany();
    const journalEntries = await prisma.journalEntry.findMany({ include: { items: true } });
    const inventoryTransactions = await prisma.inventoryTransaction.findMany();
    const profitSharingHistories = await prisma.profitSharingHistory.findMany();
    const auditLogs = await prisma.auditLog.findMany();

    const dataDump = {
      exportedAt: new Date().toISOString(),
      counts: {
        users: users.length,
        settings: settings.length,
        accounts: accounts.length,
        contacts: contacts.length,
        categories: categories.length,
        items: items.length,
        fixedAssets: fixedAssets.length,
        salesInvoices: salesInvoices.length,
        purchaseInvoices: purchaseInvoices.length,
        cashTransactions: cashTransactions.length,
        journalEntries: journalEntries.length,
      },
      data: {
        users,
        settings,
        accounts,
        contacts,
        categories,
        items,
        fixedAssets,
        assetDepreciations,
        salesInvoices,
        purchaseInvoices,
        cashTransactions,
        journalEntries,
        inventoryTransactions,
        profitSharingHistories,
        auditLogs,
      },
    };

    const outPath = path.join(__dirname, '..', 'prisma', 'data-backup.json');
    fs.writeFileSync(outPath, JSON.stringify(dataDump, null, 2), 'utf-8');

    console.log(`✅ Sukses! Data berhasil diekspor ke: ${outPath}`);
    console.log('📊 Ringkasan Data:', dataDump.counts);
  } catch (err) {
    console.error('❌ Gagal mengekspor data:', err);
  } finally {
    await prisma.$disconnect();
  }
}

exportAllData();
