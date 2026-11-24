import { prisma } from '@/lib/prisma';
import SettingsClient from './SettingsClient';

export const metadata = {
  title: 'Pengaturan BUMKam & Rasio PADKam - TUMANDI',
  description: 'Konfigurasi profil BUMKam Tungkuwiri Mandiri dan pengaturan pembagian hasil usaha (PADKam, Cadangan Modal, Jasa Pengurus, Sosial)',
};

export default async function SettingsPage() {
  const setting = await prisma.setting.findFirst({ where: { id: 1 } });
  return <SettingsClient initialSettings={setting} />;
}
