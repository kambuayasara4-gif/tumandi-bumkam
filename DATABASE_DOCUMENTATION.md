# Dokumentasi Struktur Basis Data TUMANDI
**Tungkuwiri Mandiri Digital (Aplikasi Keuangan BUMKam Tungkuwiri Mandiri)**  
*Kampung Doyo Lama, Distrik Waibu, Kabupaten Jayapura*

---

## 1. Ikhtisar Arsitektur Basis Data

Sistem basis data TUMANDI dirancang menggunakan **Prisma ORM** dengan engine penyimpanan lokal **SQLite** (`dev.db`) untuk tahap awal, dengan struktur tabel dan tipe data yang dirancang 100% kompatibel dan siap dimigrasikan ke **PostgreSQL** ketika sistem nantinya dipindahkan ke server cloud.

### Karakteristik Kunci:
1. **Presisi Finansial**: Seluruh kolom nominal uang menggunakan tipe data `Decimal` (didukung oleh `decimal.js`), menghindari galat pembulatan floating-point.
2. **Double-Entry Bookkeeping**: Setiap transaksi operasional (penjualan, pembelian, kas masuk/keluar, penyusutan aset) terikat dengan entitas `journal_entries` dan `journal_items` di mana $\sum \text{Debit} = \sum \text{Kredit}$.
3. **Fleksibilitas AD/ART**: Tabel `settings` menyediakan persentase pembagian hasil usaha yang dinamis (PADKam, Cadangan, Jasa Pengurus, Sosial) yang divalidasi harus berjumlah tepat 100,00% sebelum disimpan.
4. **Karakteristik Usaha Sablon Kaos**: Tabel `items` dan `inventory_transactions` mendukung penelusuran bahan baku (kaos polos combed berbagai ukuran, tinta plastisol, transfer film DTF), pemantauan HPP otomatis, dan jasa pengerjaan kustom.

---

## 2. Diagram Relasi Antar Tabel (Entity Relationship)

```
[users] ──< [audit_logs]
   │
[settings] (Konfigurasi BUMKam, PADKam fleksibel, lockDate)
   │
[accounts] (CoA SAK EMKM: Kas, Piutang, Persediaan, Modal, Pendapatan, HPP, Beban)
   │──< [journal_items] >── [journal_entries]
   │                              │
   │                              ├──< [sales_invoices] ──< [sales_invoice_items] >── [items]
   │                              ├──< [purchase_invoices] ──< [purchase_invoice_items] >── [items]
   │                              ├──< [cash_bank_transactions]
   │                              ├──< [asset_depreciations] >── [fixed_assets]
   │                              └──< [profit_sharing_histories]
   │
[contacts] ──< [sales_invoices]
[contacts] ──< [purchase_invoices]
[item_categories] ──< [items] ──< [inventory_transactions]
```

---

## 3. Rincian Tabel dan Fungsinya

### A. Kelompok Pengaturan & Pengguna

#### 1. Tabel `users`
Menyimpan kredensial dan hak akses administrator BUMKam.
- `id` (String, PK, UUID): Pengenal unik pengguna.
- `username` (String, Unique): Nama login admin (default: `admin`).
- `passwordHash` (String): Hash kata sandi terenkripsi (Bcrypt).
- `fullName` (String): Nama lengkap pengurus/pengelola BUMKam.
- `role` (String, default `ADMIN`): Tingkat hak akses.
- `isActive` (Boolean, default `true`): Status keaktifan akun.
- `createdAt`, `updatedAt` (DateTime): Waktu pembuatan dan pembaruan.

#### 2. Tabel `settings`
Menyimpan profil resmi BUMKam dan konfigurasi aturan bagi hasil usaha yang fleksibel.
- `id` (Int, PK, default 1): ID baris tunggal konfigurasi.
- `bumkamName` (String): "BUMKam Tungkuwiri Mandiri".
- `villageName` (String): "Kampung Doyo Lama".
- `districtName` (String): "Distrik Waibu".
- `regencyName` (String): "Kabupaten Jayapura".
- `businessType` (String): "Pencetakan Baju Kaos (Sablon) & Konveksi".
- `padkamPercent` (Decimal, default 40.00): Alokasi Pendapatan Asli Desa/Kampung Doyo Lama.
- `reserveFundPercent` (Decimal, default 30.00): Alokasi Cadangan Modal BUMKam.
- `managementBonusPercent` (Decimal, default 20.00): Alokasi Jasa Pengurus & Karyawan.
- `socialFundPercent` (Decimal, default 10.00): Alokasi Dana Sosial & Pendidikan Kampung.
- `profitSharingActive` (Boolean): Mengaktifkan/menonaktifkan modul bagi hasil.
- `fiscalYear` (Int): Tahun buku berjalan (misal 2026).
- `lockDate` (DateTime, Nullable): Batas tanggal tutup buku. Transaksi sebelum tanggal ini tidak dapat diubah.

