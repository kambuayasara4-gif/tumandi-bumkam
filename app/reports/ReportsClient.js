'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Scale,
  Waves,
  Coins,
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  PieChart,
  ShoppingBag,
} from 'lucide-react';

export default function ReportsClient({
  setting,
  initialIncome,
  initialBalance,
  initialCashFlow,
  initialProfitSharing,
}) {
  const currentYear = new Date().getFullYear();

  // Active Tab
  const [activeTab, setActiveTab] = useState('income-statement');

  // Date Filter States
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Report Data States
  const [incomeData, setIncomeData] = useState(initialIncome);
  const [balanceData, setBalanceData] = useState(initialBalance);
  const [cashFlowData, setCashFlowData] = useState(initialCashFlow);
  const [profitSharingData, setProfitSharingData] = useState(initialProfitSharing);
  const [salesSummaryData, setSalesSummaryData] = useState(null);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [postingProfitSharing, setPostingProfitSharing] = useState(false);
  const [profitModalOpen, setProfitModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Preset Date Range Handler
  const applyPreset = (preset) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();

    if (preset === 'this_month') {
      const firstDay = new Date(y, m, 1).toISOString().split('T')[0];
      const lastDay = new Date(y, m + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
      setAsOfDate(lastDay);
    } else if (preset === 'this_quarter') {
      const qMonth = Math.floor(m / 3) * 3;
      const firstDay = new Date(y, qMonth, 1).toISOString().split('T')[0];
      const lastDay = new Date(y, qMonth + 3, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
      setAsOfDate(lastDay);
    } else if (preset === 'ytd') {
      setStartDate(`${y}-01-01`);
      const todayStr = today.toISOString().split('T')[0];
      setEndDate(todayStr);
      setAsOfDate(todayStr);
    } else if (preset === 'full_year') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
      setAsOfDate(`${y}-12-31`);
    }
  };

  // Fetch Report Data based on Active Tab
  const fetchReport = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      if (activeTab === 'income-statement') {
        const res = await fetch(`/api/reports/income-statement?startDate=${startDate}&endDate=${endDate}`);
        const json = await res.json();
        if (json.success) setIncomeData(json.data);
      } else if (activeTab === 'balance-sheet') {
        const res = await fetch(`/api/reports/balance-sheet?asOfDate=${asOfDate}`);
        const json = await res.json();
        if (json.success) setBalanceData(json.data);
      } else if (activeTab === 'cash-flow') {
        const res = await fetch(`/api/reports/cash-flow?startDate=${startDate}&endDate=${endDate}`);
        const json = await res.json();
        if (json.success) setCashFlowData(json.data);
      } else if (activeTab === 'profit-sharing') {
        const res = await fetch(`/api/reports/profit-sharing?year=${selectedYear}`);
        const json = await res.json();
        if (json.success) setProfitSharingData(json.data);
      } else if (activeTab === 'sales-summary') {
        const res = await fetch(`/api/reports/sales-summary?startDate=${startDate}&endDate=${endDate}`);
        const json = await res.json();
        if (json.success) setSalesSummaryData(json);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setStatusMessage({ type: 'error', text: 'Gagal memperbarui data laporan: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab]);

  // Handler for Posting Profit Sharing
  const handlePostProfitSharing = async () => {
    setPostingProfitSharing(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/reports/profit-sharing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: 'success', text: json.message });
        setProfitModalOpen(false);
        // Refresh profit sharing & balance sheet
        fetchReport();
      } else {
        setStatusMessage({ type: 'error', text: json.message });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Gagal membukukan: ' + err.message });
    } finally {
      setPostingProfitSharing(false);
    }
  };

  // Trigger Excel Download
  const handleExportExcel = () => {
    let url = `/api/reports/export?type=${activeTab}&startDate=${startDate}&endDate=${endDate}&asOfDate=${asOfDate}&year=${selectedYear}`;
    window.open(url, '_blank');
  };

  // Trigger Window Print
  const handlePrint = () => {
    window.print();
  };

  const formatRupiah = (val) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* KOP SURAT CETAK RESMI (HANYA MUNCUL SAAT CETAK / PRINT) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
              {setting?.bumkamName || 'BUMKam Tungkuwiri Mandiri'}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {setting?.villageName || 'Kampung Doyo Lama'}, {setting?.districtName || 'Distrik Waibu'},{' '}
              {setting?.regencyName || 'Kabupaten Jayapura'} - Papua
            </p>
            <p className="text-[11px] text-slate-500">
              Unit Usaha: {setting?.businessType || 'Pencetakan Baju Kaos (Sablon) & Konveksi'}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 text-[11px] font-bold border border-slate-800 rounded">
              STANDAR SAK EMKM
            </span>
            <p className="text-[10px] text-slate-500 mt-1">
              Dicetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
            </p>
          </div>
        </div>
      </div>

      {/* HEADER UTAMA & NAVIGASI TAB (DISEMBUNYIKAN SAAT PRINT) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Standar Keuangan SAK EMKM BUMKam</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Laporan Keuangan & Hasil Usaha</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Transparansi akuntansi BUMKam Tungkuwiri Mandiri, Kampung Doyo Lama.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm"
              title="Unduh Laporan dalam Format Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
              title="Cetak Dokumen atau Simpan sebagai PDF Resmi Ber-Kop Surat"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak PDF</span>
            </button>
          </div>
        </div>

        {/* TAB MENU */}
        <div className="flex overflow-x-auto no-scrollbar space-x-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('income-statement')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'income-statement'
                ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Laba Rugi</span>
          </button>
          <button
            onClick={() => setActiveTab('balance-sheet')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'balance-sheet'
                ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Posisi Keuangan (Neraca)</span>
          </button>
          <button
            onClick={() => setActiveTab('cash-flow')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'cash-flow'
                ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Waves className="w-4 h-4" />
            <span>Arus Kas</span>
          </button>
          <button
            onClick={() => setActiveTab('profit-sharing')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'profit-sharing'
                ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Pembagian PADKam</span>
          </button>
          <button
            onClick={() => setActiveTab('sales-summary')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'sales-summary'
                ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Rekap Penjualan & Produk</span>
          </button>
        </div>

        {/* STATUS ALERT NOTIFICATION */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between text-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs font-semibold hover:underline ml-4"
            >
              Tutup
            </button>
          </div>
        )}

        {/* FILTER BAR */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          {activeTab === 'balance-sheet' ? (
            <div className="flex items-center space-x-3">
              <label className="text-xs font-semibold text-slate-600 uppercase">Posisi Per Tanggal:</label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={fetchReport}
                disabled={loading}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
              >
                {loading ? 'Memuat...' : 'Terapkan'}
              </button>
            </div>
          ) : activeTab === 'profit-sharing' ? (
            <div className="flex items-center space-x-3">
              <label className="text-xs font-semibold text-slate-600 uppercase">Tahun Buku:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                {[2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchReport}
                disabled={loading}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
              >
                {loading ? 'Memuat...' : 'Terapkan'}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-600 uppercase">Dari:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-600 uppercase">Sampai:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={fetchReport}
                disabled={loading}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
              >
                {loading ? 'Memuat...' : 'Terapkan'}
              </button>
            </div>
          )}

          {/* Quick Presets */}
          {activeTab !== 'profit-sharing' && (
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-600 hidden lg:inline mr-1">Pilihan Cepat:</span>
              <button
                onClick={() => applyPreset('this_month')}
                className="px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                Bulan Ini
              </button>
              <button
                onClick={() => applyPreset('this_quarter')}
                className="px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                Kuartal
              </button>
              <button
                onClick={() => applyPreset('ytd')}
                className="px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                YTD
              </button>
              <button
                onClick={() => applyPreset('full_year')}
                className="px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                1 Tahun
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. KONTEN TAB: LAPORAN LABA RUGI */}
      {/* ======================================================== */}
      {activeTab === 'income-statement' && incomeData && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="text-center border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">Laporan Laba Rugi</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Periode Pembukuan: {new Date(incomeData.period.startDate).toLocaleDateString('id-ID')} s/d{' '}
              {new Date(incomeData.period.endDate).toLocaleDateString('id-ID')}
            </p>
          </div>

          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4">
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Total Pendapatan</p>
              <p className="text-xl font-bold text-emerald-900 mt-1">{formatRupiah(incomeData.totalRevenue)}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Omzet Penjualan Sablon & Kaos</p>
            </div>
            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Beban Pokok (HPP)</p>
              <p className="text-xl font-bold text-amber-900 mt-1">{formatRupiah(incomeData.totalHpp)}</p>
              <p className="text-[11px] text-amber-600 mt-0.5">Pemakaian Kaos & Tinta Sablon</p>
            </div>
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100">
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Laba Kotor</p>
              <p className="text-xl font-bold text-blue-900 mt-1">{formatRupiah(incomeData.grossProfit)}</p>
              <p className="text-[11px] text-blue-600 mt-0.5">Pendapatan - Beban Pokok</p>
            </div>
            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100">
              <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Laba Bersih Berjalan</p>
              <p className="text-xl font-bold text-purple-900 mt-1">{formatRupiah(incomeData.netProfit)}</p>
              <p className="text-[11px] text-purple-600 mt-0.5">Margin: {incomeData.profitMarginPercent}%</p>
            </div>
          </div>

          {/* Detailed Statement Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left w-24">Kode</th>
                  <th className="px-4 py-3 text-left">Uraian Akun Keuangan</th>
                  <th className="px-4 py-3 text-right w-44">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. Pendapatan */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan="2" className="px-4 py-2.5">
                    1. PENDAPATAN USAHA (REVENUE)
                  </td>
                  <td className="px-4 py-2.5 text-right"></td>
                </tr>
                {incomeData.revenues.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-xs font-mono text-slate-500 pl-6">{rev.code}</td>
                    <td className="px-4 py-2 text-slate-800">{rev.name}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900">{formatRupiah(rev.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-emerald-50/40 font-semibold text-emerald-950">
                  <td colSpan="2" className="px-4 py-2 text-right">
                    Subtotal Pendapatan Usaha:
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-emerald-700">
                    {formatRupiah(incomeData.totalRevenue)}
                  </td>
                </tr>

                {/* 2. Beban Pokok Penjualan (HPP) */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan="2" className="px-4 py-2.5 pt-4">
                    2. BEBAN POKOK PENJUALAN (HPP)
                  </td>
                  <td className="px-4 py-2.5 text-right"></td>
                </tr>
                {incomeData.cogsItems.map((hpp) => (
                  <tr key={hpp.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-xs font-mono text-slate-500 pl-6">{hpp.code}</td>
                    <td className="px-4 py-2 text-slate-800">{hpp.name}</td>
                    <td className="px-4 py-2 text-right font-medium text-amber-900">
                      ({formatRupiah(hpp.amount)})
                    </td>
                  </tr>
                ))}
                <tr className="bg-amber-50/40 font-semibold text-amber-950">
                  <td colSpan="2" className="px-4 py-2 text-right">
                    Subtotal Beban Pokok:
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-amber-700">
                    ({formatRupiah(incomeData.totalHpp)})
                  </td>
                </tr>

                {/* LABA KOTOR */}
                <tr className="bg-blue-50/60 font-bold text-blue-950 border-t-2 border-b-2 border-blue-200">
                  <td colSpan="2" className="px-4 py-3 text-base">
                    LABA KOTOR (GROSS PROFIT)
                  </td>
                  <td className="px-4 py-3 text-right text-base text-blue-800">
                    {formatRupiah(incomeData.grossProfit)}
                  </td>
                </tr>

                {/* 3. Beban Operasional */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan="2" className="px-4 py-2.5 pt-4">
                    3. BEBAN OPERASIONAL & ADMINISTRASI
                  </td>
                  <td className="px-4 py-2.5 text-right"></td>
                </tr>
                {incomeData.operatingExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-xs font-mono text-slate-500 pl-6">{exp.code}</td>
                    <td className="px-4 py-2 text-slate-800">{exp.name}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900">
                      ({formatRupiah(exp.amount)})
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold text-slate-900">
                  <td colSpan="2" className="px-4 py-2 text-right">
                    Subtotal Beban Operasional:
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-slate-900">
                    ({formatRupiah(incomeData.totalOperatingExpenses)})
                  </td>
                </tr>

                {/* Non-Operasional jika ada */}
                {incomeData.otherRevenues.length > 0 || incomeData.otherExpenses.length > 0 ? (
                  <>
                    <tr className="bg-slate-50/80 font-bold text-slate-900">
                      <td colSpan="2" className="px-4 py-2.5 pt-4">
                        4. PENDAPATAN & (BEBAN) NON-OPERASIONAL
                      </td>
                      <td className="px-4 py-2.5 text-right"></td>
                    </tr>
                    {incomeData.otherRevenues.map((rev) => (
                      <tr key={rev.id}>
                        <td className="px-4 py-2 text-xs font-mono text-slate-500 pl-6">{rev.code}</td>
                        <td className="px-4 py-2 text-slate-800">{rev.name}</td>
                        <td className="px-4 py-2 text-right font-medium text-slate-900">{formatRupiah(rev.amount)}</td>
                      </tr>
                    ))}
                    {incomeData.otherExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="px-4 py-2 text-xs font-mono text-slate-500 pl-6">{exp.code}</td>
                        <td className="px-4 py-2 text-slate-800">{exp.name}</td>
                        <td className="px-4 py-2 text-right font-medium text-slate-900">({formatRupiah(exp.amount)})</td>
                      </tr>
                    ))}
                  </>
                ) : null}

                {/* LABA BERSIH TAHUN BERJALAN */}
                <tr className="bg-emerald-600 text-white font-bold text-base border-t-2 border-slate-900">
                  <td colSpan="2" className="px-4 py-3.5 tracking-wide">
                    LABA BERSIH PERIODE BERJALAN (NET PROFIT)
                  </td>
                  <td className="px-4 py-3.5 text-right text-lg font-mono">
                    {formatRupiah(incomeData.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. KONTEN TAB: LAPORAN POSISI KEUANGAN / NERACA */}
      {/* ======================================================== */}
      {activeTab === 'balance-sheet' && balanceData && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="text-center border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
              Laporan Posisi Keuangan (Neraca)
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Posisi Per Tanggal: {new Date(balanceData.asOfDate).toLocaleDateString('id-ID')}
            </p>
          </div>

          {/* Balance Indicator Banner */}
          <div
            className={`p-4 rounded-xl flex items-center justify-between border ${
              balanceData.isBalanced
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              {balanceData.isBalanced ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p className="font-bold text-sm">
                  {balanceData.isBalanced
                    ? 'NERACA SEIMBANG MUTLAK (BALANCE)'
                    : 'NERACA TIDAK SEIMBANG! ADA SELISIH PEMBUKUAN'}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Total Aset: {formatRupiah(balanceData.assets.totalAssets)} = Total Kewajiban & Ekuitas:{' '}
                  {formatRupiah(balanceData.totalLiabilitiesAndEquity)} (Selisih: {formatRupiah(balanceData.difference)})
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-sm font-bold">
              {balanceData.isBalanced ? (
                <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs">SELISIH: RP 0</span>
              ) : (
                <span className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs">
                  SELISIH: {formatRupiah(balanceData.difference)}
                </span>
              )}
            </div>
          </div>

          {/* Two-Column Grid: Aktiva (Aset) vs Pasiva (Kewajiban & Ekuitas) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
            {/* SISI KIRI: ASET (AKTIVA) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-900 text-sm uppercase tracking-wide">ASET (AKTIVA)</span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  {formatRupiah(balanceData.assets.totalAssets)}
                </span>
              </div>

              <div className="p-4 space-y-4 flex-1">
                {/* 1. Aset Lancar */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">
                    A. Aset Lancar
                  </h4>

                  {/* Kas & Bank */}
                  <div className="space-y-1 pl-2 mb-3">
                    <p className="text-xs font-semibold text-slate-600">Kas & Setara Kas</p>
                    {balanceData.assets.currentAssets.cashAndBank.map((c) => (
                      <div key={c.id} className="flex justify-between text-xs text-slate-700 pl-2">
                        <span>{c.name}</span>
                        <span className="font-mono">{formatRupiah(c.amount)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Piutang Usaha */}
                  <div className="space-y-1 pl-2 mb-3">
                    <p className="text-xs font-semibold text-slate-600">Piutang Usaha</p>
                    {balanceData.assets.currentAssets.receivables.map((r) => (
                      <div key={r.id} className="flex justify-between text-xs text-slate-700 pl-2">
                        <span>{r.name}</span>
                        <span className="font-mono">{formatRupiah(r.amount)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Persediaan */}
                  <div className="space-y-1 pl-2 mb-3">
                    <p className="text-xs font-semibold text-slate-600">Persediaan Bahan Sablon & Kaos</p>
                    {balanceData.assets.currentAssets.inventories.map((i) => (
                      <div key={i.id} className="flex justify-between text-xs text-slate-700 pl-2">
                        <span>{i.name}</span>
                        <span className="font-mono">{formatRupiah(i.amount)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between text-xs font-bold text-slate-900 bg-slate-50 px-2 py-1.5 rounded">
                    <span>Subtotal Aset Lancar:</span>
                    <span className="font-mono">{formatRupiah(balanceData.assets.currentAssets.totalCurrentAssets)}</span>
                  </div>
                </div>

                {/* 2. Aset Tetap */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">
                    B. Aset Tetap & Peralatan
                  </h4>
                  <div className="space-y-1 pl-2 mb-3">
                    {balanceData.assets.fixedAssets.items.map((f) => (
                      <div key={f.id} className="flex justify-between text-xs text-slate-700">
                        <span>{f.name}</span>
                        <span className="font-mono">{formatRupiah(f.amount)}</span>
                      </div>
                    ))}
                    {balanceData.assets.fixedAssets.accumulatedDepreciations.map((d) => (
                      <div key={d.id} className="flex justify-between text-xs text-amber-700">
                        <span>{d.name}</span>
                        <span className="font-mono">({formatRupiah(d.amount)})</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between text-xs font-bold text-slate-900 bg-slate-50 px-2 py-1.5 rounded">
                    <span>Nilai Buku Bersih Aset Tetap:</span>
                    <span className="font-mono">{formatRupiah(balanceData.assets.fixedAssets.netFixedAssets)}</span>
                  </div>
                </div>
              </div>

              {/* Total Aset */}
              <div className="bg-emerald-50 px-4 py-3 border-t border-emerald-200 flex justify-between items-center font-bold text-emerald-950 text-sm">
                <span>TOTAL ASET (AKTIVA)</span>
                <span className="font-mono text-base text-emerald-800">
                  {formatRupiah(balanceData.assets.totalAssets)}
                </span>
              </div>
            </div>

            {/* SISI KANAN: KEWAJIBAN & EKUITAS (PASIVA) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-900 text-sm uppercase tracking-wide">
                  KEWAJIBAN & EKUITAS (PASIVA)
                </span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  {formatRupiah(balanceData.totalLiabilitiesAndEquity)}
                </span>
              </div>

              <div className="p-4 space-y-4 flex-1">
                {/* 1. Kewajiban */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">
                    A. Kewajiban / Liabilitas
                  </h4>
                  <div className="space-y-1 pl-2 mb-3">
                    {balanceData.liabilities.currentLiabilities.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Tidak ada kewajiban lancar</p>
                    ) : (
                      balanceData.liabilities.currentLiabilities.map((l) => (
                        <div key={l.id} className="flex justify-between text-xs text-slate-700">
                          <span>{l.name}</span>
                          <span className="font-mono">{formatRupiah(l.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex justify-between text-xs font-bold text-slate-900 bg-slate-50 px-2 py-1.5 rounded">
                    <span>Total Kewajiban:</span>
                    <span className="font-mono">{formatRupiah(balanceData.liabilities.totalLiabilities)}</span>
                  </div>
                </div>

                {/* 2. Ekuitas */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">
                    B. Ekuitas / Modal
                  </h4>
                  <div className="space-y-1 pl-2 mb-3">
                    {balanceData.equity.accounts.map((e) => (
                      <div key={e.id} className="flex justify-between text-xs text-slate-700">
                        <span>{e.name}</span>
                        <span className="font-mono">{formatRupiah(e.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-medium text-emerald-700">
                      <span>Laba Bersih Tahun Berjalan (Unclosed)</span>
                      <span className="font-mono">{formatRupiah(balanceData.equity.currentEarnings)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs font-bold text-slate-900 bg-slate-50 px-2 py-1.5 rounded">
                    <span>Total Ekuitas:</span>
                    <span className="font-mono">{formatRupiah(balanceData.equity.totalEquity)}</span>
                  </div>
                </div>
              </div>

              {/* Total Pasiva */}
              <div className="bg-emerald-50 px-4 py-3 border-t border-emerald-200 flex justify-between items-center font-bold text-emerald-950 text-sm">
                <span>TOTAL PASIVA (KEWAJIBAN + EKUITAS)</span>
                <span className="font-mono text-base text-emerald-800">
                  {formatRupiah(balanceData.totalLiabilitiesAndEquity)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. KONTEN TAB: LAPORAN ARUS KAS */}
      {/* ======================================================== */}
      {activeTab === 'cash-flow' && cashFlowData && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="text-center border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">Laporan Arus Kas</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Metode Langsung (SAK EMKM) - Periode:{' '}
              {new Date(cashFlowData.period.startDate).toLocaleDateString('id-ID')} s/d{' '}
              {new Date(cashFlowData.period.endDate).toLocaleDateString('id-ID')}
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Aktivitas Arus Kas</th>
                  <th className="px-4 py-3 text-right w-52">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. Aktivitas Operasi */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan="2" className="px-4 py-2.5">
                    A. ARUS KAS DARI AKTIVITAS OPERASIONAL
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-8 text-slate-700">Penerimaan Kas dari Pelanggan Sablon</td>
                  <td className="px-4 py-2 text-right font-mono text-emerald-700">
                    {formatRupiah(cashFlowData.operating.inflow)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-8 text-slate-700">Pengeluaran Kas untuk Pembelian Bahan & Beban</td>
                  <td className="px-4 py-2 text-right font-mono text-amber-800">
                    ({formatRupiah(cashFlowData.operating.outflow)})
                  </td>
                </tr>
                <tr className="bg-slate-50 font-semibold text-slate-900">
                  <td className="px-4 py-2 text-right">Arus Kas Bersih dari Aktivitas Operasional:</td>
                  <td className="px-4 py-2 text-right font-mono font-bold">
                    {formatRupiah(cashFlowData.operating.net)}
                  </td>
                </tr>

                {/* 2. Aktivitas Investasi */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan="2" className="px-4 py-2.5 pt-4">
                    B. ARUS KAS DARI AKTIVITAS INVESTASI
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-8 text-slate-700">Perolehan / Pembelian Aset Tetap & Peralatan</td>
                  <td className="px-4 py-2 text-right font-mono text-amber-800">
                    ({formatRupiah(cashFlowData.investing.outflow)})
                  </td>
                </tr>
                <tr className="bg-slate-50 font-semibold text-slate-900">
                  <td className="px-4 py-2 text-right">Arus Kas Bersih dari Aktivitas Investasi:</td>
                  <td className="px-4 py-2 text-right font-mono font-bold">
                    {formatRupiah(cashFlowData.investing.net)}
                  </td>
                </tr>

                {/* 3. Aktivitas Pendanaan */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan="2" className="px-4 py-2.5 pt-4">
                    C. ARUS KAS DARI AKTIVITAS PENDANAAN
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-8 text-slate-700">Penyertaan Modal Awal Kampung Doyo Lama</td>
                  <td className="px-4 py-2 text-right font-mono text-emerald-700">
                    {formatRupiah(cashFlowData.financing.inflow)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-8 text-slate-700">Penyaluran Bagi Hasil PADKam</td>
                  <td className="px-4 py-2 text-right font-mono text-amber-800">
                    ({formatRupiah(cashFlowData.financing.outflow)})
                  </td>
                </tr>
                <tr className="bg-slate-50 font-semibold text-slate-900">
                  <td className="px-4 py-2 text-right">Arus Kas Bersih dari Aktivitas Pendanaan:</td>
                  <td className="px-4 py-2 text-right font-mono font-bold">
                    {formatRupiah(cashFlowData.financing.net)}
                  </td>
                </tr>

                {/* Summary Kas */}
                <tr className="bg-blue-50/60 font-semibold text-blue-950 border-t-2 border-blue-200">
                  <td className="px-4 py-2.5 text-right">Kenaikan / (Penurunan) Kas Bersih:</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-900">
                    {formatRupiah(cashFlowData.netCashChange)}
                  </td>
                </tr>
                <tr className="bg-slate-50 text-slate-700">
                  <td className="px-4 py-2 text-right">Saldo Awal Kas & Bank:</td>
                  <td className="px-4 py-2 text-right font-mono font-medium">
                    {formatRupiah(cashFlowData.beginningBalance)}
                  </td>
                </tr>
                <tr className="bg-emerald-600 text-white font-bold text-base">
                  <td className="px-4 py-3.5 tracking-wide">SALDO AKHIR KAS & BANK TERSEDIA</td>
                  <td className="px-4 py-3.5 text-right text-lg font-mono">
                    {formatRupiah(cashFlowData.endingBalance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. KONTEN TAB: PEMBAGIAN HASIL USAHA (PADKAM) */}
      {/* ======================================================== */}
      {activeTab === 'profit-sharing' && profitSharingData && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="text-center border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
              Laporan Alokasi Pembagian Hasil Usaha (PADKam)
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Berdasarkan AD/ART BUMKam Tungkuwiri Mandiri & Peraturan Kampung Doyo Lama - Tahun Buku {profitSharingData.fiscalYear}
            </p>
          </div>

          {/* Profit Summary Card */}
          <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl text-white shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
                Total Laba Bersih Tahun {profitSharingData.fiscalYear}
              </p>
              <h3 className="text-3xl font-extrabold mt-1">{formatRupiah(profitSharingData.netProfit)}</h3>
              <p className="text-xs text-emerald-100 mt-1">
                Laba bersih yang siap dibagikan sesuai persentase musyawarah kampung.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {profitSharingData.isAlreadyPosted ? (
                <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 text-xs font-bold text-white flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>SUDAH DIBUKUKAN KE JURNAL</span>
                </div>
              ) : (
                <button
                  onClick={() => setProfitModalOpen(true)}
                  disabled={profitSharingData.netProfit <= 0}
                  className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold transition shadow-sm flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>Bukukan Alokasi ke Jurnal</span>
                </button>
              )}
            </div>
          </div>

          {/* Allocation Breakdown Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Pos Alokasi Dana Hasil Usaha</th>
                  <th className="px-4 py-3 text-center w-36">Persentase (%)</th>
                  <th className="px-4 py-3 text-right w-52">Nominal Alokasi (Rp)</th>
                  <th className="px-4 py-3 text-left w-52">Tujuan Penggunaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">PADKam (Pendapatan Asli Desa/Kampung)</span>
                    <p className="text-xs text-slate-500">Penyetoran ke Kas Pemerintah Kampung Doyo Lama</p>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-700">
                    {profitSharingData.percentages.padkamPercent}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {formatRupiah(profitSharingData.allocations.padkamAmount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">Pembangunan & Kas Kampung</td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">Cadangan Modal Usaha</span>
                    <p className="text-xs text-slate-500">Penguatan modal kerja BUMKam & ekspansi sablon</p>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-blue-700">
                    {profitSharingData.percentages.reservePercent}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {formatRupiah(profitSharingData.allocations.reserveAmount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">Reinvestasi Mesin & Bahan</td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">Jasa Pengurus & Karyawan Sablon</span>
                    <p className="text-xs text-slate-500">Insentif prestasi kerja pengelola dan pekerja workshop</p>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-purple-700">
                    {profitSharingData.percentages.bonusPercent}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {formatRupiah(profitSharingData.allocations.bonusAmount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">Apresiasi Kinerja Tim</td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">Dana Sosial & Pendidikan Kampung</span>
                    <p className="text-xs text-slate-500">Bantuan warga kurang mampu & pembinaan pemuda Doyo Lama</p>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-amber-700">
                    {profitSharingData.percentages.socialPercent}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {formatRupiah(profitSharingData.allocations.socialAmount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">Sosial Kemasyarakatan</td>
                </tr>

                <tr className="bg-emerald-50/80 font-bold text-emerald-950 text-sm">
                  <td className="px-4 py-3 text-right">TOTAL ALOKASI (MUTLAK 100%):</td>
                  <td className="px-4 py-3 text-center text-emerald-800">
                    {profitSharingData.percentages.totalPercent}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-800">
                    {formatRupiah(profitSharingData.allocations.totalAllocated)}
                  </td>
                  <td className="px-4 py-3 text-xs text-emerald-700">Tervalidasi Sesuai Aturan</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800">Catatan Kebijakan:</span> Persentase pembagian di atas
              bersifat dinamis dan dapat disesuaikan pada menu{' '}
              <Link href="/settings" className="text-emerald-700 font-semibold underline">
                Pengaturan BUMKam & PADKam
              </Link>{' '}
              dengan syarat total penjumlahan harus tepat 100%.
            </div>
            <Link
              href="/settings"
              className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-medium ml-4 whitespace-nowrap"
            >
              Ubah Persentase
            </Link>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. KONTEN TAB: REKAP PENJUALAN & PRODUK */}
      {/* ======================================================== */}
      {activeTab === 'sales-summary' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="text-center border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
              Rekapitulasi Penjualan & Pembelian Sablon
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Analisis performa produk kaos, order pelanggan, dan biaya operasional bahan baku
            </p>
          </div>

          {loading || !salesSummaryData ? (
            <div className="text-center py-12 text-slate-500">Memuat rekapitulasi data penjualan...</div>
          ) : (
            <div className="space-y-6">
              {/* Sales Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase">Total Omzet Penjualan</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {formatRupiah(salesSummaryData.sales.totalSalesGross)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {salesSummaryData.sales.invoiceCount} transaksi pesanan
                  </p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-800 uppercase">Sudah Diterima (Kas/Lunas)</p>
                  <p className="text-xl font-bold text-emerald-900 mt-1">
                    {formatRupiah(salesSummaryData.sales.totalSalesPaid)}
                  </p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Dana masuk ke kas BUMKam</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs font-semibold text-amber-800 uppercase">Sisa Piutang Pelanggan</p>
                  <p className="text-xl font-bold text-amber-900 mt-1">
                    {formatRupiah(salesSummaryData.sales.totalSalesUnpaid)}
                  </p>
                  <p className="text-[11px] text-amber-600 mt-0.5">Belum lunas / tempo</p>
                </div>
              </div>

              {/* Top Products Table */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  <span>Rincian Penjualan Berdasarkan Produk & Jasa Sablon</span>
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Nama Produk / Jasa</th>
                        <th className="px-4 py-2.5 text-center w-28">Jumlah Terjual</th>
                        <th className="px-4 py-2.5 text-right w-40">Total Omzet</th>
                        <th className="px-4 py-2.5 text-right w-40">Total HPP</th>
                        <th className="px-4 py-2.5 text-right w-40">Laba Kotor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesSummaryData.sales.itemSummary.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-medium text-slate-800">{item.itemName}</td>
                          <td className="px-4 py-2 text-center font-mono">{item.quantity}</td>
                          <td className="px-4 py-2 text-right font-mono">{formatRupiah(item.totalSales)}</td>
                          <td className="px-4 py-2 text-right font-mono text-amber-800">
                            {formatRupiah(item.totalCost)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-emerald-700">
                            {formatRupiah(item.grossMargin)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Customer Breakdown Table */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Rekapitulasi Pelanggan & Instansi Pemesan</span>
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Nama Pelanggan</th>
                        <th className="px-4 py-2.5 text-center w-28">Total Order</th>
                        <th className="px-4 py-2.5 text-right w-40">Total Transaksi</th>
                        <th className="px-4 py-2.5 text-right w-40">Sudah Bayar</th>
                        <th className="px-4 py-2.5 text-right w-40">Sisa Piutang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesSummaryData.sales.customerSummary.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-medium text-slate-800">{c.customerName}</td>
                          <td className="px-4 py-2 text-center font-mono">{c.orderCount} pesanan</td>
                          <td className="px-4 py-2 text-right font-mono">{formatRupiah(c.totalAmount)}</td>
                          <td className="px-4 py-2 text-right font-mono text-emerald-700">
                            {formatRupiah(c.paidAmount)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-amber-800">
                            {formatRupiah(c.unpaidAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KOLOM TANDA TANGAN CETAK RESMI (HANYA MUNCUL SAAT CETAK / PRINT) */}
      <div className="hidden print:block pt-8 mt-12 border-t border-slate-300">
        <div className="grid grid-cols-2 text-center text-xs">
          <div>
            <p className="text-slate-600">Disetujui oleh,</p>
            <p className="font-bold text-slate-900 mt-0.5">Direktur BUMKam Tungkuwiri Mandiri</p>
            <div className="h-20"></div>
            <p className="font-bold underline text-slate-900">( ........................................ )</p>
            <p className="text-slate-500 text-[10px]">Pimpinan Unit Usaha</p>
          </div>
          <div>
            <p className="text-slate-600">
              Doyo Lama, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="font-bold text-slate-900 mt-0.5">Bendahara / Admin Keuangan</p>
            <div className="h-20"></div>
            <p className="font-bold underline text-slate-900">( ........................................ )</p>
            <p className="text-slate-500 text-[10px]">Pengelola Administrasi & Keuangan</p>
          </div>
        </div>
      </div>

      {/* MODAL BUKUKAN PEMBAGIAN HASIL USAHA KE JURNAL */}
      {profitModalOpen && profitSharingData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-emerald-700">
              <Coins className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">
                Konfirmasi Pembukuan Alokasi Hasil Usaha
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan membukukan alokasi hasil usaha tahun buku <strong>{profitSharingData.fiscalYear}</strong> ke
              jurnal akuntansi umum TUMANDI dengan rincian berikut:
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 font-medium">
              <div className="flex justify-between text-slate-900 font-bold border-b border-slate-200 pb-1">
                <span>Total Laba Bersih:</span>
                <span>{formatRupiah(profitSharingData.netProfit)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>PADKam Kampung Doyo Lama ({profitSharingData.percentages.padkamPercent}%):</span>
                <span className="font-mono">{formatRupiah(profitSharingData.allocations.padkamAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Cadangan Modal BUMKam ({profitSharingData.percentages.reservePercent}%):</span>
                <span className="font-mono">{formatRupiah(profitSharingData.allocations.reserveAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Jasa Pengurus & Karyawan ({profitSharingData.percentages.bonusPercent}%):</span>
                <span className="font-mono">{formatRupiah(profitSharingData.allocations.bonusAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Dana Sosial Kampung ({profitSharingData.percentages.socialPercent}%):</span>
                <span className="font-mono">{formatRupiah(profitSharingData.allocations.socialAmount)}</span>
              </div>
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
              ⚠️ Jurnal penutupan otomatis akan diposting ke Buku Besar dan Utang PADKam Kampung Doyo Lama. Tindakan
              ini bersifat permanen demi kepatuhan audit keuangan BUMKam.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setProfitModalOpen(false)}
                disabled={postingProfitSharing}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePostProfitSharing}
                disabled={postingProfitSharing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                {postingProfitSharing ? 'Membukukan...' : 'Ya, Bukukan ke Jurnal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
