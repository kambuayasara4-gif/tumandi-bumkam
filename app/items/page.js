import { prisma } from '@/lib/prisma';
import ItemsClient from './ItemsClient';

export const metadata = {
  title: 'Bahan Baku & Produk Sablon - TUMANDI',
  description: 'Pengelolaan stok bahan baku kaos, tinta sablon, dan jasa konveksi BUMKam Tungkuwiri Mandiri',
};

export default async function ItemsPage() {
  const items = await prisma.item.findMany({
    include: { category: true },
    orderBy: { code: 'asc' },
  });

  const categories = await prisma.itemCategory.findMany({
    orderBy: { name: 'asc' },
  });

  return <ItemsClient initialItems={items} categories={categories} />;
}
