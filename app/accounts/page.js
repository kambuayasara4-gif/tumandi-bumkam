import { prisma } from '@/lib/prisma';
import AccountsClient from './AccountsClient';

export const metadata = {
  title: 'Bagan Akun (CoA) - TUMANDI',
  description: 'Daftar Bagan Akun Standar SAK EMKM BUMKam Tungkuwiri Mandiri',
};

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    orderBy: { code: 'asc' },
    include: {
      parent: true,
      _count: {
        select: { journalItems: true },
      },
    },
  });

  return <AccountsClient initialAccounts={accounts} />;
}
