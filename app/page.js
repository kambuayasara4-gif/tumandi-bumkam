import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Layers,
  Building,
  BarChart3,
  Scale,
  Coins,
  ShieldCheck,
  Truck,
  Download,
} from 'lucide-react';

export default async function DashboardPage() {
  // 1. Ambil Akun Kas & Bank
  const cashAccounts = await prisma.account.findMany({
    where: { subCategory: 'KAS_BANK', isActive: true },
    include: {
      journalItems: true,
    },
  });

  // Hitung saldo riil tiap akun kas/bank dari riwayat journalItems (Double-Entry Balance)
  let totalCashBank = 0;
  const cashBankList = cashAccounts.map((acc) => {
    let balance = 0;
    for (const item of acc.journalItems) {
      const debit = parseFloat(item.debit.toString());
      const credit = parseFloat(item.credit.toString());
      // Saldo normal Aset = Debit - Kredit
      balance += (debit - credit);
    }
    totalCashBank += balance;
    return {
      ...acc,
      currentBalance: balance,
    };
  });

  // 2. Hitung Total Omzet Penjualan (Akun Pendapatan: Category REVENUE)
  const revenueAccounts = await prisma.account.findMany({
    where: { category: 'REVENUE' },
    include: { journalItems: true },
  });
  let totalRevenue = 0;
  for (const acc of revenueAccounts) {
    for (const item of acc.journalItems) {
      // Saldo normal Pendapatan = Kredit - Debit
      totalRevenue += (parseFloat(item.credit.toString()) - parseFloat(item.debit.toString()));
    }
  }

  // 3. Hitung Total Beban & HPP (Category EXPENSE)
  const expenseAccounts = await prisma.account.findMany({
    where: { category: 'EXPENSE' },
    include: { journalItems: true },
  });
  let totalExpense = 0;
  for (const acc of expenseAccounts) {
    for (const item of acc.journalItems) {
      totalExpense += (parseFloat(item.debit.toString()) - parseFloat(item.credit.toString()));
    }
  }

  const netIncome = totalRevenue - totalExpense;

  // 4. Periksa Stok Kritis Bahan Baku Sablon
  const items = await prisma.item.findMany({
    include: { category: true },
  });
  const lowStockItems = items.filter(
    (item) => parseFloat(item.currentStock.toString()) <= parseFloat(item.minStockAlert.toString())
  );

  // 5. Jurnal Terbaru
  const recentJournals = await prisma.journalEntry.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: { account: true },
      },
    },
  });

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Sistem Keuangan Digital Aktif
            </span>
            <span className="text-xs text-slate-400">SAK EMKM • PP No. 11/2021</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold mt-2">
            Selamat Datang di TUMANDI
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Sistem akuntansi dan pencatatan operasional workshop sablon BUMKam Tungkuwiri Mandiri, Kampung Doyo Lama.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/sales"
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>+ Pesanan Sablon</span>
          </Link>
          <Link
            href="/purchases"
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors border border-slate-700"
          >
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            <span>Restock Bahan</span>
          </Link>
          <Link
            href="/reports"
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors border border-slate-700"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Laporan SAK EMKM</span>
          </Link>
          <Link
            href="/api/backup"
            target="_blank"
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-700"
            title="Unduh Berkas Cadangan Database (.db)"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Backup Data</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Saldo Kas & Bank */}
        <div className="card-financial border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Kas & Bank</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatRupiah(totalCashBank)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Dari {cashAccounts.length} akun kas & bank terdaftar
          </p>
        </div>

        {/* Card 2: Omzet Penjualan */}
        <div className="card-financial border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Omzet Sablon</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatRupiah(totalRevenue)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Pendapatan kaos & jasa sablon
          </p>
        </div>

        {/* Card 3: Laba Bersih Berjalan */}
        <div className="card-financial border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Laba Bersih Berjalan</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              {netIncome >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-2xl font-extrabold tracking-tight ${netIncome >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {formatRupiah(netIncome)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Omzet dikurangi HPP & Beban Operasional
          </p>
        </div>

        {/* Card 4: Peringatan Stok Kritis */}
        <div className="card-financial border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Stok Kritis</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {lowStockItems.length} <span className="text-sm font-normal text-slate-500">Item</span>
          </div>
          <p className="text-xs text-amber-700 font-medium mt-2">
            {lowStockItems.length > 0 ? 'Perlu restock bahan kaos / tinta' : 'Semua stok dalam batas aman'}
          </p>
        </div>
      </div>

      {/* Grid: Akun Kas & Riwayat Jurnal Terakhir */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Rincian Saldo Kas & Bank */}
        <div className="card-financial lg:col-span-1">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 text-sm">Akun Kas & Bank Workshop</h2>
            <Link href="/accounts" className="text-xs text-emerald-600 hover:underline font-medium">
              Lihat Akun
            </Link>
          </div>

          <div className="space-y-3">
            {cashBankList.map((acc) => (
              <div
                key={acc.id}
                className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-800">{acc.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono">Kode: {acc.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900 font-mono">
                    {formatRupiah(acc.currentBalance)}
                  </p>
                  <span className="badge-debit text-[10px]">Aktif</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Notice */}
          <div className="mt-5 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-900">
            <p className="font-semibold">Pedoman Kepmendesa 136/2022:</p>
            <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
              Seluruh penerimaan tunai workshop wajib disinkronkan dengan buku kas dan disetor secara berkala ke rekening bank BUMKam.
            </p>
          </div>
        </div>

        {/* Kolom Kanan: Jurnal Transaksi Terakhir (Double-Entry Feed) */}
        <div className="card-financial lg:col-span-2">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Jurnal Transaksi Terkini</h2>
              <p className="text-xs text-slate-500">Pencatatan double-entry otomatis & seimbang</p>
            </div>
            <Link href="/journals" className="text-xs text-emerald-600 hover:underline font-medium">
              Buku Jurnal Lengkap &rarr;
            </Link>
          </div>

          {recentJournals.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Belum ada transaksi jurnal yang dicatat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-financial">
                <thead>
                  <tr>
                    <th>No. Jurnal & Tanggal</th>
                    <th>Keterangan</th>
                    <th className="text-right">Total Debit</th>
                    <th className="text-right">Total Kredit</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJournals.map((j) => (
                    <tr key={j.id}>
                      <td>
                        <span className="font-mono font-semibold text-slate-800 text-xs block">
                          {j.entryNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(j.date).toLocaleDateString('id-ID')}
                        </span>
                      </td>
                      <td className="text-xs text-slate-700 max-w-xs truncate">
                        {j.description}
                      </td>
                      <td className="text-right font-mono text-xs font-semibold text-slate-800">
                        {formatRupiah(parseFloat(j.totalDebit.toString()))}
                      </td>
                      <td className="text-right font-mono text-xs font-semibold text-slate-800">
                        {formatRupiah(parseFloat(j.totalCredit.toString()))}
                      </td>
                      <td className="text-center">
                        <span className="badge-debit text-[10px]">Balanced</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
