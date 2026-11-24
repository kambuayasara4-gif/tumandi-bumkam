// scripts/import-data.js
// Import data dari backup JSON ke database baru (PostgreSQL / SQLite)

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importAllData() {
  const jsonPath = path.join(__dirname, '..', 'prisma', 'data-backup.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File data-backup.json tidak ditemukan.');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(jsonPath, 'utf-8');
  const backup = JSON.parse(fileContent);
  const data = backup.data;

  console.log('🚀 Memulai impor data ke database target...');

  try {
    // 1. Settings
    for (const s of data.settings) {
      await prisma.setting.upsert({
        where: { id: s.id },
        update: s,
        create: s,
      });
    }
    console.log(`✅ Settings diimpor (${data.settings.length} data)`);

    // 2. Users
    for (const u of data.users) {
      await prisma.user.upsert({
        where: { username: u.username },
        update: u,
        create: u,
      });
    }
    console.log(`✅ Pengguna diimpor (${data.users.length} user)`);

    // 3. Accounts (CoA)
    for (const a of data.accounts) {
      await prisma.account.upsert({
        where: { code: a.code },
        update: a,
        create: a,
      });
    }
    console.log(`✅ Bagan Akun CoA diimpor (${data.accounts.length} akun)`);

    // 4. Contacts
    for (const c of data.contacts) {
      await prisma.contact.upsert({
        where: { code: c.code },
        update: c,
        create: c,
      });
    }
    console.log(`✅ Kontak diimpor (${data.contacts.length} kontak)`);

    // 5. Item Categories
    for (const cat of data.categories) {
      await prisma.itemCategory.upsert({
        where: { id: cat.id },
        update: cat,
        create: cat,
      });
    }
    console.log(`✅ Kategori Item diimpor (${data.categories.length} kategori)`);

    // 6. Items
    for (const item of data.items) {
      await prisma.item.upsert({
        where: { code: item.code },
        update: item,
        create: item,
      });
    }
    console.log(`✅ Master Bahan & Kaos diimpor (${data.items.length} item)`);

    // 7. Fixed Assets
    for (const asset of data.fixedAssets) {
      await prisma.fixedAsset.upsert({
        where: { code: asset.code },
        update: asset,
        create: asset,
      });
    }
    console.log(`✅ Aset Tetap diimpor (${data.fixedAssets.length} aset)`);

    // 8. Journals & Items
    for (const j of data.journalEntries) {
      const items = j.items || [];
      delete j.items;
      const journal = await prisma.journalEntry.upsert({
        where: { entryNumber: j.entryNumber },
        update: j,
        create: j,
      });

      for (const it of items) {
        await prisma.journalItem.upsert({
          where: { id: it.id },
          update: it,
          create: {
            ...it,
            journalEntryId: journal.id,
          },
        });
      }
    }
    console.log(`✅ Jurnal Umum diimpor (${data.journalEntries.length} entri jurnal)`);

    console.log('\n🎉 SELURUH DATA BERHASIL DI-MIGRASI KE DATABASE TARGET!');
  } catch (err) {
    console.error('❌ Gagal mengimpor data:', err);
  } finally {
    await prisma.$disconnect();
  }
}

importAllData();
