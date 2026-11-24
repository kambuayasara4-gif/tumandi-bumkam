import './globals.css';
import AppShell from '@/components/AppShell';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const metadata = {
  title: 'TUMANDI - Aplikasi Keuangan BUMKam Tungkuwiri Mandiri',
  description:
    'Sistem Informasi Akuntansi & Keuangan BUMKam Tungkuwiri Mandiri, Kampung Doyo Lama, Distrik Waibu, Kabupaten Jayapura.',
};

export default async function RootLayout({ children }) {
  const session = await getSession();
  const settings = await prisma.setting.findFirst({ where: { id: 1 } });

  return (
    <html lang="id">
      <body className="min-h-screen antialiased font-sans">
        <AppShell user={session} settings={settings}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
