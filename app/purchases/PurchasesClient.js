'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Truck,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  ShoppingBag,
  Trash2,
  PackageCheck,
} from 'lucide-react';

export default function PurchasesClient({
  initialPurchases,
  suppliers,
  items,
  cashAccounts,
}) {
  const router = useRouter();
  const [purchases, setPurchases] = useState(initialPurchases || []);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // State Modal Pembelian Baru
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    supplierId: suppliers[0]?.id || '',
    paymentType: 'CASH', // CASH, TEMPO, PARTIAL
    cashAccountId: cashAccounts[0]?.id || '',
    paidAmount: '',
    notes: '',
    items: [
      { itemId: items[0]?.id || '', quantity: '10', unitPrice: items[0]?.costPrice || '35000' },
    ],
  });

  // State Modal Stock Opname
  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);
  const [opnameForm, setOpnameForm] = useState({
    itemId: items[0]?.id || '',
    physicalStock: '',
    date: new Date().toISOString().split('T')[0],
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

  // Kalkulasi Summary
  let totalPurchasesAmount = 0;
  let totalUnpaidPayables = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  purchases.forEach((p) => {
    const tot = parseFloat(p.totalAmount.toString());
    const paid = parseFloat(p.paidAmount.toString());
    totalPurchasesAmount += tot;
    const unpaid = Math.max(0, tot - paid);
    totalUnpaidPayables += unpaid;

    if (p.paymentStatus === 'PAID') paidCount++;
    else unpaidCount++;
  });

  // Kalkulasi Total Modal Pembelian
  const calculateTotalModal = () => {
    return purchaseForm.items.reduce((sum, line) => {
      const q = parseFloat(line.quantity) || 0;
      const p = parseFloat(line.unitPrice) || 0;
      return sum + q * p;
    }, 0);
  };

  const totalModalAmount = calculateTotalModal();

  const handleLineChange = (index, field, value) => {
    const updated = [...purchaseForm.items];
    updated[index][field] = value;
    if (field === 'itemId') {
      const selItem = items.find((it) => it.id === value);
      if (selItem) {
        updated[index]['unitPrice'] = selItem.costPrice || '0';
      }
    }
    setPurchaseForm({ ...purchaseForm, items: updated });
  };

  const addLine = () => {
    setPurchaseForm({
      ...purchaseForm,
      items: [
        ...purchaseForm.items,
        { itemId: items[0]?.id || '', quantity: '1', unitPrice: items[0]?.costPrice || '0' },
      ],
    });
  };

  const removeLine = (index) => {
    if (purchaseForm.items.length <= 1) {
      alert('Minimal harus ada 1 item barang dalam faktur pembelian.');
      return;
    }
    const updated = purchaseForm.items.filter((_, i) => i !== index);
    setPurchaseForm({ ...purchaseForm, items: updated });
  };

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    let calculatedPaid = '0';
    if (purchaseForm.paymentType === 'CASH') {
      calculatedPaid = totalModalAmount.toString();
    } else if (purchaseForm.paymentType === 'PARTIAL') {
      calculatedPaid = purchaseForm.paidAmount || '0';
    }

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: purchaseForm.date,
          dueDate: purchaseForm.dueDate || null,
          supplierId: purchaseForm.supplierId,
          items: purchaseForm.items,
          cashAccountId: purchaseForm.paymentType !== 'TEMPO' ? purchaseForm.cashAccountId : null,
          paidAmount: calculatedPaid,
          notes: purchaseForm.notes,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || 'Gagal menyimpan faktur pembelian.');
        setIsSubmitting(false);
        return;
      }

      setPurchases([data.purchase, ...purchases]);
      setIsPurchaseModalOpen(false);
      router.refresh();
    } catch (err) {
      setFormError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitOpname = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/inventory/opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opnameForm),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || 'Gagal memproses stock opname.');
        setIsSubmitting(false);
        return;
      }

      alert(data.message);
      setIsOpnameModalOpen(false);
      router.refresh();
    } catch (err) {
      setFormError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const matchStatus = filterStatus === 'ALL' || p.paymentStatus === filterStatus;
    const matchSearch =
      p.purchaseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchSearch;
  });

  // Selected item info for opname
  const selectedOpnameItem = items.find((i) => i.id === opnameForm.itemId);
  const systemStockOpname = selectedOpnameItem ? parseFloat(selectedOpnameItem.currentStock.toString()) : 0;
  const realStockOpname = parseFloat(opnameForm.physicalStock) || 0;
  const opnameDiff = opnameForm.physicalStock !== '' ? realStockOpname - systemStockOpname : 0;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-800">Pembelian & Stok Bahan Sablon</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Otomasi HPP & Kartu Stok
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengadaan bahan kaos polos, tinta plastisol, PET film DTF, dan pengelolaan utang ke pemasok.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsOpnameModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            <span>Stock Opname Fisik</span>
          </button>

          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Pembelian Bahan Baru</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-financial p-4 border-l-4 border-l-blue-600">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Pembelian Bahan
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {formatRupiah(totalPurchasesAmount)}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Dari {purchases.length} transaksi pengadaan bahan
          </p>
        </div>

        <div className="card-financial p-4 border-l-4 border-l-rose-500">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block mb-1">
            Utang Usaha ke Pemasok
          </span>
          <div className="text-2xl font-extrabold text-rose-700 font-mono">
            {formatRupiah(totalUnpaidPayables)}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {unpaidCount} faktur belum lunas / tempo
          </p>
        </div>

        <div className="card-financial p-4 border-l-4 border-l-emerald-600">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
            Faktur Pembelian Lunas
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {paidCount} <span className="text-xs font-normal text-slate-400">Faktur</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-2">
            Pembayaran lunas via Kas/Bank
          </p>
        </div>

        <div className="card-financial p-4 border-l-4 border-l-amber-500">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block mb-1">
            Mitra Pemasok Aktif
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {suppliers.length} <span className="text-xs font-normal text-slate-400">Vendor</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Distributor Kaos & Tinta Sablon
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="card-financial p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'ALL', label: 'Semua Pembelian' },
              { key: 'UNPAID', label: 'Belum Lunas (Tempo)' },
              { key: 'PARTIAL', label: 'DP / Sebagian' },
              { key: 'PAID', label: 'Lunas' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterStatus(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterStatus === t.key
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
              placeholder="Cari no. faktur, pemasok..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Tabel Faktur Pembelian */}
      <div className="card-financial p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-financial">
            <thead>
              <tr>
                <th className="w-36">No. Faktur & Tanggal</th>
                <th>Pemasok (Vendor)</th>
                <th>Item Bahan Sablon</th>
                <th className="text-right w-32">Total Beli (Rp)</th>
                <th className="text-right w-32">Dibayar (Rp)</th>
                <th className="text-right w-32">Sisa Utang (Rp)</th>
                <th className="text-center w-28">Status</th>
                <th className="text-center w-28">Jurnal</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400 text-xs">
                    Belum ada faktur pembelian yang tercatat.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => {
                  const total = parseFloat(p.totalAmount.toString());
                  const paid = parseFloat(p.paidAmount.toString());
                  const unpaid = Math.max(0, total - paid);

                  return (
                    <tr key={p.id}>
                      <td>
                        <span className="font-mono font-bold text-xs text-slate-900 block">
                          {p.purchaseNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(p.date).toLocaleDateString('id-ID')}
                        </span>
                        {p.dueDate && (
                          <span className="text-[10px] text-amber-700 block mt-0.5">
                            Tempo: {new Date(p.dueDate).toLocaleDateString('id-ID')}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-slate-800 block">
                          {p.supplier?.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {p.supplier?.phone || '-'}
                        </span>
                      </td>
                      <td className="text-xs text-slate-700">
                        {p.items && p.items.length > 0 ? (
                          <div className="space-y-0.5">
                            {p.items.map((it) => (
                              <div key={it.id} className="text-[11px]">
                                <span className="font-semibold text-slate-800">{it.item?.name}</span>{' '}
                                <span className="text-slate-500 font-mono">
                                  ({it.quantity} {it.item?.unit} @ {formatRupiah(it.unitPrice)})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="text-right font-mono font-bold text-xs text-slate-900">
                        {formatRupiah(total)}
                      </td>
                      <td className="text-right font-mono text-xs text-emerald-700">
                        {formatRupiah(paid)}
                      </td>
                      <td
                        className={`text-right font-mono text-xs font-bold ${
                          unpaid > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {formatRupiah(unpaid)}
                      </td>
                      <td className="text-center">
                        {p.paymentStatus === 'PAID' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            Lunas
                          </span>
                        )}
                        {p.paymentStatus === 'PARTIAL' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                            DP / Sebagian
                          </span>
                        )}
                        {p.paymentStatus === 'UNPAID' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                            Tempo (Utang)
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        {p.journalEntry ? (
                          <Link
                            href={`/journals?search=${p.journalEntry.entryNumber}`}
                            className="inline-flex items-center space-x-1 font-mono text-[11px] text-emerald-600 hover:text-emerald-800 hover:underline"
                            title="Buka Jurnal Double-Entry"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{p.journalEntry.entryNumber}</span>
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

      {/* MODAL INPUT PEMBELIAN BARU */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">Faktur Pembelian Bahan Sablon Baru</h3>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pemasok (Vendor Bahan)
                  </label>
                  <select
                    value={purchaseForm.supplierId}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Pembelian
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseForm.date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jatuh Tempo (Jika Tempo)
                  </label>
                  <input
                    type="date"
                    value={purchaseForm.dueDate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, dueDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Tabel Baris Item Pembelian */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">Daftar Bahan yang Dibeli</span>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600">
                        <th className="p-2 text-left">Item Bahan</th>
                        <th className="p-2 text-center w-24">Kuantitas</th>
                        <th className="p-2 text-right w-36">Harga Beli Satuan</th>
                        <th className="p-2 text-right w-36">Subtotal</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseForm.items.map((line, idx) => {
                        const lineSub = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
                        return (
                          <tr key={idx} className="bg-white">
                            <td className="p-2">
                              <select
                                value={line.itemId}
                                onChange={(e) => handleLineChange(idx, 'itemId', e.target.value)}
                                className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800"
                              >
                                {items.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    {it.name} ({it.unit})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={line.quantity}
                                onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                                className="w-full p-1.5 font-mono text-center bg-slate-50 border border-slate-300 rounded text-xs text-slate-800"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={line.unitPrice}
                                onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                                className="w-full p-1.5 font-mono text-right bg-slate-50 border border-slate-300 rounded text-xs text-slate-800"
                              />
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-800">
                              {formatRupiah(lineSub)}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td colSpan="3" className="p-2.5 text-right text-slate-600">
                          Total Pembelian:
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-800 text-sm">
                          {formatRupiah(totalModalAmount)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Pilihan Metode Pembayaran */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Metode Pembayaran</span>
                <div className="grid grid-cols-3 gap-3">
                  <label
                    className={`flex items-center justify-center p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                      purchaseForm.paymentType === 'CASH'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pType"
                      checked={purchaseForm.paymentType === 'CASH'}
                      onChange={() => setPurchaseForm({ ...purchaseForm, paymentType: 'CASH' })}
                      className="sr-only"
                    />
                    <span>Bayar Lunas Sekarang</span>
                  </label>

                  <label
                    className={`flex items-center justify-center p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                      purchaseForm.paymentType === 'TEMPO'
                        ? 'border-rose-500 bg-rose-50 text-rose-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pType"
                      checked={purchaseForm.paymentType === 'TEMPO'}
                      onChange={() => setPurchaseForm({ ...purchaseForm, paymentType: 'TEMPO' })}
                      className="sr-only"
                    />
                    <span>Tempo / Utang (Tanpa DP)</span>
                  </label>

                  <label
                    className={`flex items-center justify-center p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                      purchaseForm.paymentType === 'PARTIAL'
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pType"
                      checked={purchaseForm.paymentType === 'PARTIAL'}
                      onChange={() => setPurchaseForm({ ...purchaseForm, paymentType: 'PARTIAL' })}
                      className="sr-only"
                    />
                    <span>Bayar Sebagian / DP</span>
                  </label>
                </div>

                {purchaseForm.paymentType !== 'TEMPO' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Sumber Rekening Kas / Bank
                      </label>
                      <select
                        value={purchaseForm.cashAccountId}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, cashAccountId: e.target.value })}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {cashAccounts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {purchaseForm.paymentType === 'PARTIAL' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nominal DP / Uang Muka (Rp)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={totalModalAmount}
                          value={purchaseForm.paidAmount}
                          onChange={(e) => setPurchaseForm({ ...purchaseForm, paidAmount: e.target.value })}
                          placeholder="Contoh: 500000"
                          className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Pembelian
                </label>
                <input
                  type="text"
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  placeholder="Contoh: Pengadaan bahan sablon untuk orderan seragam kampung"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || totalModalAmount <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Memproses...' : 'Posting Pembelian & Tambah Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL STOCK OPNAME FISIK */}
      {isOpnameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">Stock Opname Fisik Bahan</h3>
              </div>
              <button
                onClick={() => setIsOpnameModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitOpname} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Bahan / Produk
                </label>
                <select
                  value={opnameForm.itemId}
                  onChange={(e) => setOpnameForm({ ...opnameForm, itemId: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} (Stok: {it.currentStock} {it.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-100 rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-600">Stok Tercatat Sistem:</span>
                <span className="font-mono font-bold text-slate-900">
                  {systemStockOpname} {selectedOpnameItem?.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Stok Fisik Riil di Workshop
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={opnameForm.physicalStock}
                  onChange={(e) => setOpnameForm({ ...opnameForm, physicalStock: e.target.value })}
                  placeholder="Hasil hitungan fisik di gudang"
                  className="w-full text-sm font-mono font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {opnameForm.physicalStock !== '' && (
                <div
                  className={`p-3 rounded-lg text-xs font-bold border flex items-center justify-between ${
                    opnameDiff === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : opnameDiff < 0
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}
                >
                  <span>
                    {opnameDiff === 0
                      ? 'Stok Cocok (Tidak ada selisih)'
                      : opnameDiff < 0
                      ? `Selisih Kurang: ${opnameDiff} ${selectedOpnameItem?.unit}`
                      : `Selisih Lebih: +${opnameDiff} ${selectedOpnameItem?.unit}`}
                  </span>
                  {opnameDiff !== 0 && (
                    <span className="font-mono">
                      Nilai: {formatRupiah(Math.abs(opnameDiff) * parseFloat(selectedOpnameItem?.costPrice || 0))}
                    </span>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan / Keterangan Penyesuaian
                </label>
                <input
                  type="text"
                  value={opnameForm.notes}
                  onChange={(e) => setOpnameForm({ ...opnameForm, notes: e.target.value })}
                  placeholder="Contoh: Kaos cacat jahitan pabrik / noda tinta sablon"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOpnameModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || opnameForm.physicalStock === ''}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyesuaikan...' : 'Posting Penyesuaian Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
