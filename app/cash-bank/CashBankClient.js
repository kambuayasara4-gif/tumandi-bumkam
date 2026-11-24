'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Plus,
  Search,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export default function CashBankClient({
  initialTransactions,
  cashAccounts,
  revenueAccounts,
  expenseAccounts,
  contacts,
}) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions || []);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // State Modal
  const [activeModal, setActiveModal] = useState(null); // 'IN', 'OUT', 'TRANSFER', or null
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: cashAccounts[0]?.id || '',
    oppositeAccountId: '',
    amount: '',
    contactId: '',
    recipientOrPayer: '',
    notes: '',
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

  // Kalkulasi Saldo
  const totalCashBankBalance = cashAccounts.reduce((acc, curr) => acc + curr.balance, 0);

  const filteredTransactions = transactions.filter((tx) => {
    const matchType = filterType === 'ALL' || tx.type === filterType;
    const matchSearch =
      tx.transactionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.account?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.oppositeAccount?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.recipientOrPayer?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const openModal = (type) => {
    setActiveModal(type);
    setFormError('');
    let defaultOpposite = '';
    if (type === 'IN') {
      defaultOpposite = revenueAccounts[0]?.id || '';
    } else if (type === 'OUT') {
      defaultOpposite = expenseAccounts[0]?.id || '';
    } else if (type === 'TRANSFER') {
      defaultOpposite = cashAccounts.find((c) => c.id !== cashAccounts[0]?.id)?.id || '';
    }

    setFormData({
      date: new Date().toISOString().split('T')[0],
      accountId: cashAccounts[0]?.id || '',
      oppositeAccountId: defaultOpposite,
      amount: '',
      contactId: '',
      recipientOrPayer: '',
      notes: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/cash-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          type: activeModal,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || 'Gagal memproses transaksi.');
        setIsSubmitting(false);
        return;
      }

      setTransactions([data.transaction, ...transactions]);
      setActiveModal(null);
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
            <h1 className="text-xl font-bold text-slate-800">Kas & Bank Workshop</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Double-Entry Otomatis
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan uang masuk, pengeluaran kas operasional workshop sablon, dan transfer antar rekening BUMKam.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openModal('IN')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Kas Masuk (BKM)</span>
          </button>

          <button
            onClick={() => openModal('OUT')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>+ Kas Keluar (BKK)</span>
          </button>

          <button
            onClick={() => openModal('TRANSFER')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transfer Bank (TRF)</span>
          </button>
        </div>
      </div>

      {/* Saldo Akun Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cashAccounts.map((acc) => (
          <div key={acc.id} className="card-financial p-4 border-l-4 border-l-emerald-600">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{acc.name}</span>
              <span className="font-mono text-[11px] text-slate-400">Kode: {acc.code}</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              {formatRupiah(acc.balance)}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Saldo Riil Terverifikasi</span>
              <span className="badge-debit text-[10px]">Aktif</span>
            </div>
          </div>
        ))}

        <div className="card-financial p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Total Kas & Bank BUMKam</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono">
            {formatRupiah(totalCashBankBalance)}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Total likuiditas keuangan BUMKam Tungkuwiri Mandiri
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="card-financial p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('IN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'IN'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Kas Masuk (BKM)
            </button>
            <button
              onClick={() => setFilterType('OUT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'OUT'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              Kas Keluar (BKK)
            </button>
            <button
              onClick={() => setFilterType('TRANSFER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'TRANSFER'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Transfer (TRF)
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no. bukti, keterangan, akun..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Tabel Mutasi Kas & Bank */}
      <div className="card-financial p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-financial">
            <thead>
              <tr>
                <th className="w-36">No. Bukti & Tanggal</th>
                <th className="w-24">Tipe</th>
                <th>Akun Kas/Bank</th>
                <th>Akun Lawan (Alokasi)</th>
                <th>Pihak / Keterangan</th>
                <th className="text-right w-36">Nominal (Rp)</th>
                <th className="text-center w-28">No. Jurnal</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400 text-xs">
                    Belum ada transaksi kas & bank yang dicatat.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isIncoming = tx.type === 'IN';
                  const isOutgoing = tx.type === 'OUT';

                  return (
                    <tr key={tx.id}>
                      <td>
                        <span className="font-mono font-bold text-xs text-slate-900 block">
                          {tx.transactionNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(tx.date).toLocaleDateString('id-ID')}
                        </span>
                      </td>
                      <td>
                        {isIncoming && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            Masuk
                          </span>
                        )}
                        {isOutgoing && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                            Keluar
                          </span>
                        )}
                        {tx.type === 'TRANSFER' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                            Transfer
                          </span>
                        )}
                      </td>
                      <td className="text-xs font-semibold text-slate-800">
                        {tx.account?.name}
                      </td>
                      <td>
                        <span className="text-xs text-slate-700 block">
                          {tx.oppositeAccount?.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {tx.oppositeAccount?.code}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-medium text-slate-800 block">
                          {tx.recipientOrPayer || '-'}
                        </span>
                        {tx.notes && (
                          <span className="text-[11px] text-slate-500 block truncate max-w-xs mt-0.5">
                            {tx.notes}
                          </span>
                        )}
                      </td>
                      <td
                        className={`text-right font-mono font-bold text-xs ${
                          isIncoming
                            ? 'text-emerald-700'
                            : isOutgoing
                            ? 'text-rose-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {isIncoming ? '+' : isOutgoing ? '-' : ''} {formatRupiah(tx.amount)}
                      </td>
                      <td className="text-center">
                        {tx.journalEntry ? (
                          <Link
                            href={`/journals?search=${tx.journalEntry.entryNumber}`}
                            className="inline-flex items-center space-x-1 font-mono text-[11px] text-emerald-600 hover:text-emerald-800 hover:underline"
                            title="Lihat Jurnal Double-Entry"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{tx.journalEntry.entryNumber}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-300">-</span>
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

      {/* MODAL TRANSAKSI KAS & BANK */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                {activeModal === 'IN' && <ArrowDownLeft className="w-5 h-5 text-emerald-600" />}
                {activeModal === 'OUT' && <ArrowUpRight className="w-5 h-5 text-rose-600" />}
                {activeModal === 'TRANSFER' && <ArrowRightLeft className="w-5 h-5 text-blue-600" />}
                <h3 className="font-bold text-sm text-slate-800">
                  {activeModal === 'IN' && 'Catat Kas Masuk (BKM)'}
                  {activeModal === 'OUT' && 'Catat Kas Keluar (BKK)'}
                  {activeModal === 'TRANSFER' && 'Transfer Antar Kas & Bank (TRF)'}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
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
                    Tanggal Transaksi
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
                    Nominal Transaksi (Rp)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Contoh: 250000"
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Pemilihan Akun Kas & Akun Lawan */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {activeModal === 'TRANSFER' ? 'Dari Kas/Bank (Sumber)' : 'Rekening Kas/Bank'}
                  </label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {cashAccounts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {activeModal === 'IN' && 'Akun Lawan (Sumber Penerimaan)'}
                    {activeModal === 'OUT' && 'Akun Beban (Tujuan Pengeluaran)'}
                    {activeModal === 'TRANSFER' && 'Ke Kas/Bank (Tujuan)'}
                  </label>
                  <select
                    value={formData.oppositeAccountId}
                    onChange={(e) => setFormData({ ...formData, oppositeAccountId: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {activeModal === 'IN' &&
                      revenueAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}

                    {activeModal === 'OUT' &&
                      expenseAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}

                    {activeModal === 'TRANSFER' &&
                      cashAccounts
                        .filter((c) => c.id !== formData.accountId)
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              {activeModal !== 'TRANSFER' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {activeModal === 'IN' ? 'Diterima Dari (Pihak Pembayar)' : 'Dibayarkan Kepada (Penerima)'}
                  </label>
                  <input
                    type="text"
                    value={formData.recipientOrPayer}
                    onChange={(e) => setFormData({ ...formData, recipientOrPayer: e.target.value })}
                    placeholder={activeModal === 'IN' ? 'Nama pelanggan / penyetor dana' : 'Nama toko / karyawan / vendor'}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Memo Transaksi
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Rincian keperluan pengeluaran atau sumber penerimaan..."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                ></textarea>
              </div>

              {/* Double-Entry Preview Box */}
              <div className="p-3 rounded-lg bg-slate-100 text-[11px] text-slate-600 font-mono">
                <span className="font-bold text-slate-700 block mb-1">Auto-Posting Jurnal Akuntansi:</span>
                {activeModal === 'IN' && (
                  <>
                    <p className="text-emerald-700">Debit: Kas/Bank Penerima (+)</p>
                    <p className="text-blue-700">Kredit: Akun Pendapatan/Modal (+)</p>
                  </>
                )}
                {activeModal === 'OUT' && (
                  <>
                    <p className="text-blue-700">Debit: Beban Operasional/HPP (+)</p>
                    <p className="text-rose-700">Kredit: Kas/Bank Pengirim (-)</p>
                  </>
                )}
                {activeModal === 'TRANSFER' && (
                  <>
                    <p className="text-emerald-700">Debit: Kas/Bank Tujuan (+)</p>
                    <p className="text-rose-700">Kredit: Kas/Bank Asal (-)</p>
                  </>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50 ${
                    activeModal === 'IN'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : activeModal === 'OUT'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-slate-800 hover:bg-slate-900'
                  }`}
                >
                  {isSubmitting ? 'Memproses...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
