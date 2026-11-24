'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Building2,
  Scale,
  FileSpreadsheet,
  Coins,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/';

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const accountingStandards = [
    {
      title: 'SAK EMKM (Ikatan Akuntan Indonesia)',
      desc: 'Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah untuk penyusunan Laporan Laba Rugi, Posisi Keuangan (Neraca), dan Arus Kas.',
      icon: Scale,
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
    },
    {
      title: 'Kepmendesa PDTT No. 136/2022 & PP 11/2021',
      desc: 'Kepatuhan tata kelola hukum dan pedoman teknis pertanggungjawaban keuangan BUM Desa / BUMKam kepada Musyawarah Kampung Doyo Lama.',
      icon: Building2,
      color: 'text-blue-400 bg-blue-950/60 border-blue-800/60',
    },
    {
      title: 'Prinsip Double-Entry Bookkeeping',
      desc: 'Setiap transaksi wajib mencatat sisi Debit dan Kredit yang seimbang. Sistem menolak transaksi yang tidak balance (selisih > 0).',
      icon: Layers,
      color: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
    },
    {
      title: 'Akurasi Nominal Tipe DECIMAL',
      desc: 'Bebas kesalahan pembulatan biner float. Seluruh nilai moneter dikalkulasi dengan presisi mutlak berbasis desimal hingga pecahan rupiah.',
      icon: Coins,
      color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60',
    },
    {
      title: 'Moving Average Cost & Otomasi HPP Sablon',
      desc: 'Penghitungan harga pokok bahan sablon dan kaos polos secara rata-rata bergerak serta jurnal pemotongan HPP otomatis saat penjualan.',
      icon: Package,
      color: 'text-purple-400 bg-purple-950/60 border-purple-800/60',
    },
    {
      title: 'Penyusutan Aset Tetap Garis Lurus & Period Lock',
      desc: 'Depresiasi otomatis bulanan mesin heat press/DTF dan proteksi kunci periode tutup buku guna menjaga integritas data audit trail.',
      icon: Wrench,
      color: 'text-teal-400 bg-teal-950/60 border-teal-800/60',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Login gagal. Periksa kembali username dan kata sandi Anda.');
        setIsLoading(false);
        return;
      }

      // Berhasil login -> redirect ke dashboard atau target URL
      router.push(redirectTarget);
      router.refresh();
    } catch (err) {
      setError('Terjadi kesalahan koneksi ke server. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar Branding */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-950">
            TM
          </div>
          <div>
            <span className="font-extrabold text-base tracking-wide text-white flex items-center gap-2">
              TUMANDI <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">v1.0 SAK EMKM</span>
            </span>
            <p className="text-xs text-slate-400">BUMKam Tungkuwiri Mandiri • Kampung Doyo Lama</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Sistem Pembukuan Terotentikasi & Tervalidasi</span>
        </div>
      </header>

      {/* Main Container: 2 Kolom (Kiri: Penjelasan Aplikasi & Standar, Kanan: Form Login) */}
      <div className="max-w-7xl mx-auto w-full px-4 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center flex-1">
        {/* KOLOM KIRI: PENJELASAN APLIKASI & STANDAR AKUNTANSI (7 KOLOM) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sistem Informasi Akuntansi & Operasional Terpadu</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Aplikasi Keuangan <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">TUMANDI</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              <strong>TUMANDI (*Tungkuwiri Mandiri Digital*)</strong> adalah platform akuntansi dan manajemen operasional workshop pencetakan baju kaos (sablon) milik <strong>BUMKam Tungkuwiri Mandiri</strong>, berkedudukan di <strong>Kampung Doyo Lama, Distrik Waibu, Kabupaten Jayapura</strong>.
            </p>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
              Dibangun untuk mendigitalkan seluruh siklus bisnis: mulai dari pesanan sablon, penerimaan kas, restock bahan baku kaos/tinta, pencatatan aset mesin press, hingga penyusunan laporan keuangan otomatis dan pembagian hasil usaha (PADKam).
            </p>
          </div>

          {/* Grid Standar Akuntansi & Regulasi */}
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Standar Akuntansi & Regulasi yang Diterapkan:</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {accountingStandards.map((std, idx) => {
                const Icon = std.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-1.5"
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg border ${std.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-bold text-slate-200">{std.title}</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal pl-8">
                      {std.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Catatan Alokasi PADKam 100% */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-200 flex items-start space-x-3">
            <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-300">Alokasi Hasil Usaha (PADKam Dinamis):</p>
              <p className="text-[11px] text-emerald-200/80 mt-0.5 leading-relaxed">
                Persentase PADKam Kampung Doyo Lama, Cadangan Modal, Insentif Pengurus, dan Dana Sosial dikonfigurasi fleksibel sesuai AD/ART BUMKam serta diverifikasi wajib berjumlah tepat <strong>100,00%</strong> sebelum disimpan.
              </p>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: FORM MASUK ADMINISTRATOR (5 KOLOM) */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-2xl relative overflow-hidden">
            {/* Ambient Top Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>

            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Masuk ke Sistem</h2>
              <p className="text-xs text-slate-400 mt-1">
                Silakan masukkan kredensial administrator untuk mengakses seluruh modul keuangan dan transaksi.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username Administrator
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-white transition-all font-medium placeholder-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-white transition-all font-medium placeholder-slate-600"
                  />
                </div>
              </div>

              {/* Default Credentials Reminder Box */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <div>
                  <span className="text-slate-500">Kredensial Default:</span>{' '}
                  <span className="font-mono text-emerald-400 font-semibold">admin</span> /{' '}
                  <span className="font-mono text-emerald-400 font-semibold">admin123</span>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Admin Only</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-lg shadow-emerald-900/40 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <span>{isLoading ? 'Memverifikasi Kredensial...' : 'Masuk ke Aplikasi TUMANDI'}</span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-500">
                Akses Terproteksi • Enkripsi Bcrypt & Sesi HMAC SHA-256
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-center text-xs text-slate-500">
        <p>
          © 2026 <strong>BUMKam Tungkuwiri Mandiri</strong> • Kampung Doyo Lama, Distrik Waibu, Kabupaten Jayapura, Papua.
        </p>
        <p className="text-[11px] text-slate-600 mt-0.5">
          Sistem Keuangan Berbasis SAK EMKM & Kepmendesa PDTT No. 136/2022
        </p>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
          Memuat halaman masuk TUMANDI...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
