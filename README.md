# 🏛️ TUMANDI (Tungkuwiri Mandiri Digital)
### Sistem Informasi Akuntansi & Keuangan Workshop Sablon BUMKam Tungkuwiri Mandiri
*Kampung Doyo Lama, Distrik Waibu, Kabupaten Jayapura, Provinsi Papua*

---

## 📌 Tentang Aplikasi

**TUMANDI** (*Tungkuwiri Mandiri Digital*) adalah aplikasi tata kelola keuangan dan operasional digital yang dikembangkan secara khusus untuk **BUMKam Tungkuwiri Mandiri**, unit usaha percetakan baju kaos (sablon DTF & manual), konveksi, dan merchandise kampung di Kampung Doyo Lama.

Sistem ini mentransformasikan pencatatan manual di buku kas menjadi sistem akuntansi digital yang akurat, transparan, dan terstandar, sesuai regulasi perundang-undangan dan pedoman akuntansi yang berlaku bagi BUM Desa / BUMKam di Indonesia.

---

## ⚖️ Standar Akuntansi & Regulasi yang Diterapkan

1. **SAK EMKM (Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah - IAI)**:
   - Penyusunan **Laporan Laba Rugi**, **Laporan Posisi Keuangan (Neraca)**, dan **Laporan Arus Kas** (Metode Langsung).
2. **Kepmendesa PDTT No. 136 Tahun 2022**:
   - Panduan teknis pengelolaan keuangan dan format pelaporan pertanggungjawaban BUM Desa/BUMKam kepada Musyawarah Kampung.
3. **PP No. 11 Tahun 2021**:
   - Tata kelola hukum operasional Badan Usaha Milik Desa / BUMKam.
4. **Double-Entry Bookkeeping Ketat**:
   - Setiap transaksi wajib membukukan sisi Debit dan Kredit yang seimbang ($\sum \text{Debit} = \sum \text{Credit}$). Sistem menolak posting transaksi yang tidak balance.
5. **Akurasi Moneter Tipe DECIMAL**:
   - Bebas kesalahan pembulatan biner float. Seluruh perhitungan uang menggunakan tipe data `Decimal` presisi tinggi.
6. **Moving Average Cost (Harga Pokok Rata-Rata)**:
   - Kalkulasi otomatis HPP bahan baku kaos dan tinta sablon saat restock, serta pemotongan HPP otomatis saat faktur penjualan diterbitkan.
7. **Penyusutan Aset Tetap Garis Lurus (Straight-Line Depreciation)**:
   - Perhitungan beban penyusutan mesin heat press, printer sablon, dan komputer desain secara otomatis per bulan.
8. **Alokasi Pembagian Hasil Usaha Dinamis 100%**:
   - Menghitung proporsi laba bersih untuk **PADKam Kampung Doyo Lama**, **Cadangan Modal**, **Jasa Pengurus**, dan **Dana Sosial** dengan validasi mutlak total 100,00%.
9. **Kunci Periode (*Lock Period*) & Jejak Audit**:
   - Perlindungan audit trail agar transaksi bertanggal lampau tidak dapat dimanipulasi pasca penutupan buku.

---

## 🚀 Fitur-Fitur Utama

- 📊 **Dashboard Eksekutif**: Real-time KPI omzet sablon, laba bersih berjalan, saldo kas & bank, serta peringatan stok kritis.
- 👕 **Penjualan & Cetak Invoice**: Pencatatan pesanan kaos sablon, uang muka (DP), piutang tempo, dan cetak faktur resmi ber-kop surat.
- 📦 **Pembelian & Manajemen Persediaan**: Pengadaan kaos polos, tinta DTF, pet film, kartu stok mutasi, dan penyesuaian opname fisik.
- 💳 **Kas & Bank**: Bukti Kas Masuk (BKM), Bukti Kas Keluar (BKK), dan Transfer antarrekening bank BUMKam.
- 📑 **Jurnal Umum & Buku Besar**: Jurnal penyesuaian multi-baris, buku besar per akun dengan saldo berjalan (*running balance*).
- ⚙️ **Aset Tetap & Depresiasi**: Registrasi mesin sablon, nilai perolehan, nilai residu, dan eksekusi penyusutan 1-klik.
- 📈 **Laporan Keuangan & Hasil Usaha**:
  - Laporan Laba Rugi
  - Laporan Posisi Keuangan (Neraca Seimbang Selisih Rp 0)
  - Laporan Arus Kas
  - Laporan Alokasi PADKam
  - Rekapitulasi Produk Sablon Terlaris & Pelanggan
  - **Ekspor Excel (.xlsx)** & **Cetak Dokumen PDF Resmi**
- 💾 **Pencadangan & Pemulihan (Backup & Restore)**: Unduh salinan database SQLite 1-klik dan pemulihan data instan dengan *safety backup*.

---

## 🛠️ Tumpukan Teknologi (Tech Stack)

- **Frontend / Framework**: Next.js 15 (App Router), React 19, Tailwind CSS, Lucide React
- **Backend / API**: Next.js Route Handlers (RESTful)
- **Database ORM**: Prisma ORM (Mendukung SQLite lokal & PostgreSQL Cloud)
- **Keamanan**: Bcrypt Password Hashing, HMAC SHA-256 Session Cookie, Protected Route Middleware
- **Kalkulasi Finansial**: `decimal.js`
- **Ekspor Dokumen**: SheetJS (`xlsx`)

---

## 💻 Panduan Menjalankan Secara Lokal

```bash
# 1. Masuk ke direktori proyek
cd tumandi

# 2. Pasang dependensi
npm install

# 3. Sinkronkan database SQLite
npm run db:push

# 4. Inisialisasi data awal (CoA, Kategori, Item, Admin)
npm run db:seed

# 5. Jalankan server lokal
npm run dev
```

Buka peramban pada **`http://localhost:3000`**.
- **Username Default**: `admin`
- **Kata Sandi Default**: `admin123`

---

## ☁️ Panduan Deploy ke Cloud (Online 24 Jam)

Aplikasi ini siap di-deploy ke **Vercel** dengan database PostgreSQL di **Neon.tech** atau **Supabase**:

1. Ubah provider skema ke PostgreSQL:
   ```bash
   node scripts/switch-db.js postgresql
   ```
2. Buat database di [Neon.tech](https://neon.tech) atau [Supabase](https://supabase.com), lalu atur variabel lingkungan di Vercel:
   - `DATABASE_URL`: `postgresql://user:pass@host/db?sslmode=require`
   - `SESSION_SECRET`: `[string-rahasia-acak]`
   - `COOKIE_SECURE`: `true`
3. Impor data yang sudah ada:
   ```bash
   npm run db:import
   ```

---

## 📄 Hak Cipta & Pengembang

© 2026 **BUMKam Tungkuwiri Mandiri**  
Kampung Doyo Lama, Distrik Waibu, Kabupaten Jayapura, Provinsi Papua.
