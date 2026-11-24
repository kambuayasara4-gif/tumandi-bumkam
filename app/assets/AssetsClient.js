'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
  Plus,
  Play,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  History,
} from 'lucide-react';

export default function AssetsClient({
  initialAssets,
  assetAccounts,
  depAccounts,
  cashAccounts,
  currentSetting,
}) {
  const router = useRouter();
  const [assets, setAssets] = useState(initialAssets || []);
  const [lockDate, setLockDate] = useState(
    currentSetting?.lockDate ? new Date(currentSetting.lockDate).toISOString().split('T')[0] : ''
  );

  // Modal States
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isDepModalOpen, setIsDepModalOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);

  // Form Tambah Aset
  const [assetForm, setAssetForm] = useState({
    name: '',
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionCost: '',
    salvageValue: '0',
    usefulLifeMonths: '48', // 4 tahun default
    assetAccountId: assetAccounts[0]?.id || '',
    depreciationAccountId: depAccounts[0]?.id || '',
    paymentMethod: 'EXISTING_CAPITAL', // EXISTING_CAPITAL / CASH_PURCHASE
    cashAccountId: cashAccounts[0]?.id || '',
    notes: '',
  });

  // Form Jalankan Penyusutan
  const now = new Date();
  const [depForm, setDepForm] = useState({
    periodMonth: String(now.getMonth() + 1),
    periodYear: String(now.getFullYear()),
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(parseFloat(val || 0));
  };

  // Kalkulasi KPI
  let totalCost = 0;
  let totalAccumulated = 0;
  let activeCount = 0;

  assets.forEach((a) => {
    totalCost += parseFloat(a.acquisitionCost.toString());
    totalAccumulated += parseFloat(a.accumulatedDepreciation.toString());
    if (a.status === 'ACTIVE') activeCount++;
  });

  const netBookValue = Math.max(0, totalCost - totalAccumulated);

  // Kalkulasi Preview Penyusutan Bulanan Form Tambah
  const previewCost = parseFloat(assetForm.acquisitionCost) || 0;
  const previewSalvage = parseFloat(assetForm.salvageValue) || 0;
  const previewMonths = parseInt(assetForm.usefulLifeMonths, 10) || 1;
  const previewMonthly = previewMonths > 0 ? Math.max(0, (previewCost - previewSalvage) / previewMonths) : 0;

  const handleSubmitAsset = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetForm),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || 'Gagal mendaftarkan aset tetap.');
        setIsSubmitting(false);
        return;
      }

      setAssets([data.asset, ...assets]);
      setIsAssetModalOpen(false);
      router.refresh();
    } catch (err) {
      setFormError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunDepreciation = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/assets/depreciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(depForm),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || 'Gagal menjalankan penyusutan.');
        setIsSubmitting(false);
        return;
      }

      alert(data.message);
      setIsDepModalOpen(false);
      router.refresh();
    } catch (err) {
      setFormError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveLock = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/settings/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockDate: lockDate || null }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || 'Gagal memperbarui status kunci periode.');
        setIsSubmitting(false);
        return;
      }

      alert(data.message);
      setIsLockModalOpen(false);
      router.refresh();
    } catch (err) {
      setFormError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-800">Aset Tetap & Mesin Sablon</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Penyusutan Garis Lurus SAK EMKM
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan mesin heat press, printer DTF, meja sablon, dan depresiasi otomatis per bulan BUMKam Tungkuwiri Mandiri.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsLockModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition-colors"
          >
            {currentSetting?.lockDate ? (
              <Lock className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>
              {currentSetting?.lockDate
                ? `Terkunci s/d ${new Date(currentSetting.lockDate).toLocaleDateString('id-ID')}`
                : 'Kunci Periode Tutup Buku'}
            </span>
          </button>

          <button
            onClick={() => setIsDepModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>Jalankan Penyusutan Bulanan</span>
          </button>

          <button
            onClick={() => setIsAssetModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Daftarkan Aset Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-financial p-4 border-l-4 border-l-slate-700">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Harga Perolehan Aset
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {formatRupiah(totalCost)}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Dari {assets.length} unit mesin & peralatan sablon
          </p>
        </div>

        <div className="card-financial p-4 border-l-4 border-l-rose-500">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block mb-1">
            Akumulasi Penyusutan
          </span>
          <div className="text-2xl font-extrabold text-rose-700 font-mono">
            - {formatRupiah(totalAccumulated)}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Beban depresiasi yang telah diakui
          </p>
        </div>

        <div className="card-financial p-4 border-l-4 border-l-emerald-600 bg-emerald-50/20">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
            Nilai Buku Bersih (Book Value)
          </span>
          <div className="text-2xl font-extrabold text-emerald-800 font-mono">
            {formatRupiah(netBookValue)}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-2">
            Aset Tetap Neto di Neraca Keuangan
          </p>
        </div>

        <div className="card-financial p-4 border-l-4 border-l-blue-600">
          <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block mb-1">
            Mesin Workshop Aktif
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {activeCount} <span className="text-xs font-normal text-slate-400">Unit</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Sedang beroperasi & disusutkan rutin
          </p>
        </div>
      </div>

      {/* Tabel Aset Tetap */}
      <div className="card-financial p-0 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Daftar Inventaris Mesin & Peralatan Workshop</h2>
          <span className="text-xs text-slate-500">Metode Garis Lurus (Straight-Line)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="table-financial">
            <thead>
              <tr>
                <th className="w-32">Kode Aset</th>
                <th>Nama Mesin / Peralatan</th>
                <th className="w-28">Tgl Perolehan</th>
                <th className="text-right w-32">Harga Beli (Rp)</th>
                <th className="text-right w-32">Beban / Bulan</th>
                <th className="text-right w-32">Akumulasi Susut</th>
                <th className="text-right w-32">Nilai Buku (Rp)</th>
                <th className="text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400 text-xs">
                    Belum ada aset tetap yang didaftarkan. Klik tombol "+ Daftarkan Aset Baru" untuk menambahkan mesin sablon.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const cost = parseFloat(asset.acquisitionCost.toString());
                  const accumulated = parseFloat(asset.accumulatedDepreciation.toString());
                  const bookValue = Math.max(0, cost - accumulated);

                  return (
                    <tr key={asset.id}>
                      <td className="font-mono font-bold text-xs text-slate-900">
                        {asset.code}
                      </td>
                      <td>
                        <span className="text-xs font-bold text-slate-800 block">
                          {asset.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Masa Manfaat: {asset.usefulLifeMonths} bulan ({Math.round(asset.usefulLifeMonths / 12)} tahun) • Nilai Sisa: {formatRupiah(asset.salvageValue)}
                        </span>
                      </td>
                      <td className="text-xs text-slate-600 font-mono">
                        {new Date(asset.acquisitionDate).toLocaleDateString('id-ID')}
                      </td>
                      <td className="text-right font-mono font-semibold text-xs text-slate-900">
                        {formatRupiah(cost)}
                      </td>
                      <td className="text-right font-mono text-xs text-slate-700">
                        {formatRupiah(asset.monthlyDepreciation)}
                      </td>
                      <td className="text-right font-mono text-xs text-rose-700 font-semibold">
                        - {formatRupiah(accumulated)}
                      </td>
                      <td className="text-right font-mono font-bold text-xs text-emerald-800 bg-slate-50/50">
                        {formatRupiah(bookValue)}
                      </td>
                      <td className="text-center">
                        {asset.status === 'ACTIVE' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            Aktif
                          </span>
                        )}
                        {asset.status === 'FULLY_DEPRECIATED' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700">
                            Habis Susut
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DAFTARKAN ASET TETAP BARU */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Wrench className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">Daftarkan Aset Tetap Workshop Baru</h3>
              </div>
              <button
                onClick={() => setIsAssetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAsset} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Aset / Mesin Sablon
                </label>
                <input
                  type="text"
                  required
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  placeholder="Contoh: Mesin Heat Press 40x60 High Pressure / Printer DTF"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Perolehan
                  </label>
                  <input
                    type="date"
                    required
                    value={assetForm.acquisitionDate}
                    onChange={(e) => setAssetForm({ ...assetForm, acquisitionDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Klasifikasi Akun Aset Tetap
                  </label>
                  <select
                    value={assetForm.assetAccountId}
                    onChange={(e) => setAssetForm({ ...assetForm, assetAccountId: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {assetAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Perolehan (Rp)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    required
                    value={assetForm.acquisitionCost}
                    onChange={(e) => setAssetForm({ ...assetForm, acquisitionCost: e.target.value })}
                    placeholder="Contoh: 8500000"
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nilai Residu / Sisa (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={assetForm.salvageValue}
                    onChange={(e) => setAssetForm({ ...assetForm, salvageValue: e.target.value })}
                    placeholder="0"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Masa Manfaat (Bulan)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={assetForm.usefulLifeMonths}
                    onChange={(e) => setAssetForm({ ...assetForm, usefulLifeMonths: e.target.value })}
                    placeholder="48 (4 tahun)"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Box Preview Penyusutan */}
              <div className="p-3 bg-slate-100 rounded-xl text-xs flex items-center justify-between">
                <span className="text-slate-600">Simulasi Beban Penyusutan Bulanan:</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {formatRupiah(previewMonthly)} / bulan
                </span>
              </div>

              {/* Sumber Dana Perolehan */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Sumber Perolehan Aset</span>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center justify-center p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                      assetForm.paymentMethod === 'EXISTING_CAPITAL'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payMethod"
                      checked={assetForm.paymentMethod === 'EXISTING_CAPITAL'}
                      onChange={() => setAssetForm({ ...assetForm, paymentMethod: 'EXISTING_CAPITAL' })}
                      className="sr-only"
                    />
                    <span>Aset Bawaan / Modal Awal</span>
                  </label>

                  <label
                    className={`flex items-center justify-center p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                      assetForm.paymentMethod === 'CASH_PURCHASE'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payMethod"
                      checked={assetForm.paymentMethod === 'CASH_PURCHASE'}
                      onChange={() => setAssetForm({ ...assetForm, paymentMethod: 'CASH_PURCHASE' })}
                      className="sr-only"
                    />
                    <span>Beli Sekarang via Kas/Bank</span>
                  </label>
                </div>

                {assetForm.paymentMethod === 'CASH_PURCHASE' && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Pilih Rekening Kas/Bank Pembayaran:
                    </label>
                    <select
                      value={assetForm.cashAccountId}
                      onChange={(e) => setAssetForm({ ...assetForm, cashAccountId: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800"
                    >
                      {cashAccounts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / Spesifikasi Mesin
                </label>
                <input
                  type="text"
                  value={assetForm.notes}
                  onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                  placeholder="Contoh: Daya 1800W, garansi 1 tahun, lokasi bengkel Doyo Lama"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || previewCost <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Mendaftarkan...' : 'Simpan Aset Tetap'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL JALANKAN PENYUSUTAN BULANAN */}
      {isDepModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Play className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">Eksekusi Penyusutan Bulanan Otomatis</h3>
              </div>
              <button
                onClick={() => setIsDepModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRunDepreciation} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Sistem akan menghitung beban penyusutan seluruh mesin sablon aktif dan memposting jurnal otomatis:
                <br />
                <strong className="text-emerald-800 block mt-1 font-mono">
                  Debit: Beban Penyusutan (6-6000)
                  <br />
                  Kredit: Akumulasi Penyusutan (1-2110)
                </strong>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bulan Periode
                  </label>
                  <select
                    value={depForm.periodMonth}
                    onChange={(e) => setDepForm({ ...depForm, periodMonth: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {[
                      { m: '1', n: 'Januari' },
                      { m: '2', n: 'Februari' },
                      { m: '3', n: 'Maret' },
                      { m: '4', n: 'April' },
                      { m: '5', n: 'Mei' },
                      { m: '6', n: 'Juni' },
                      { m: '7', n: 'Juli' },
                      { m: '8', n: 'Agustus' },
                      { m: '9', n: 'September' },
                      { m: '10', n: 'Oktober' },
                      { m: '11', n: 'November' },
                      { m: '12', n: 'Desember' },
                    ].map((item) => (
                      <option key={item.m} value={item.m}>
                        {item.n}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahun
                  </label>
                  <input
                    type="number"
                    value={depForm.periodYear}
                    onChange={(e) => setDepForm({ ...depForm, periodYear: e.target.value })}
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDepModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Memproses...' : 'Jalankan & Posting Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KUNCI PERIODE TUTUP BUKU */}
      {isLockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-sm text-slate-800">Kunci Periode Pembukuan (Tutup Buku)</h3>
              </div>
              <button
                onClick={() => setIsLockModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLock} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <span className="font-bold block mb-1">Proteksi Integritas Laporan Keuangan:</span>
                Transaksi bertanggal pada atau sebelum tanggal tutup buku tidak dapat diubah, dihapus, atau diposting ulang untuk mencegah manipulasi audit.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kunci Transaksi Sampai Tanggal:
                </label>
                <input
                  type="date"
                  value={lockDate}
                  onChange={(e) => setLockDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Kosongkan tanggal jika ingin membuka kembali seluruh periode pembukuan.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {currentSetting?.lockDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setLockDate('');
                    }}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Buka Kunci
                  </button>
                )}
                <div className="flex space-x-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsLockModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Status Kunci'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
