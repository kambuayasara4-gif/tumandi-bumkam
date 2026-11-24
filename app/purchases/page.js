import { prisma } from '@/lib/prisma';
import PurchasesClient from './PurchasesClient';

export const metadata = {
  title: 'Pembelian & Pengadaan Bahan Sablon - TUMANDI',
  description: 'Pengadaan Kaos Polos, Tinta Sablon, PET Film DTF, dan Pengelolaan Utang Usaha BUMKam Tungkuwiri Mandiri',
};

export default async function PurchasesPage() {
  const purchases = await prisma.purchaseInvoice.findMany({
    include: {
      supplier: true,
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

  const suppliers = await prisma.contact.findMany({
    where: {
      type: { in: ['SUPPLIER', 'BOTH'] },
      isActive: true,
    },
    orderBy: { name: 'asc' },
  });

  const rawMaterials = await prisma.item.findMany({
    where: {
      type: { in: ['RAW_MATERIAL', 'SUPPLIES', 'FINISHED_GOOD'] },
      isActive: true,
    },
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  const cashAccounts = await prisma.account.findMany({
    where: { subCategory: 'KAS_BANK', isActive: true },
    orderBy: { code: 'asc' },
  });

  return (
    <PurchasesClient
      initialPurchases={purchases}
      suppliers={suppliers}
      items={rawMaterials}
      cashAccounts={cashAccounts}
    />
  );
}
