import { prisma } from '@/lib/prisma';
import JournalsClient from './JournalsClient';

export const metadata = {
  title: 'Jurnal Umum & Penyesuaian - TUMANDI',
  description: 'Buku Jurnal Akuntansi Double-Entry BUMKam Tungkuwiri Mandiri',
};

export default async function JournalsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const initialSearch = resolvedSearchParams?.search || '';

  const where = {};
  if (initialSearch) {
    where.OR = [
      { entryNumber: { contains: initialSearch } },
      { description: { contains: initialSearch } },
      { referenceId: { contains: initialSearch } },
    ];
  }

  const journals = await prisma.journalEntry.findMany({
    where,
    include: {
      items: {
        include: { account: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  });

  return (
    <JournalsClient
      initialJournals={journals}
      accounts={accounts}
      initialSearch={initialSearch}
    />
  );
}
