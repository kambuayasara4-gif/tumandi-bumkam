import { prisma } from '@/lib/prisma';
import LedgerClient from './LedgerClient';

export const metadata = {
  title: 'Buku Besar (General Ledger) - TUMANDI',
  description: 'Kartu Buku Besar Akuntansi dan Saldo Berjalan BUMKam Tungkuwiri Mandiri',
};

export default async function LedgerPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const initialAccountId = resolvedSearchParams?.accountId || '';

  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  });

  const selectedAccount = initialAccountId
    ? accounts.find((a) => a.id === initialAccountId) || accounts[0]
    : accounts[0];

  return (
    <LedgerClient
      accounts={accounts}
      initialSelectedAccount={selectedAccount}
    />
  );
}
