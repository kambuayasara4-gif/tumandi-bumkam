// prisma/seed.js
// Seeding data awal untuk aplikasi TUMANDI (BUMKam Tungkuwiri Mandiri)

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai pengisian data awal (seeding)...');

  // 1. PENGGUNA DEFAULT (ADMIN)
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: passwordHash,
      fullName: 'Pengelola BUMKam Tungkuwiri Mandiri',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin default dibuat: username="admin", password="admin123"');

  // 2. PENGATURAN BUMKAM & PERSENTASE BAGI HASIL
  const setting = await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      bumkamName: 'BUMKam Tungkuwiri Mandiri',
      villageName: 'Kampung Doyo Lama',
      districtName: 'Distrik Waibu',
      regencyName: 'Kabupaten Jayapura',
      businessType: 'Pencetakan Baju Kaos (Sablon) & Konveksi',
      address: 'Kampung Doyo Lama, Distrik Waibu, Kabupaten Jayapura, Papua',
      phone: '0812-XXXX-XXXX',
      email: 'bumkam.tungkuwiri@gmail.com',
      profitSharingActive: true,
      padkamPercent: 40.00,
      reserveFundPercent: 30.00,
      managementBonusPercent: 20.00,
      socialFundPercent: 10.00,
      fiscalYear: 2026,
    },
  });
  console.log('✅ Pengaturan BUMKam & Persentase Bagi Hasil (Total 100%) tersimpan.');

  // 3. BAGAN AKUN STANDAR (CHART OF ACCOUNTS - SAK EMKM BUMKAM)
  const accountsData = [
    // ASET LANCAR
    { code: '1-1100', name: 'Kas Operasional Workshop', category: 'ASSET', subCategory: 'KAS_BANK', normalBalance: 'DEBIT' },
    { code: '1-1110', name: 'Bank BUMKam (BPD Papua / BRI)', category: 'ASSET', subCategory: 'KAS_BANK', normalBalance: 'DEBIT' },
    { code: '1-1200', name: 'Piutang Usaha Pelanggan Sablon', category: 'ASSET', subCategory: 'PIUTANG', normalBalance: 'DEBIT' },
    { code: '1-1310', name: 'Persediaan Bahan Baku (Kaos Polos)', category: 'ASSET', subCategory: 'PERSEDIAAN', normalBalance: 'DEBIT' },
    { code: '1-1320', name: 'Persediaan Bahan Baku (Tinta & Kimia)', category: 'ASSET', subCategory: 'PERSEDIAAN', normalBalance: 'DEBIT' },
    { code: '1-1330', name: 'Persediaan Bahan Cetak (Film & Lem DTF)', category: 'ASSET', subCategory: 'PERSEDIAAN', normalBalance: 'DEBIT' },
    { code: '1-1340', name: 'Persediaan Bahan Pembantu & Kemasan', category: 'ASSET', subCategory: 'PERSEDIAAN', normalBalance: 'DEBIT' },
    { code: '1-1350', name: 'Persediaan Kaos Sablon Siap Jual', category: 'ASSET', subCategory: 'PERSEDIAAN', normalBalance: 'DEBIT' },
    { code: '1-1400', name: 'Uang Muka Pembelian Bahan', category: 'ASSET', subCategory: 'ASET_LANCAR_LAIN', normalBalance: 'DEBIT' },

    // ASET TETAP
    { code: '1-2100', name: 'Mesin & Peralatan Sablon (Heat Press, DTF)', category: 'ASSET', subCategory: 'ASET_TETAP', normalBalance: 'DEBIT' },
    { code: '1-2110', name: 'Akumulasi Penyusutan Mesin Sablon', category: 'ASSET', subCategory: 'AKUMULASI_PENYUSUTAN', normalBalance: 'CREDIT' },
    { code: '1-2200', name: 'Meja Sablon Manual & Screen', category: 'ASSET', subCategory: 'ASET_TETAP', normalBalance: 'DEBIT' },
    { code: '1-2210', name: 'Akumulasi Penyusutan Meja Sablon', category: 'ASSET', subCategory: 'AKUMULASI_PENYUSUTAN', normalBalance: 'CREDIT' },
    { code: '1-2300', name: 'Peralatan Komputer & Desain', category: 'ASSET', subCategory: 'ASET_TETAP', normalBalance: 'DEBIT' },
    { code: '1-2310', name: 'Akumulasi Penyusutan Komputer', category: 'ASSET', subCategory: 'AKUMULASI_PENYUSUTAN', normalBalance: 'CREDIT' },

    // KEWAJIBAN / LIABILITAS
    { code: '2-1100', name: 'Utang Usaha Pemasok Bahan', category: 'LIABILITY', subCategory: 'KEWAJIBAN_LANCAR', normalBalance: 'CREDIT' },
    { code: '2-1200', name: 'Pendapatan Diterima di Muka (DP Pesanan)', category: 'LIABILITY', subCategory: 'KEWAJIBAN_LANCAR', normalBalance: 'CREDIT' },
    { code: '2-1300', name: 'Beban Yang Masih Harus Dibayar', category: 'LIABILITY', subCategory: 'KEWAJIBAN_LANCAR', normalBalance: 'CREDIT' },
    { code: '2-1500', name: 'Utang Bagi Hasil PADKam (Kampung Doyo Lama)', category: 'LIABILITY', subCategory: 'KEWAJIBAN_LANCAR', normalBalance: 'CREDIT' },
    { code: '2-1600', name: 'Utang Jasa Pengurus & Karyawan', category: 'LIABILITY', subCategory: 'KEWAJIBAN_LANCAR', normalBalance: 'CREDIT' },

    // EKUITAS / MODAL
    { code: '3-1000', name: 'Modal Penyertaan Kampung Doyo Lama', category: 'EQUITY', subCategory: 'MODAL_DESA', normalBalance: 'CREDIT' },
    { code: '3-2000', name: 'Modal Penyertaan Masyarakat', category: 'EQUITY', subCategory: 'MODAL_MASYARAKAT', normalBalance: 'CREDIT' },
    { code: '3-3000', name: 'Saldo Laba Ditahan Tahun Lalu', category: 'EQUITY', subCategory: 'LABA_DITAHAN', normalBalance: 'CREDIT' },
    { code: '3-4000', name: 'Saldo Laba Periode Berjalan', category: 'EQUITY', subCategory: 'LABA_BERJALAN', normalBalance: 'CREDIT' },
    { code: '3-5000', name: 'Cadangan Umum BUMKam', category: 'EQUITY', subCategory: 'CADANGAN_MODAL', normalBalance: 'CREDIT' },

    // PENDAPATAN
    { code: '4-1000', name: 'Pendapatan Penjualan Kaos Jadi', category: 'REVENUE', subCategory: 'PENDAPATAN_OPERASIONAL', normalBalance: 'CREDIT' },
    { code: '4-2000', name: 'Pendapatan Jasa Sablon Kustom & Maklon', category: 'REVENUE', subCategory: 'PENDAPATAN_OPERASIONAL', normalBalance: 'CREDIT' },
    { code: '4-9000', name: 'Pendapatan Operasional Lainnya', category: 'REVENUE', subCategory: 'PENDAPATAN_OPERASIONAL', normalBalance: 'CREDIT' },

    // HARGA POKOK PENJUALAN (HPP)
    { code: '5-1000', name: 'Beban Pokok - Pemakaian Kaos Polos', category: 'EXPENSE', subCategory: 'HPP', normalBalance: 'DEBIT' },
    { code: '5-2000', name: 'Beban Pokok - Pemakaian Tinta & Kimia', category: 'EXPENSE', subCategory: 'HPP', normalBalance: 'DEBIT' },
    { code: '5-3000', name: 'Beban Pokok - Pemakaian Film & Lem DTF', category: 'EXPENSE', subCategory: 'HPP', normalBalance: 'DEBIT' },
    { code: '5-4000', name: 'Biaya Tenaga Kerja Langsung Sablon', category: 'EXPENSE', subCategory: 'HPP', normalBalance: 'DEBIT' },
    { code: '5-5000', name: 'Biaya Overhead Bengkel Sablon', category: 'EXPENSE', subCategory: 'HPP', normalBalance: 'DEBIT' },

    // BEBAN OPERASIONAL & ADMINISTRASI
    { code: '6-1000', name: 'Beban Gaji & Honor Pengurus BUMKam', category: 'EXPENSE', subCategory: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT' },
    { code: '6-2000', name: 'Beban Pemeliharaan & Servis Mesin', category: 'EXPENSE', subCategory: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT' },
    { code: '6-3000', name: 'Beban Listrik, Air & Kebersihan Workshop', category: 'EXPENSE', subCategory: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT' },
    { code: '6-4000', name: 'Beban Perlengkapan Toko & ATK', category: 'EXPENSE', subCategory: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT' },
    { code: '6-5000', name: 'Beban Promosi, Pulsa & Transportasi', category: 'EXPENSE', subCategory: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT' },
    { code: '6-6000', name: 'Beban Penyusutan Aset Tetap', category: 'EXPENSE', subCategory: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT' },
    { code: '6-9000', name: 'Beban Operasional Lain-lain', category: 'EXPENSE', subCategory: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT' },

    // PENDAPATAN & BEBAN NON-OPERASIONAL
    { code: '8-1000', name: 'Pendapatan Jasa Giro / Bunga Bank', category: 'REVENUE', subCategory: 'PENDAPATAN_NON_OPS', normalBalance: 'CREDIT' },
    { code: '9-1000', name: 'Beban Administrasi Bank & Pajak Bunga', category: 'EXPENSE', subCategory: 'BEBAN_NON_OPS', normalBalance: 'DEBIT' },
  ];

  for (const acc of accountsData) {
    await prisma.account.upsert({
      where: { code: acc.code },
      update: {},
      create: acc,
    });
  }
  console.log(`✅ ${accountsData.length} Bagan Akun Standar (CoA) SAK EMKM BUMKam berhasil dimuat.`);

  // 4. KATEGORI BARANG
  const categories = [
    { name: 'Kaos Polos', type: 'RAW_MATERIAL' },
    { name: 'Tinta & Kimia Sablon', type: 'RAW_MATERIAL' },
    { name: 'Bahan Cetak DTF', type: 'RAW_MATERIAL' },
    { name: 'Bahan Pembantu & Kemasan', type: 'SUPPLIES' },
    { name: 'Kaos Sablon Siap Jual', type: 'FINISHED_GOOD' },
    { name: 'Jasa Sablon Kustom', type: 'SERVICE' },
  ];

  const categoryMap = {};
  for (const cat of categories) {
    const createdCat = await prisma.itemCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categoryMap[cat.name] = createdCat.id;
  }
  console.log('✅ Kategori barang sablon & jasa berhasil dibuat.');

  // 5. MASTER BARANG SAMPEL AWAL
  const items = [
    {
      code: 'KP-30S-BLK-L',
      name: 'Kaos Polos Cotton Combed 30s Hitam (L)',
      type: 'RAW_MATERIAL',
      categoryId: categoryMap['Kaos Polos'],
      unit: 'Pcs',
      costPrice: 38000.00,
      sellingPrice: 55000.00,
      currentStock: 0,
      minStockAlert: 10,
    },
    {
      code: 'KP-30S-WHT-L',
      name: 'Kaos Polos Cotton Combed 30s Putih (L)',
      type: 'RAW_MATERIAL',
      categoryId: categoryMap['Kaos Polos'],
      unit: 'Pcs',
      costPrice: 38000.00,
      sellingPrice: 55000.00,
      currentStock: 0,
      minStockAlert: 10,
    },
    {
      code: 'TNT-PLST-BLK',
      name: 'Tinta Sablon Plastisol Hitam (1 Kg)',
      type: 'RAW_MATERIAL',
      categoryId: categoryMap['Tinta & Kimia Sablon'],
      unit: 'Kg',
      costPrice: 125000.00,
      sellingPrice: 0.00,
      currentStock: 0,
      minStockAlert: 2,
    },
    {
      code: 'DTF-FILM-100M',
      name: 'PET Film DTF Lebar 30cm (Roll 100m)',
      type: 'RAW_MATERIAL',
      categoryId: categoryMap['Bahan Cetak DTF'],
      unit: 'Roll',
      costPrice: 480000.00,
      sellingPrice: 0.00,
      currentStock: 0,
      minStockAlert: 1,
    },
    {
      code: 'JS-DTF-A4',
      name: 'Jasa Sablon DTF Ukuran A4 Custom',
      type: 'SERVICE',
      categoryId: categoryMap['Jasa Sablon Kustom'],
      unit: 'Pcs',
      costPrice: 12000.00,
      sellingPrice: 30000.00,
      currentStock: 0,
      minStockAlert: 0,
    },
  ];

  for (const item of items) {
    await prisma.item.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
  }
  console.log(`✅ ${items.length} Master Bahan Baku & Jasa Sablon awal berhasil dimuat.`);

  // 6. KONTAK AWAL (PELANGGAN & PEMASOK)
  const contacts = [
    {
      code: 'PLG-UMUM',
      name: 'Pelanggan Umum / Eceran Doyo Lama',
      type: 'CUSTOMER',
      phone: '-',
      address: 'Kampung Doyo Lama',
      notes: 'Pelanggan eceran non-member',
    },
    {
      code: 'SPL-KAOS-01',
      name: 'Distributor Kaos Polos & Tinta Sablon',
      type: 'SUPPLIER',
      phone: '0813-XXXX-XXXX',
      address: 'Sentani / Jayapura',
      notes: 'Pemasok utama bahan kaos combed dan tinta',
    },
  ];

  for (const c of contacts) {
    await prisma.contact.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }
  console.log('✅ Kontak awal (Pelanggan & Pemasok) berhasil dimuat.');

  console.log('🎉 Seeding Fase 1 selesai dengan sukses!');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
