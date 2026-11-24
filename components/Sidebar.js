'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Package,
  ShoppingCart,
  Truck,
  Wallet,
  FileSpreadsheet,
  Layers,
  Wrench,
  BarChart3,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

const navigationGroups = [
  {
    title: 'MENU UTAMA',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    title: 'MASTER DATA',
    items: [
      { name: 'Bagan Akun (CoA)', href: '/accounts', icon: BookOpen },
      { name: 'Kontak (Pelanggan/Supplier)', href: '/contacts', icon: Users },
      { name: 'Bahan Baku & Sablon', href: '/items', icon: Package },
    ],
  },
  {
    title: 'TRANSAKSI OPERASIONAL',
    items: [
      { name: 'Penjualan (Sales)', href: '/sales', icon: ShoppingCart },
      { name: 'Pembelian (Restock)', href: '/purchases', icon: Truck },
      { name: 'Kas & Bank', href: '/cash-bank', icon: Wallet },
    ],
  },
  {
    title: 'AKUNTANSI & ASET',
    items: [
      { name: 'Jurnal Umum', href: '/journals', icon: Layers },
      { name: 'Buku Besar', href: '/ledger', icon: FileSpreadsheet },
      { name: 'Aset Tetap & Mesin', href: '/assets', icon: Wrench },
    ],
  },
  {
    title: 'LAPORAN & KEPATUHAN',
    items: [
      { name: 'Laporan Keuangan', href: '/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'PENGATURAN',
    items: [
      { name: 'Pengaturan BUMKam & PADKam', href: '/settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  // Jangan tampilkan sidebar pada halaman login
  if (pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (e) {
      window.location.href = '/login';
    }
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 min-h-screen flex flex-col flex-shrink-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3 bg-slate-950/40">
        <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-900/50">
          TM
        </div>
        <div>
          <h1 className="font-bold text-base text-white tracking-wide leading-tight">TUMANDI</h1>
          <p className="text-xs text-emerald-400 font-medium">BUMKam Tungkuwiri</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigationGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h2 className="px-3 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              {group.title}
            </h2>
            <div className="space-y-0.5 pt-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout Action */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/20">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 border border-rose-900/30 transition-colors"
        >
          <LogOut className="w-4 h-4 text-rose-500" />
          <span>Keluar dari Aplikasi</span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/30 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>SAK EMKM Aktif</span>
        </div>
        <span className="text-[11px] text-slate-400">Doyo Lama</span>
      </div>
    </aside>
  );
}
