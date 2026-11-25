'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  PieChart,
  Save,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Calendar,
  Download,
  Upload,
  Database,
  RefreshCw,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SettingsClient({ initialSettings }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    bumkamName: initialSettings?.bumkamName || 'BUMKam Tungkuwiri Mandiri',
    villageName: initialSettings?.villageName || 'Kampung Doyo Lama',
    districtName: initialSettings?.districtName || 'Distrik Waibu',
    regencyName: initialSettings?.regencyName || 'Kabupaten Jayapura',
    phone: initialSettings?.phone || '',
    email: initialSettings?.email || '',
    address: initialSettings?.address || 'Kampung Doyo Lama, Distrik Waibu, Kab. Jayapura, Papua',
    businessType: initialSettings?.businessType || 'Pencetakan Baju Kaos (Sablon) & Konveksi',
    fiscalYear: initialSettings?.fiscalYear || 2026,
    profitSharingActive: initialSettings?.profitSharingActive ?? true,
    padkamPercent: parseFloat(initialSettings?.padkamPercent?.toString() || '40'),
    reserveFundPercent: parseFloat(initialSettings?.reserveFundPercent?.toString() || '30'),
    managementBonusPercent: parseFloat(initialSettings?.managementBonusPercent?.toString() || '20'),
    socialFundPercent: parseFloat(initialSettings?.socialFundPercent?.toString() || '10'),
  });

  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState(null);

  // State & Handler Ubah Kata Sandi Administrator
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Kata sandi baru dan konfirmasi kata sandi tidak cocok.' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Kata sandi baru minimal harus 6 karakter.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordMessage({ type: 'success', text: data.message });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: 'Gagal mengubah kata sandi: ' + err.message });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDownloadBackup = () => {
    window.open('/api/backup', '_blank');
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('PERINGATAN: Memulihkan database akan menimpa seluruh data saat ini dengan file cadangan yang dipilih. Pastikan Anda sudah mengunduh backup terkini sebelumnya. Lanjutkan?')) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    setRestoreMessage(null);

    const bodyFormData = new FormData();
    bodyFormData.append('backupFile', file);

    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        body: bodyFormData,
      });
      const data = await res.json();
      if (data.success) {
        setRestoreMessage({ type: 'success', text: data.message });
        setTimeout(() => {
          router.refresh();
        }, 1500);
      } else {
        setRestoreMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setRestoreMessage({ type: 'error', text: 'Gagal memulihkan database: ' + err.message });
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  // Kalkulasi Realtime Total Persentase
  const totalPercent =
    (parseFloat(formData.padkamPercent) || 0) +
    (parseFloat(formData.reserveFundPercent) || 0) +
    (parseFloat(formData.managementBonusPercent) || 0) +
    (parseFloat(formData.socialFundPercent) || 0);

  const isTotalValid = Math.abs(totalPercent - 100) < 0.001;
  const difference = (100 - totalPercent).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!isTotalValid) {
      setMessage({
        type: 'error',
        text: `Total persentase harus tepat 100,00%! Saat ini: ${totalPercent.toFixed(2)}% (Selisih: ${difference}%).`,
      });
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({
          type: 'error',
          text: data.message || 'Gagal menyimpan pengaturan.',
        });
        setIsSaving(false);
        return;
      }

      setMessage({
        type: 'success',
        text: 'Pengaturan BUMKam dan rasio bagi hasil 100% berhasil disimpan ke database.',
      });
      router.refresh();
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Terjadi kesalahan koneksi saat menyimpan pengaturan.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Halaman */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold text-slate-800">Pengaturan BUMKam & Pembagian Hasil Usaha</h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            AD/ART Dinamis
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Konfigurasi profil resmi BUMKam Tungkuwiri Mandiri dan pengaturan persentase bagi hasil sesuai peraturan Kampung Doyo Lama.
        </p>
      </div>

      {/* Alert Notifikasi */}
      {message.text && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 text-xs ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* KELOMPOK 1: PEMBAGIAN HASIL USAHA (AD/ART) */}
        <div className="card-financial border-2 border-emerald-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-800">
                  Rasio Pembagian Hasil Usaha (Laba Bersih BUMKam)
                </h2>
                <p className="text-xs text-slate-500">
                  Wajib berjumlah tepat 100,00% sebelum dapat disimpan ke sistem.
                </p>
              </div>
            </div>

            {/* Realtime Total Indicator Badge */}
            <div
              className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold flex items-center space-x-1.5 ${
                isTotalValid
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {isTotalValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>Total Alokasi: {totalPercent.toFixed(2)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            {/* Input PADKam */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  1. Pendapatan Asli Desa/Kampung (PADKam)
                </label>
                <span className="text-[11px] font-mono font-bold text-emerald-700">
                  {formData.padkamPercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                Disetorkan langsung ke Kas Pemerintah Kampung Doyo Lama sebagai pendapatan kampung.
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={formData.padkamPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, padkamPercent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full text-sm font-mono font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
            </div>

            {/* Input Cadangan Modal */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  2. Dana Cadangan Modal BUMKam
                </label>
                <span className="text-[11px] font-mono font-bold text-emerald-700">
                  {formData.reserveFundPercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                Reinvestasi untuk pengadaan mesin sablon baru, peremajaan perlengkapan, dan modal kerja.
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={formData.reserveFundPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, reserveFundPercent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full text-sm font-mono font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
            </div>

            {/* Input Jasa Pengurus */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  3. Jasa Pengurus & Karyawan
                </label>
                <span className="text-[11px] font-mono font-bold text-emerald-700">
                  {formData.managementBonusPercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                Tantiem / insentif kinerja pengelola, penasihat, badan pengawas, dan operator sablon.
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={formData.managementBonusPercent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      managementBonusPercent: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full text-sm font-mono font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
            </div>

            {/* Input Dana Sosial */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  4. Dana Sosial & Pendidikan Kampung
                </label>
                <span className="text-[11px] font-mono font-bold text-emerald-700">
                  {formData.socialFundPercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                Bantuan kegiatan sosial, keagamaan, dan pembinaan pemuda di Kampung Doyo Lama.
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={formData.socialFundPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, socialFundPercent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full text-sm font-mono font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
            </div>
          </div>

          {/* Validation Feedback Banner */}
          {!isTotalValid && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                Total pembagian saat ini adalah <strong>{totalPercent.toFixed(2)}%</strong>. Anda perlu{' '}
                {totalPercent < 100 ? `menambah ${Math.abs(difference)}%` : `mengurangi ${Math.abs(difference)}%`}{' '}
                agar tepat 100,00% sebelum dapat disimpan.
              </span>
            </div>
          )}
        </div>

        {/* KELOMPOK 2: PROFIL BUMKAM & ALAMAT */}
        <div className="card-financial">
          <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-800">
                Profil Resmi BUMKam & Unit Usaha
              </h2>
              <p className="text-xs text-slate-500">
                Informasi yang tercantum pada kop faktur, nota penjualan, dan laporan keuangan resmi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama BUMKam
              </label>
              <input
                type="text"
                required
                value={formData.bumkamName}
                onChange={(e) => setFormData({ ...formData, bumkamName: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit Usaha Utama
              </label>
              <input
                type="text"
                required
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kampung / Desa
              </label>
              <input
                type="text"
                required
                value={formData.villageName}
                onChange={(e) => setFormData({ ...formData, villageName: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Distrik & Kabupaten
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={formData.districtName}
                  onChange={(e) => setFormData({ ...formData, districtName: e.target.value })}
                  placeholder="Distrik Waibu"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <input
                  type="text"
                  required
                  value={formData.regencyName}
                  onChange={(e) => setFormData({ ...formData, regencyName: e.target.value })}
                  placeholder="Kab. Jayapura"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Kontak / WhatsApp
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0812-XXXX-XXXX"
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tahun Buku Berjalan
              </label>
              <input
                type="number"
                value={formData.fiscalYear}
                onChange={(e) => setFormData({ ...formData, fiscalYear: parseInt(e.target.value, 10) || 2026 })}
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Workshop BUMKam
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tombol Simpan */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="submit"
            disabled={!isTotalValid || isSaving}
            className={`inline-flex items-center space-x-2 px-6 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-md ${
              isTotalValid && !isSaving
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-700/20'
                : 'bg-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan Pengaturan...' : 'Simpan Seluruh Pengaturan'}</span>
          </button>
        </div>
      </form>

      {/* SECTION KEAMANAN & UBAH KATA SANDI */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Keamanan Akun & Ubah Kata Sandi Administrator</h2>
            <p className="text-xs text-slate-500">
              Perbarui kata sandi akun login admin untuk menjaga keamanan akses pembukuan BUMKam Tungkuwiri Mandiri.
            </p>
          </div>
        </div>

        {passwordMessage && (
          <div
            className={`p-3.5 rounded-lg text-xs flex items-center space-x-2 ${
              passwordMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {passwordMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{passwordMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi Saat Ini
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan kata sandi lama"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi Baru
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Ulangi kata sandi baru"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-slate-500">
              Tips: Gunakan kombinasi huruf dan angka yang aman serta mudah diingat oleh pengurus BUMKam.
            </p>
            <button
              type="submit"
              disabled={isChangingPassword}
              className={`inline-flex items-center space-x-2 px-5 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm ${
                isChangingPassword
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isChangingPassword ? 'Memperbarui Kata Sandi...' : 'Perbarui Kata Sandi'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION PENCADANGAN & PEMULIHAN DATABASE (BACKUP & RESTORE) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Pencadangan & Pemulihan Data (Backup & Restore)</h2>
            <p className="text-xs text-slate-500">
              Amankan seluruh riwayat transaksi, jurnal akuntansi, dan master data BUMKam Tungkuwiri Mandiri.
            </p>
          </div>
        </div>

        {restoreMessage && (
          <div
            className={`p-3.5 rounded-lg text-xs flex items-center space-x-2 ${
              restoreMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {restoreMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{restoreMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Card Download Backup */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Unduh Cadangan Database (.db)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Unduh salinan berkas database SQLite lengkap beserta seluruh transaksi untuk disimpan di komputer lokal atau flashdisk.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow-sm w-full"
            >
              <Download className="w-4 h-4" />
              <span>Unduh File Database (.db)</span>
            </button>
          </div>

          {/* Card Restore Backup */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Pulihkan Database dari Cadangan</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Pilih file cadangan (.db) untuk memulihkan kondisi pembukuan. Sistem otomatis membuat salinan darurat sebelum menimpa.
              </p>
            </div>
            <label className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer w-full text-center">
              {isRestoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sedang Memulihkan Database...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Pilih & Pulihkan Berkas (.db)</span>
                </>
              )}
              <input
                type="file"
                accept=".db,.sqlite,.sqlite3"
                onChange={handleRestoreBackup}
                disabled={isRestoring}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
