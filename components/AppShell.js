'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function AppShell({ user, settings, children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="min-h-screen w-full bg-slate-950 text-slate-100">{children}</main>;
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-800">
      <Sidebar user={user} settings={settings} />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-hidden">
        <Header user={user} settings={settings} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/60">
          {children}
        </main>
      </div>
    </div>
  );
}
