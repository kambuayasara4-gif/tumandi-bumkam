'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Package, AlertTriangle, CheckCircle2, AlertCircle, Tag } from 'lucide-react';

export default function ItemsClient({ initialItems, categories }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems || []);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'RAW_MATERIAL',
    categoryId: categories[0]?.id || '',
    unit: 'Pcs',
    costPrice: '',
    sellingPrice: '',
    minStockAlert: '5',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filterTabs = [
    { key: 'ALL', label: 'Semua Item' },
    { key: 'RAW_MATERIAL', label: 'Bahan Baku (Kaos/Tinta/DTF)' },
    { key: 'SUPPLIES', label: 'Bahan Pembantu & Kemasan' },
    { key: 'FINISHED_GOOD', label: 'Kaos Sablon Jadi' },
    { key: 'SERVICE', label: 'Jasa Sablon Kustom' },
  ];

  const filteredItems = items.filter((item) => {
    const matchType = filterType === 'ALL' || item.type === filterType;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(parseFloat(val || 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || 'Gagal menyimpan item baru.');
        setIsSubmitting(false);
        return;
      }

      setItems([data.item, ...items]);
      setIsModalOpen(false);
      setFormData({
        code: '',
        name: '',
        type: 'RAW_MATERIAL',
        categoryId: categories[0]?.id || '',
        unit: 'Pcs',
        costPrice: '',
        sellingPrice: '',
        minStockAlert: '5',
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
            <h1 className="text-xl font-bold text-slate-800">Master Bahan Baku & Produk Sablon</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {items.length} Item
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Katalog bahan kaos combed, tinta plastisol, PET film DTF, dan produk sablon BUMKam Tungkuwiri Mandiri.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Item Baru</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="card-financial p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterType(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterType === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari item, kode, atau kategori..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Tabel Master Item */}
      <div className="card-financial p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-financial">
            <thead>
              <tr>
                <th className="w-32">Kode Item</th>
                <th>Nama Bahan / Produk</th>
                <th>Kategori</th>
                <th className="text-center w-24">Satuan</th>
                <th className="text-right w-32">Biaya Beli (HPP)</th>
                <th className="text-right w-32">Harga Jual</th>
                <th className="text-center w-32">Stok Tersedia</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400 text-xs">
                    Tidak ada item yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const currentStock = parseFloat(item.currentStock.toString());
                  const minAlert = parseFloat(item.minStockAlert.toString());
                  const isLow = item.type !== 'SERVICE' && currentStock <= minAlert;

                  return (
                    <tr key={item.id}>
                      <td className="font-mono font-bold text-xs text-slate-900">
                        {item.code}
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-slate-800 block">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Tipe: {item.type}
                        </span>
                      </td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          <Tag className="w-3 h-3 mr-1 text-slate-400" />
                          {item.category?.name || '-'}
                        </span>
                      </td>
                      <td className="text-center font-mono text-xs text-slate-600">
                        {item.unit}
                      </td>
                      <td className="text-right font-mono text-xs text-slate-700">
                        {formatRupiah(item.costPrice)}
                      </td>
                      <td className="text-right font-mono text-xs font-semibold text-slate-900">
                        {formatRupiah(item.sellingPrice)}
                      </td>
                      <td className="text-center">
                        {item.type === 'SERVICE' ? (
                          <span className="text-[11px] text-slate-400 italic">Jasa Sablon</span>
                        ) : (
                          <div className="inline-flex items-center space-x-1.5 font-mono text-xs font-bold">
                            <span className={isLow ? 'text-amber-700' : 'text-slate-800'}>
                              {currentStock} {item.unit}
                            </span>
                            {isLow && (
                              <span
                                title={`Peringatan stok minimum: <= ${minAlert} ${item.unit}`}
                                className="p-0.5 bg-amber-100 text-amber-700 rounded-full"
                              >
                                <AlertTriangle className="w-3 h-3" />
                              </span>
                            )}
                          </div>
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

      {/* Modal Tambah Item Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">Tambah Bahan / Produk Baru</h3>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Klasifikasi Item
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="RAW_MATERIAL">Bahan Baku (Kaos/Tinta/DTF)</option>
                    <option value="SUPPLIES">Bahan Pembantu / Kemasan</option>
                    <option value="FINISHED_GOOD">Kaos Sablon Siap Jual</option>
                    <option value="SERVICE">Jasa Sablon Kustom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Item
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Bahan / Produk
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Kaos Polos Combed 30s Merah (XL)"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Item
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="KP-30S-RED-XL"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Pcs / Roll / Kg"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Biaya Beli / HPP (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="35000"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Jual Standar (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="65000"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batas Peringatan Stok Minimum (Min Alert)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minStockAlert}
                  onChange={(e) => setFormData({ ...formData, minStockAlert: e.target.value })}
                  placeholder="5"
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
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
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
