// scripts/test-phase2.js
// Pengujian Integrasi Otomatis Fase 2: TUMANDI UI & Master Data Services

const { prisma } = require('../lib/prisma');
const { loginAdmin } = require('../lib/auth');
const { validateProfitSharing } = require('../lib/accounting');
const { Decimal } = require('decimal.js');

async function runPhase2Tests() {
  console.log('🧪 ========================================================');
  console.log('🧪 MEMULAI PENGUJIAN OTOMATIS FASE 2: AUTH & MASTER DATA');
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
    // UJI 1: AUTENTIKASI ADMIN
    // ----------------------------------------------------
    console.log('--- 1. UJI AUTENTIKASI ADMIN ---');
    const authSuccess = await loginAdmin('admin', 'admin123');
    assert(authSuccess.success === true && authSuccess.user.role === 'ADMIN', 'Login admin dengan password benar harus SUKSES');

    const authFail = await loginAdmin('admin', 'passwordSalah');
    assert(authFail.success === false, 'Login admin dengan password salah harus DITOLAK');

    const authNonExistent = await loginAdmin('userGhaib', 'admin123');
    assert(authNonExistent.success === false, 'Login username tidak terdaftar harus DITOLAK');

    // ----------------------------------------------------
    // UJI 2: MASTER BAGAN AKUN (CHART OF ACCOUNTS)
    // ----------------------------------------------------
    console.log('\n--- 2. UJI MASTER BAGAN AKUN (COA) ---');
    const testCode = '1-1199';
    // Hapus dulu jika sudah ada dari tes sebelumnya
    await prisma.account.deleteMany({ where: { code: testCode } });

    const newAcc = await prisma.account.create({
      data: {
        code: testCode,
        name: 'Kas Uji Coba Unit Sablon',
        category: 'ASSET',
        subCategory: 'KAS_BANK',
        normalBalance: 'DEBIT',
      },
    });
    assert(newAcc.id !== undefined && newAcc.code === testCode, 'Tambah akun baru berhasil disimpan');

    // Uji proteksi kode akun duplikat
    let duplicateRejected = false;
    try {
      await prisma.account.create({
        data: {
          code: testCode,
          name: 'Akun Duplikat Ilegal',
          category: 'ASSET',
          subCategory: 'KAS_BANK',
          normalBalance: 'DEBIT',
        },
      });
    } catch (e) {
      duplicateRejected = true;
    }
    assert(duplicateRejected === true, 'Sistem berhasil menolak duplikasi kode akun');

    // Bersihkan data tes
    await prisma.account.delete({ where: { id: newAcc.id } });

    // ----------------------------------------------------
    // UJI 3: MASTER KONTAK (PELANGGAN & PEMASOK)
    // ----------------------------------------------------
    console.log('\n--- 3. UJI MASTER KONTAK PELANGGAN & PEMASOK ---');
    const testContactCode = 'PLG-TEST-001';
    await prisma.contact.deleteMany({ where: { code: testContactCode } });

    const newContact = await prisma.contact.create({
      data: {
        code: testContactCode,
        name: 'Komunitas Pemuda Doyo Lama',
        type: 'CUSTOMER',
        phone: '081234567890',
        address: 'Doyo Lama, Waibu',
      },
    });
    assert(newContact.id !== undefined && newContact.name === 'Komunitas Pemuda Doyo Lama', 'Tambah kontak pelanggan berhasil');
    await prisma.contact.delete({ where: { id: newContact.id } });

    // ----------------------------------------------------
    // UJI 4: MASTER BAHAN SABLON & ITEM PRODUK
    // ----------------------------------------------------
    console.log('\n--- 4. UJI MASTER BAHAN BAKU SABLON & HARGA ---');
    const category = await prisma.itemCategory.findFirst({ where: { type: 'RAW_MATERIAL' } });
    const testItemCode = 'KP-TEST-01';
    await prisma.item.deleteMany({ where: { code: testItemCode } });

    const newItem = await prisma.item.create({
      data: {
        code: testItemCode,
        name: 'Kaos Uji Coba Combed 24s Navy (M)',
        type: 'RAW_MATERIAL',
        categoryId: category.id,
        unit: 'Pcs',
        costPrice: '42000.00',
        sellingPrice: '65000.00',
        minStockAlert: '10.00',
      },
    });
    assert(newItem.id !== undefined, 'Tambah master item bahan kaos berhasil');
    assert(new Decimal(newItem.costPrice).equals('42000'), 'Harga beli (HPP) tersimpan presisi Rp 42.000,00');
    assert(new Decimal(newItem.sellingPrice).equals('65000'), 'Harga jual tersimpan presisi Rp 65.000,00');
    await prisma.item.delete({ where: { id: newItem.id } });

    // ----------------------------------------------------
    // UJI 5: PENGATURAN BUMKAM & VALIDASI MUTLAK 100% BAGI HASIL
    // ----------------------------------------------------
    console.log('\n--- 5. UJI PENGATURAN BUMKAM & PERSENTASE BAGI HASIL DINAMIS ---');
    // Skenario: Update persentase sesuai Peraturan Kampung baru
    // PADKam: 45%, Cadangan: 25%, Pengurus: 20%, Sosial: 10% (Total: 100%)
    const validP = validateProfitSharing(45, 25, 20, 10);
    assert(validP.isValid === true, 'Kombinasi 45% + 25% + 20% + 10% = 100% valid');

    const updatedSetting = await prisma.setting.update({
      where: { id: 1 },
      data: {
        padkamPercent: '45.00',
        reserveFundPercent: '25.00',
        managementBonusPercent: '20.00',
        socialFundPercent: '10.00',
      },
    });
    assert(new Decimal(updatedSetting.padkamPercent).equals('45'), 'PADKam berhasil diperbarui menjadi 45% di database');
    assert(new Decimal(updatedSetting.reserveFundPercent).equals('25'), 'Cadangan modal berhasil diperbarui menjadi 25% di database');

    // Kembalikan ke rasio standar 40-30-20-10
    await prisma.setting.update({
      where: { id: 1 },
      data: {
        padkamPercent: '40.00',
        reserveFundPercent: '30.00',
        managementBonusPercent: '20.00',
        socialFundPercent: '10.00',
      },
    });

  } catch (err) {
    console.error('💥 Terjadi kesalahan tidak terduga saat pengujian Fase 2:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n========================================================');
  console.log(`📊 HASIL PENGUJIAN FASE 2: ${passed} BERHASIL, ${failed} GAGAL`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests();
