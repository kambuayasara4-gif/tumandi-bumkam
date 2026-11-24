'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  DollarSign,
  Trash2,
  Receipt,
  User,
} from 'lucide-react';

export default function SalesClient({
  initialSales,
  customers,
  items,
  cashAccounts,
}) {
  const router = useRouter();
  const [sales, setSales] = useState(initialSales || []);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // State Modal Penjualan Baru
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [salesForm, setSalesForm] = useState({
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    customerId: customers[0]?.id || '',
    discountAmount: '0',
    paymentType: 'CASH', // CASH, PARTIAL, UNPAID
    cashAccountId: cashAccounts[0]?.id || '',
    paidAmount: '',
    notes: '',
    items: [
      {
        itemId: items[0]?.id || '',
        description: 'Sablon DTF Custom',
        quantity: '12', // 1 lusin default
        unitPrice: items[0]?.sellingPrice || '65000',
      },
    ],
  });

  // State Modal Pembayaran Piutang
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState(null);
  const [payFormData, setPayFormData] = useState({
    amount: '',
    cashAccountId: cashAccounts[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
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
  let totalRevenue = 0;
  let totalReceivables = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  sales.forEach((s) => {
    const total = parseFloat(s.grandTotal.toString());
    const paid = parseFloat(s.paidAmount.toString());
    totalRevenue += total;
    const unpaid = Math.max(0, total - paid);
    totalReceivables += unpaid;

    if (s.paymentStatus === 'PAID') paidCount++;
    else unpaidCount++;
  });

  // Kalkulasi Subtotal & Grand Total Form
  const calculateSubtotal = () => {
    return salesForm.items.reduce((sum, line) => {
      const q = parseFloat(line.quantity) || 0;
      const p = parseFloat(line.unitPrice) || 0;
      return sum + q * p;
    }, 0);
  };

  const subtotalAmount = calculateSubtotal();
  const discountAmount = parseFloat(salesForm.discountAmount) || 0;
  const grandTotalAmount = Math.max(0, subtotalAmount - discountAmount);

  const handleLineChange = (index, field, value) => {
    const updated = [...salesForm.items];
    updated[index][field] = value;
    if (field === 'itemId') {
      const selItem = items.find((it) => it.id === value);
      if (selItem) {
        updated[index]['unitPrice'] = selItem.sellingPrice || '0';
      }
    }
    setSalesForm({ ...salesForm, items: updated });
  };

  const addLine = () => {
    setSalesForm({
      ...salesForm,
      items: [
        ...salesForm.items,
        {
          itemId: items[0]?.id || '',
          description: '',
          quantity: '1',
          unitPrice: items[0]?.sellingPrice || '0',
        },
      ],
    });
  };

  const removeLine = (index) => {
    if (salesForm.items.length <= 1) {
      alert('Minimal harus ada 1 rincian pesanan sablon.');
      return;
    }
    const updated = salesForm.items.filter((_, i) => i !== index);
    setSalesForm({ ...salesForm, items: updated });
  };

  const handleSubmitSales = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    let calculatedPaid = '0';
    if (salesForm.paymentType === 'CASH') {
      calculatedPaid = grandTotalAmount.toString();
    } else if (salesForm.paymentType === 'PARTIAL') {
      calculatedPaid = salesForm.paidAmount || '0';
    }

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: salesForm.date,
          dueDate: salesForm.dueDate || null,
          customerId: salesForm.customerId,
          items: salesForm.items,
          discountAmount: salesForm.discountAmount,
          cashAccountId: salesForm.paymentType !== 'UNPAID' ? salesForm.cashAccountId : null,
          paidAmount: calculatedPaid,
          notes: salesForm.notes,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || 'Gagal menyimpan faktur penjualan.');
        setIsSubmitting(false);
        return;
      }

      setSales([data.sales, ...sales]);
      setIsSalesModalOpen(false);
      router.refresh();
    } catch (err) {
      setFormError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPayModal = (invoice) => {
    const total = parseFloat(invoice.grandTotal.toString());
    const paid = parseFloat(invoice.paidAmount.toString());
    const unpaid = Math.max(0, total - paid);

    setSelectedInvoiceForPay(invoice);
    setPayFormData({
      amount: unpaid.toString(),
      cashAccountId: cashAccounts[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
    });
    setFormError('');
    setIsPayModalOpen(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/sales/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesInvoiceId: selectedInvoiceForPay.id,
          amount: payFormData.amount,
          cashAccountId: payFormData.cashAccountId,
          date: payFormData.date,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || 'Gagal mencatat pembayaran piutang.');
        setIsSubmitting(false);
        return;
      }

      setIsPayModalOpen(false);
      router.refresh();
    } catch (err) {
      setFormError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSales = sales.filter((s) => {
    const matchStatus = filterStatus === 'ALL' || s.paymentStatus === filterStatus;
    const matchSearch =
      s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-800">Penjualan & Pesanan Sablon</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Otomasi Piutang & HPP
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan order sablon kaos, penerimaan uang muka (DP), faktur penjualan, dan penagihan piutang.
          </p>
        </div>

        <button
          onClick={() => setIsSalesModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ Pesanan Sablon / Penjualan Baru</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-financial p-4 border-l-4 border-l-emerald-600">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Omzet Penjualan
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {formatRupiah(totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Dari {sales.length} pesanan sablon tercatat
          </p>
        </div>

        <div className="card-financial p-4 border-l-4 border-l-amber-500">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block mb-1">
            Total Piutang Pelanggan
          </span>
          <div className="text-2xl font-extrabold text-amber-800 font-mono">
            {formatRupiah(totalReceivables)}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {unpaidCount} pesanan belum lunas / baru bayar DP
          </p>
        </div>

        <div className="card-financial p-4 border-l-4 border-l-blue-600">
          <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block mb-1">
            Pesanan Sablon Lunas
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {paidCount} <span className="text-xs font-normal text-slate-400">Pesanan</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-2">
            Pembayaran telah diterima penuh
          </p>
        </div>

        <div className="card-financial p-4 border-l-4 border-l-slate-700">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Pelanggan Terdaftar
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {customers.length} <span className="text-xs font-normal text-slate-400">Kontak</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Instansi, gereja, komunitas, dan eceran
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="card-financial p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'ALL', label: 'Semua Pesanan' },
              { key: 'PARTIAL', label: 'Uang Muka / DP' },
              { key: 'UNPAID', label: 'Belum Bayar' },
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
              placeholder="Cari no. invoice, pemesan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Tabel Faktur Penjualan */}
      <div className="card-financial p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-financial">
            <thead>
              <tr>
                <th className="w-36">No. Invoice & Tanggal</th>
                <th>Pemesan (Pelanggan)</th>
                <th>Rincian Pesanan Sablon</th>
                <th className="text-right w-32">Total Nilai (Rp)</th>
                <th className="text-right w-32">Dibayar (Rp)</th>
                <th className="text-right w-32">Sisa Piutang (Rp)</th>
                <th className="text-center w-28">Status</th>
                <th className="text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400 text-xs">
                    Belum ada pesanan penjualan yang tercatat.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => {
                  const grandTotal = parseFloat(s.grandTotal.toString());
                  const paid = parseFloat(s.paidAmount.toString());
                  const unpaid = Math.max(0, grandTotal - paid);

                  return (
                    <tr key={s.id}>
                      <td>
                        <span className="font-mono font-bold text-xs text-slate-900 block">
                          {s.invoiceNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(s.date).toLocaleDateString('id-ID')}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-slate-800 block">
                          {s.customer?.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {s.customer?.phone || '-'}
                        </span>
                      </td>
                      <td className="text-xs text-slate-700">
                        {s.items && s.items.length > 0 ? (
                          <div className="space-y-0.5">
                            {s.items.map((it) => (
                              <div key={it.id} className="text-[11px]">
                                <span className="font-semibold text-slate-800">{it.item?.name}</span>{' '}
                                <span className="text-slate-500 font-mono">
                                  ({it.quantity} {it.item?.unit} @ {formatRupiah(it.unitPrice)})
                                </span>
                                {it.description && (
                                  <span className="text-slate-400 block italic text-[10px]">
                                    {it.description}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="text-right font-mono font-bold text-xs text-slate-900">
                        {formatRupiah(grandTotal)}
                      </td>
                      <td className="text-right font-mono text-xs text-emerald-700 font-semibold">
                        {formatRupiah(paid)}
                      </td>
                      <td
                        className={`text-right font-mono text-xs font-bold ${
                          unpaid > 0 ? 'text-amber-800' : 'text-slate-400'
                        }`}
                      >
                        {formatRupiah(unpaid)}
                      </td>
                      <td className="text-center">
                        {s.paymentStatus === 'PAID' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            Lunas
                          </span>
                        )}
                        {s.paymentStatus === 'PARTIAL' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                            DP / Sebagian
                          </span>
                        )}
                        {s.paymentStatus === 'UNPAID' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                            Belum Bayar
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {unpaid > 0 && (
                            <button
                              onClick={() => openPayModal(s)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold shadow-sm"
                              title="Terima Pelunasan Piutang"
                            >
                              Bayar Sisa
                            </button>
                          )}
                          <Link
                            href={`/sales/${s.id}`}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
                            title="Cetak Nota / Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Link>
                          {s.journalEntry && (
                            <Link
                              href={`/journals?search=${s.journalEntry.entryNumber}`}
                              className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200"
                              title="Lihat Jurnal Akuntansi"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INPUT PESANAN SABLON BARU */}
      {isSalesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">Pesanan Sablon / Penjualan Baru</h3>
              </div>
              <button
                onClick={() => setIsSalesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSales} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pelanggan / Pemesan
                  </label>
                  <select
                    value={salesForm.customerId}
                    onChange={(e) => setSalesForm({ ...salesForm, customerId: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Pesanan
                  </label>
                  <input
                    type="date"
                    required
                    value={salesForm.date}
                    onChange={(e) => setSalesForm({ ...salesForm, date: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Selesai / Jatuh Tempo
                  </label>
                  <input
                    type="date"
                    value={salesForm.dueDate}
                    onChange={(e) => setSalesForm({ ...salesForm, dueDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Tabel Baris Pesanan */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">Rincian Kaos & Pengerjaan Sablon</span>
                  <button
                    type="button"
                    onClick={addLine}
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
                        <th className="p-2 text-left">Item Bahan / Kaos</th>
                        <th className="p-2 text-left">Rincian Custom Sablon</th>
                        <th className="p-2 text-center w-20">Qty</th>
                        <th className="p-2 text-right w-28">Harga Satuan</th>
                        <th className="p-2 text-right w-32">Subtotal</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesForm.items.map((line, idx) => {
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
                                type="text"
                                value={line.description}
                                onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                                placeholder="Contoh: Sablon DTF Depan Belakang"
                                className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800"
                              />
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
                      <tr className="bg-slate-50 border-t border-slate-200">
                        <td colSpan="4" className="p-2 text-right text-slate-600 font-semibold">
                          Subtotal Pesanan:
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-800">
                          {formatRupiah(subtotalAmount)}
                        </td>
                        <td></td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td colSpan="4" className="p-2 text-right text-slate-600 font-semibold">
                          Diskon / Potongan Harga (Rp):
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={salesForm.discountAmount}
                            onChange={(e) => setSalesForm({ ...salesForm, discountAmount: e.target.value })}
                            className="w-full p-1 font-mono text-right text-xs bg-white border border-slate-300 rounded"
                          />
                        </td>
                        <td></td>
                      </tr>
                      <tr className="bg-emerald-50/60 font-bold border-t border-emerald-200">
                        <td colSpan="4" className="p-2.5 text-right text-emerald-900">
                          Grand Total Tagihan:
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-900 text-sm">
                          {formatRupiah(grandTotalAmount)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Pilihan Metode Pembayaran */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Status Pembayaran Pesanan</span>
                <div className="grid grid-cols-3 gap-3">
                  <label
                    className={`flex items-center justify-center p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                      salesForm.paymentType === 'CASH'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payType"
                      checked={salesForm.paymentType === 'CASH'}
                      onChange={() => setSalesForm({ ...salesForm, paymentType: 'CASH' })}
                      className="sr-only"
                    />
                    <span>Lunas Sekarang</span>
                  </label>

                  <label
                    className={`flex items-center justify-center p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                      salesForm.paymentType === 'PARTIAL'
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payType"
                      checked={salesForm.paymentType === 'PARTIAL'}
                      onChange={() => setSalesForm({ ...salesForm, paymentType: 'PARTIAL' })}
                      className="sr-only"
                    />
                    <span>Uang Muka / DP Pesanan</span>
                  </label>

                  <label
                    className={`flex items-center justify-center p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                      salesForm.paymentType === 'UNPAID'
                        ? 'border-rose-500 bg-rose-50 text-rose-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payType"
                      checked={salesForm.paymentType === 'UNPAID'}
                      onChange={() => setSalesForm({ ...salesForm, paymentType: 'UNPAID' })}
                      className="sr-only"
                    />
                    <span>Piutang Penuh (Bayar Nanti)</span>
                  </label>
                </div>

                {salesForm.paymentType !== 'UNPAID' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Penerimaan ke Rekening Kas / Bank
                      </label>
                      <select
                        value={salesForm.cashAccountId}
                        onChange={(e) => setSalesForm({ ...salesForm, cashAccountId: e.target.value })}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {cashAccounts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {salesForm.paymentType === 'PARTIAL' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nominal DP Diterima (Rp)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={grandTotalAmount}
                          value={salesForm.paidAmount}
                          onChange={(e) => setSalesForm({ ...salesForm, paidAmount: e.target.value })}
                          placeholder="Nominal DP dari pelanggan"
                          className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tambahan
                </label>
                <input
                  type="text"
                  value={salesForm.notes}
                  onChange={(e) => setSalesForm({ ...salesForm, notes: e.target.value })}
                  placeholder="Contoh: Pesanan seragam gereja perayaan Natal/Paskah Doyo Lama"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSalesModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || grandTotalAmount <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Memproses...' : 'Posting Pesanan & Auto HPP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TERIMA PEMBAYARAN PIUTANG */}
      {isPayModalOpen && selectedInvoiceForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  Pelunasan Piutang [{selectedInvoiceForPay.invoiceNumber}]
                </h3>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pelanggan:</span>
                  <span className="font-semibold text-slate-800">{selectedInvoiceForPay.customer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Tagihan:</span>
                  <span className="font-mono">{formatRupiah(selectedInvoiceForPay.grandTotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-800">
                  <span>Sisa Piutang:</span>
                  <span className="font-mono">
                    {formatRupiah(
                      parseFloat(selectedInvoiceForPay.grandTotal) - parseFloat(selectedInvoiceForPay.paidAmount)
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Penerimaan
                </label>
                <input
                  type="date"
                  required
                  value={payFormData.date}
                  onChange={(e) => setPayFormData({ ...payFormData, date: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Pembayaran Diterima (Rp)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={payFormData.amount}
                  onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
                  className="w-full text-sm font-mono font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rekening Penerima (Kas / Bank)
                </label>
                <select
                  value={payFormData.cashAccountId}
                  onChange={(e) => setPayFormData({ ...payFormData, cashAccountId: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {cashAccounts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Memproses...' : 'Posting Pelunasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
