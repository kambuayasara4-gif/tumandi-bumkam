'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  FileText,
  Calendar,
  Building,
} from 'lucide-react';

export default function JournalsClient({ initialJournals, accounts, initialSearch }) {
  const router = useRouter();
  const [journals, setJournals] = useState(initialJournals || []);
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [selectedRefType, setSelectedRefType] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State Jurnal Baru
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    referenceType: 'MANUAL',
    referenceId: '',
    description: '',
    items: [
      { accountId: accounts[0]?.id || '', debit: '', credit: '', memo: '' },
      { accountId: accounts[1]?.id || '', debit: '', credit: '', memo: '' },
    ],
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

  // Kalkulasi Realtime Total Debit & Kredit
  const totalDebit = formData.items.reduce((sum, item) => sum + (parseFloat(item.debit) || 0), 0);
  const totalCredit = formData.items.reduce((sum, item) => sum + (parseFloat(item.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items];
    updated[index][field] = value;
    // Jika mengisi debit, kosongkan credit pada baris yang sama, dan sebaliknya
    if (field === 'debit' && value) {
      updated[index]['credit'] = '';
    } else if (field === 'credit' && value) {
      updated[index]['debit'] = '';
    }
    setFormData({ ...formData, items: updated });
  };

  const addRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { accountId: accounts[0]?.id || '', debit: '', credit: '', memo: '' },
      ],
    });
  };

  const removeRow = (index) => {
    if (formData.items.length <= 2) {
      alert('Jurnal akuntansi minimal harus memiliki 2 baris akun.');
      return;
    }
    const updated = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!isBalanced) {
      setFormError(`Jurnal belum seimbang! Total Debit (Rp ${totalDebit}) ≠ Total Kredit (Rp ${totalCredit}). Selisih: Rp ${difference}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || 'Gagal menyimpan jurnal.');
        setIsSubmitting(false);
        return;
      }

      setJournals([data.journal, ...journals]);
      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        referenceType: 'MANUAL',
        referenceId: '',
        description: '',
        items: [
          { accountId: accounts[0]?.id || '', debit: '', credit: '', memo: '' },
          { accountId: accounts[1]?.id || '', debit: '', credit: '', memo: '' },
        ],
      });
      router.refresh();
    } catch (err) {
      setFormError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredJournals = journals.filter((j) => {
    const matchType = selectedRefType === 'ALL' || j.referenceType === selectedRefType;
    const matchSearch =
      j.entryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.referenceId && j.referenceId.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-800">Buku Jurnal Umum</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {journals.length} Entri Jurnal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Seluruh riwayat pencatatan jurnal double-entry otomatis maupun penyesuaian manual BUMKam.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ Input Jurnal Manual / Penyesuaian</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="card-financial p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'ALL', label: 'Semua Jurnal' },
              { key: 'MANUAL', label: 'Manual' },
              { key: 'CASH_IN', label: 'Kas Masuk' },
              { key: 'CASH_OUT', label: 'Kas Keluar' },
              { key: 'TRANSFER', label: 'Transfer' },
              { key: 'SALES', label: 'Penjualan' },
              { key: 'PURCHASE', label: 'Pembelian' },
              { key: 'DEPRECIATION', label: 'Penyusutan' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setSelectedRefType(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedRefType === t.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no. jurnal, deskripsi, ref..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Daftar Jurnal Terinci */}
      <div className="space-y-4">
        {filteredJournals.length === 0 ? (
          <div className="card-financial text-center py-12 text-slate-400 text-xs">
            Belum ada entri jurnal yang sesuai dengan kriteria pencarian.
          </div>
        ) : (
          filteredJournals.map((journal) => (
            <div
              key={journal.id}
              className="card-financial p-0 overflow-hidden border border-slate-200 shadow-sm"
            >
              {/* Journal Header Bar */}
              <div className="bg-slate-100/70 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-bold text-xs bg-slate-800 text-white px-2 py-0.5 rounded">
                    {journal.entryNumber}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(journal.date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
                    Tipe: {journal.referenceType}
                  </span>
                  {journal.referenceId && (
                    <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Ref: {journal.referenceId}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="badge-debit font-mono">
                    Total: {formatRupiah(journal.totalDebit)}
                  </span>
                  <span className="inline-flex items-center text-[10px] text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Terkonfirmasi Seimbang
                  </span>
                </div>
              </div>

              {/* Deskripsi Jurnal */}
              <div className="px-4 py-2 bg-white text-xs font-medium text-slate-700 border-b border-slate-100">
                {journal.description}
              </div>

              {/* Baris Rincian Akun (Debit & Kredit) */}
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/60 text-slate-500 text-[11px]">
                    <th className="px-4 py-2 font-semibold">Kode & Nama Akun</th>
                    <th className="px-4 py-2 font-semibold">Catatan Baris (Memo)</th>
                    <th className="px-4 py-2 font-semibold text-right w-36">Debit (Rp)</th>
                    <th className="px-4 py-2 font-semibold text-right w-36">Kredit (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {journal.items.map((item) => {
                    const debitNum = parseFloat(item.debit.toString());
                    const creditNum = parseFloat(item.credit.toString());

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/40">
                        <td className="px-4 py-2">
                          <Link
                            href={`/ledger?accountId=${item.accountId}`}
                            className="hover:underline hover:text-emerald-700"
                          >
                            <span className="font-mono text-slate-500 mr-2 font-medium">
                              {item.account?.code}
                            </span>
                            <span
                              className={`font-semibold ${
                                creditNum > 0 ? 'pl-6 text-slate-700' : 'text-slate-900'
                              }`}
                            >
                              {item.account?.name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-slate-500 text-[11px]">
                          {item.memo || '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-semibold text-slate-800">
                          {debitNum > 0 ? formatRupiah(debitNum) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-semibold text-slate-800">
                          {creditNum > 0 ? formatRupiah(creditNum) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {/* MODAL INPUT JURNAL MANUAL / PENYESUAIAN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">Input Jurnal Umum / Penyesuaian</h3>
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
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Jurnal
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipe Entri
                  </label>
                  <select
                    value={formData.referenceType}
                    onChange={(e) => setFormData({ ...formData, referenceType: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="MANUAL">Jurnal Umum Manual</option>
                    <option value="ADJUSTMENT">Jurnal Penyesuaian (Adjustment)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Dokumen Referensi
                  </label>
                  <input
                    type="text"
                    value={formData.referenceId}
                    onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                    placeholder="Contoh: BUKTI-001"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Transaksi
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Keterangan lengkap transaksi jurnal..."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Tabel Baris Akun Jurnal */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">Baris Rincian Akun (Double-Entry)</span>
                  <button
                    type="button"
                    onClick={addRow}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600">
                        <th className="p-2 text-left">Pilih Akun</th>
                        <th className="p-2 text-left">Memo / Catatan</th>
                        <th className="p-2 text-right w-32">Debit (Rp)</th>
                        <th className="p-2 text-right w-32">Kredit (Rp)</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((item, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-2">
                            <select
                              value={item.accountId}
                              onChange={(e) => handleItemChange(idx, 'accountId', e.target.value)}
                              className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800"
                            >
                              {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.code} - {acc.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.memo}
                              onChange={(e) => handleItemChange(idx, 'memo', e.target.value)}
                              placeholder="Memo baris"
                              className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={item.debit}
                              onChange={(e) => handleItemChange(idx, 'debit', e.target.value)}
                              placeholder="0"
                              className="w-full p-1.5 font-mono text-right bg-slate-50 border border-slate-300 rounded text-xs text-slate-800"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={item.credit}
                              onChange={(e) => handleItemChange(idx, 'credit', e.target.value)}
                              placeholder="0"
                              className="w-full p-1.5 font-mono text-right bg-slate-50 border border-slate-300 rounded text-xs text-slate-800"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeRow(idx)}
                              className="text-slate-400 hover:text-rose-600"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td colSpan="2" className="p-2.5 text-right text-slate-600">
                          Total:
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-900">
                          {formatRupiah(totalDebit)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-900">
                          {formatRupiah(totalCredit)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Realtime Balance Status */}
                <div
                  className={`mt-3 p-3 rounded-lg text-xs font-semibold flex items-center justify-between border ${
                    isBalanced
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {isBalanced ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>
                      {isBalanced
                        ? 'Jurnal Seimbang (Total Debit = Total Kredit)'
                        : `Jurnal Belum Seimbang! Selisih: ${formatRupiah(difference)}`}
                    </span>
                  </div>
                  <span className="font-mono text-[11px]">
                    Debit: {formatRupiah(totalDebit)} | Kredit: {formatRupiah(totalCredit)}
                  </span>
                </div>
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
                  disabled={!isBalanced || isSubmitting}
                  className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition-colors ${
                    isBalanced && !isSubmitting
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan & Posting Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
