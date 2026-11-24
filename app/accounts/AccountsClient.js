'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, BookOpen, Filter, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AccountsClient({ initialAccounts }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts || []);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'ASSET',
    subCategory: 'KAS_BANK',
    normalBalance: 'DEBIT',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { key: 'ALL', label: 'Semua Akun' },
    { key: 'ASSET', label: '1. Aset' },
    { key: 'LIABILITY', label: '2. Kewajiban' },
    { key: 'EQUITY', label: '3. Ekuitas' },
    { key: 'REVENUE', label: '4. Pendapatan' },
    { key: 'EXPENSE', label: '5-6. HPP & Beban' },
  ];

  const subCategoryOptions = {
    ASSET: [
      { key: 'KAS_BANK', label: 'Kas & Rekening Bank' },
      { key: 'PIUTANG', label: 'Piutang Usaha Pelanggan' },
      { key: 'PERSEDIAAN', label: 'Persediaan Bahan & Barang' },
      { key: 'ASET_TETAP', label: 'Aset Tetap (Peralatan/Mesin)' },
      { key: 'AKUMULASI_PENYUSUTAN', label: 'Akumulasi Penyusutan (Kontra Aset)' },
      { key: 'ASET_LANCAR_LAIN', label: 'Aset Lancar Lainnya' },
    ],
    LIABILITY: [
      { key: 'KEWAJIBAN_LANCAR', label: 'Kewajiban Jangka Pendek / Utang Usaha' },
      { key: 'KEWAJIBAN_PANJANG', label: 'Kewajiban Jangka Panjang' },
    ],
    EQUITY: [
      { key: 'MODAL_DESA', label: 'Modal Penyertaan Kampung Doyo Lama' },
      { key: 'MODAL_MASYARAKAT', label: 'Penyertaan Modal Masyarakat' },
      { key: 'LABA_DITAHAN', label: 'Saldo Laba Ditahan' },
      { key: 'CADANGAN_MODAL', label: 'Dana Cadangan BUMKam' },
    ],
    REVENUE: [
      { key: 'PENDAPATAN_OPERASIONAL', label: 'Pendapatan Penjualan / Jasa Sablon' },
      { key: 'PENDAPATAN_NON_OPS', label: 'Pendapatan Lain-lain / Bunga Bank' },
    ],
    EXPENSE: [
      { key: 'HPP', label: 'Harga Pokok Penjualan (HPP Bahan/Upah)' },
      { key: 'BEBAN_OPERASIONAL', label: 'Beban Operasional & Administrasi' },
      { key: 'BEBAN_NON_OPS', label: 'Beban Administrasi Bank & Pajak' },
    ],
  };

  const handleCategoryChange = (cat) => {
    const defaultSub = subCategoryOptions[cat]?.[0]?.key || 'KAS_BANK';
    const defaultBalance = (cat === 'ASSET' || cat === 'EXPENSE') ? 'DEBIT' : 'CREDIT';
    setFormData({
      ...formData,
      category: cat,
      subCategory: defaultSub,
      normalBalance: defaultBalance,
    });
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchCategory =
      selectedCategory === 'ALL' ||
      (selectedCategory === 'EXPENSE'
        ? acc.category === 'EXPENSE'
        : acc.category === selectedCategory);
    const matchSearch =
      acc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || 'Gagal menyimpan akun baru.');
        setIsSubmitting(false);
        return;
      }

      setAccounts([...accounts, data.account].sort((a, b) => a.code.localeCompare(b.code)));
      setIsModalOpen(false);
      setFormData({
        code: '',
        name: '',
        category: 'ASSET',
        subCategory: 'KAS_BANK',
        normalBalance: 'DEBIT',
      });
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
            <h1 className="text-xl font-bold text-slate-800">Bagan Akun Standar (CoA)</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {accounts.length} Akun
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bagan akun buku besar mengacu pada SAK EMKM dan Kepmendesa No. 136/2022 untuk BUMKam.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Akun Baru</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="card-financial p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelectedCategory(c.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedCategory === c.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode atau nama akun..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Tabel Bagan Akun */}
      <div className="card-financial p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-financial">
            <thead>
              <tr>
                <th className="w-32">Kode Akun</th>
                <th>Nama Akun</th>
                <th>Kategori Utama</th>
                <th>Sub-Klasifikasi</th>
                <th className="text-center w-28">Saldo Normal</th>
                <th className="text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-400 text-xs">
                    Tidak ada akun yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id}>
                    <td className="font-mono font-bold text-xs text-slate-900">
                      {acc.code}
                    </td>
                    <td className="text-xs font-medium text-slate-800">
                      {acc.name}
                    </td>
                    <td>
                      <span className="text-[11px] font-medium text-slate-600">
                        {acc.category}
                      </span>
                    </td>
                    <td className="text-[11px] text-slate-500 font-mono">
                      {acc.subCategory}
                    </td>
                    <td className="text-center">
                      <span className={acc.normalBalance === 'DEBIT' ? 'badge-debit' : 'badge-credit'}>
                        {acc.normalBalance}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Akun Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">Tambah Akun Baru</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Utama Akun
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="ASSET">1. ASET (Aktiva)</option>
                  <option value="LIABILITY">2. KEWAJIBAN (Utang / Liabilitas)</option>
                  <option value="EQUITY">3. EKUITAS (Modal Kampung & Laba)</option>
                  <option value="REVENUE">4. PENDAPATAN (Hasil Usaha Sablon)</option>
                  <option value="EXPENSE">5-6. BEBAN & HPP (Beban Pokok & Operasional)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sub-Klasifikasi Akun
                </label>
                <select
                  value={formData.subCategory}
                  onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {subCategoryOptions[formData.category]?.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Akun (Contoh: 1-1150)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="1-XXXX"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Saldo Normal
                  </label>
                  <select
                    value={formData.normalBalance}
                    onChange={(e) => setFormData({ ...formData, normalBalance: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="DEBIT">DEBIT (Aset & Beban)</option>
                    <option value="CREDIT">CREDIT (Kewajiban, Modal, Pendapatan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Akun Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Misal: Kas Kecil Workshop Doyo Lama"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