---

### B. Kelompok Akuntansi & Buku Besar (Core Ledger)

#### 3. Tabel `accounts` (Bagan Akun Standar / Chart of Accounts)
Daftar kode akun akuntansi berstandar SAK EMKM dan Kepmendesa No. 136/2022.
- `id` (String, PK, UUID): ID unik akun.
- `code` (String, Unique): Nomor kode akun (misal `1-1100`, `1-1310`, `4-2000`).
- `name` (String): Nama akun (misal "Kas Operasional Workshop", "Pendapatan Jasa Sablon").
- `category` (String): Kategori utama (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`).
- `subCategory` (String): Pengelompokan detail (`KAS_BANK`, `PIUTANG`, `PERSEDIAAN`, `ASET_TETAP`, `HUTANG_LANCAR`, `MODAL_DESA`, `HPP`, dll.).
- `normalBalance` (String): Saldo normal (`DEBIT` atau `CREDIT`).
- `isHeader` (Boolean): Penanda akun induk/grup.
- `parentId` (String, FK Nullable): Relasi hierarki ke akun induk.
- `isActive` (Boolean): Status aktif akun.

#### 4. Tabel `journal_entries`
Kepala jurnal transaksi akuntansi (*Journal Header*).
- `id` (String, PK, UUID): ID unik entri jurnal.
- `entryNumber` (String, Unique): Nomor bukti jurnal berurutan (misal `JU/2026/04/0001`).
- `date` (DateTime): Tanggal efektif pembukuan transaksi.
- `referenceType` (String): Sumber transaksi (`SALES`, `PURCHASE`, `CASH_IN`, `CASH_OUT`, `TRANSFER`, `DEPRECIATION`, `PROFIT_SHARING`, `MANUAL`).
- `referenceId` (String, Nullable): ID dokumen referensi sumber.
- `description` (String): Keterangan ringkas transaksi.
- `totalDebit` (Decimal): Total nominal sisi Debit.
- `totalCredit` (Decimal): Total nominal sisi Kredit (Wajib sama persis dengan `totalDebit`).
- `isPosted` (Boolean, default `true`): Status posting buku besar.

#### 5. Tabel `journal_items`
Rincian baris jurnal per akun (*Journal Lines*).
- `id` (String, PK, UUID): ID unik baris jurnal.
- `journalEntryId` (String, FK): Terhubung ke `journal_entries.id`.
- `accountId` (String, FK): Terhubung ke `accounts.id`.
- `debit` (Decimal, default 0.00): Nominal debet.
- `credit` (Decimal, default 0.00): Nominal kredit.
- `memo` (String, Nullable): Catatan per baris akun.

---

### C. Kelompok Master Data & Persediaan Sablon

#### 6. Tabel `contacts`
Buku daftar pelanggan kaos/sablon dan pemasok bahan baku.
- `id` (String, PK, UUID): ID unik kontak.
- `code` (String, Unique): Kode kontak (`PLG-0001`, `SPL-0001`).
- `name` (String): Nama orang, komunitas, dinas, atau vendor.
- `type` (String): Jenis kontak (`CUSTOMER`, `SUPPLIER`, `BOTH`).
- `phone`, `email`, `address`, `notes` (String): Data komunikasi dan alamat.

#### 7. Tabel `item_categories`
Kategori pengelompokan produk dan bahan sablon.
- `id` (String, PK, UUID): ID kategori.
- `name` (String, Unique): "Kaos Polos", "Tinta & Kimia Sablon", "Bahan Cetak DTF", "Bahan Pembantu & Kemasan", "Kaos Sablon Siap Jual", "Jasa Sablon".
- `type` (String): Jenis klasifikasi (`RAW_MATERIAL`, `FINISHED_GOOD`, `SUPPLIES`, `SERVICE`).

#### 8. Tabel `items`
Daftar seluruh item barang fisik dan layanan sablon.
- `id` (String, PK, UUID): ID item.
- `code` (String, Unique): Kode item (misal `KP-30S-BLK-L`, `TNT-PLST-BLK`, `JS-DTF-A4`).
- `name` (String): Nama lengkap item.
- `type` (String): Klasifikasi item (`RAW_MATERIAL`, `FINISHED_GOOD`, `SUPPLIES`, `SERVICE`).
- `categoryId` (String, FK): Terhubung ke `item_categories.id`.
- `unit` (String): Satuan ukuran (`Pcs`, `Lusin`, `Kg`, `Roll`, `Lembar`).
- `costPrice` (Decimal): Biaya perolehan / HPP standar.
- `sellingPrice` (Decimal): Harga jual standar ke pelanggan.
- `currentStock` (Decimal): Saldo stok fisik tersedia.
- `minStockAlert` (Decimal): Batas minimum peringatan stok menipis.

#### 9. Tabel `inventory_transactions`
Buku kartu stok yang mencatat seluruh riwayat mutasi fisik barang.
- `id` (String, PK, UUID): ID mutasi stok.
- `date` (DateTime): Waktu mutasi terjadi.
- `itemId` (String, FK): Terhubung ke `items.id`.
- `type` (String): Jenis mutasi (`PURCHASE_IN`, `SALES_OUT`, `PRODUCTION_IN`, `USAGE_OUT`, `OPNAME_ADJUSTMENT`).
- `quantity` (Decimal): Kuantitas mutasi (+ untuk penambahan stok, - untuk pengeluaran).
- `unitCost` (Decimal): Biaya pokok satuan saat mutasi.
- `totalCost` (Decimal): Total nilai moneter pergerakan stok.
- `referenceType`, `referenceId`: Referensi ke faktur pembelian atau penjualan.

---

### D. Kelompok Operasional (Penjualan, Pembelian, Kas/Bank)

#### 10. Tabel `sales_invoices` & `sales_invoice_items`
Mencatat pesanan kaos sablon dan penjualan langsung.
- Mendukung pembayaran lunas maupun bertahap (Uang Muka / DP untuk order kustom komunitas/instansi).
- Status pembayaran: `UNPAID` (Belum Bayar), `PARTIAL` (Sudah DP), `PAID` (Lunas).
- Terhubung otomatis dengan `journal_entries` untuk pengakuan Pendapatan dan HPP.

#### 11. Tabel `purchase_invoices` & `purchase_invoice_items`
Mencatat pengadaan bahan baku kaos polos, tinta, dan film sablon dari pemasok.
- Mengubah kuantitas stok di tabel `items` secara otomatis saat transaksi diposting.
- Terhubung otomatis dengan `journal_entries` (Debit Persediaan, Kredit Kas/Utang Usaha).

#### 12. Tabel `cash_bank_transactions`
Mencatat mutasi kas tunai workshop dan rekening bank resmi BUMKam.
- Tipe transaksi: `IN` (Penerimaan Lainnya), `OUT` (Pengeluaran Operasional), `TRANSFER` (Pindah Dana antar Rekening).
- Terhubung langsung dengan akun kas utama dan akun lawan beban/pendapatan.

---

### E. Kelompok Aset Tetap & Hasil Usaha

#### 13. Tabel `fixed_assets` & `asset_depreciations`
Mencatat mesin sablon (Heat Press, DTF, Meja Sablon, Komputer) dan penyusutan otomatis.
- Menghitung penyusutan bulanan metode Garis Lurus:
  $$\text{Penyusutan Bulanan} = \frac{\text{Harga Perolehan} - \text{Nilai Sisa}}{\text{Masa Manfaat (Bulan)}}$$
- Setiap jadwal penyusutan bulanan otomatis membuat jurnal di `journal_entries` (Debit Beban Penyusutan, Kredit Akumulasi Penyusutan).

#### 14. Tabel `profit_sharing_histories`
Mencatat penetapan pembagian laba bersih tahunan berdasarkan persentase AD/ART:
- Setoran PADKam ke Kas Kampung Doyo Lama.
- Alokasi Cadangan Modal BUMKam.
- Alokasi Jasa Pengurus & Karyawan.
- Alokasi Dana Sosial & Pendidikan Kampung Doyo Lama.

#### 15. Tabel `audit_logs`
Merekam jejak audit digital: siapa pengguna yang mengeksekusi aksi, jenis aksi (`CREATE`, `UPDATE`, `POST`, `BACKUP`), dan rincian perubahan untuk mencegah kecurangan (*fraud*).

---

## 4. Panduan Migrasi ke PostgreSQL (Masa Mendatang)

Jika suatu saat BUMKam Tungkuwiri Mandiri memutuskan untuk memindahkan aplikasi TUMANDI ke server online (VPS atau Supabase PostgreSQL), langkah migrasi sangat sederhana:
1. Ubah baris pertama `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Isi nilai `DATABASE_URL` di file `.env` dengan kredensial PostgreSQL online.
3. Jalankan `npx prisma db push` atau `npx prisma migrate dev`.
4. Seluruh tipe data `Decimal`, `DateTime`, dan relasi foreign key akan langsung terpeta sempurna ke PostgreSQL tanpa ada perubahan kode aplikasi.
