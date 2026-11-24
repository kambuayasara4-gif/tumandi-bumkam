import { prisma } from '@/lib/prisma';
import SalesClient from './SalesClient';

export const metadata = {
  title: 'Penjualan & Pesanan Sablon - TUMANDI',
  description: 'Pencatatan Pesanan Sablon Kaos, Faktur Penjualan, dan Pengelolaan Piutang Pelanggan BUMKam Tungkuwiri Mandiri',
};

export default async function SalesPage() {
  const sales = await prisma.salesInvoice.findMany({
    include: {
      customer: true,
      cashAccount: true,
      journalEntry: true,
      items: {
        include: {
          item: { include: { category: true } },
        },
      },
    },
    orderBy: { date: 'desc' },
  });

  const customers = await prisma.contact.findMany({
    where: {
      type: { in: ['CUSTOMER', 'BOTH'] },
      isActive: true,
    },
    orderBy: { name: 'asc' },
  });

  const allItems = await prisma.item.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  const cashAccounts = await prisma.account.findMany({
    where: { subCategory: 'KAS_BANK', isActive: true },
    orderBy: { code: 'asc' },
  });

  return (
    <SalesClient
      initialSales={sales}
      customers={customers}
      items={allItems}
      cashAccounts={cashAccounts}
    />
  );
}
