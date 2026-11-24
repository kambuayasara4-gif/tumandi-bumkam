'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Calendar, Building2, UserCircle } from 'lucide-react';

export default function Header({ user, settings }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      window.location.href = '/login';
    }
  };

  const todayStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-20">
      {/* Title & Entity Badge */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 flex items-center justify-center">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-bold text-slate-800 text-sm md:text-base leading-tight">
              {settings?.bumkamName || 'BUMKam Tungkuwiri Mandiri'}
            </h2>
            <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {settings?.villageName || 'Kampung Doyo Lama'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {settings?.businessType || 'Pencetakan Baju Kaos (Sablon) & Konveksi'} • {settings?.districtName || 'Distrik Waibu'}
          </p>
        </div>
      </div>

      {/* Date, Admin Profile & Actions */}
      <div className="flex items-center space-x-4">
        {/* Date indicator */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayStr}</span>
        </div>

        {/* User Badge */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">
            AD
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">
              {user?.fullName || 'Pengelola BUMKam'}
            </p>
            <p className="text-[10px] text-slate-500">Administrator</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Keluar dari Aplikasi TUMANDI"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-600" />
          <span>Keluar</span>
        </button>
      </div>
    </header>
  );
}
