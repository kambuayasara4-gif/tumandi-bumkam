import { prisma } from '@/lib/prisma';
import AssetsClient from './AssetsClient';

export const metadata = {
  title: 'Aset Tetap & Penyusutan Mesin - TUMANDI',
  description: 'Pengelolaan Mesin Heat Press, Printer DTF, Meja Sablon, dan Penyusutan Garis Lurus BUMKam Tungkuwiri Mandiri',
};

export default async function AssetsPage() {
  const assets = await prisma.fixedAsset.findMany({
    include: {
      assetAccount: true,
      depreciationAccount: true,
      expenseAccount: true,
      depreciations: {
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        include: { journalEntry: true },
      },
    },
    orderBy: { acquisitionDate: 'desc' },
  });

  const assetAccounts = await prisma.account.findMany({
    where: { subCategory: 'ASET_TETAP', isActive: true },
    orderBy: { code: 'asc' },
  });

  const depAccounts = await prisma.account.findMany({
    where: { subCategory: 'AKUMULASI_PENYUSUTAN', isActive: true },
    orderBy: { code: 'asc' },
  });

  const cashAccounts = await prisma.account.findMany({
    where: { subCategory: 'KAS_BANK', isActive: true },
    orderBy: { code: 'asc' },
  });

  const setting = await prisma.setting.findFirst({ where: { id: 1 } });

  return (
    <AssetsClient
      initialAssets={assets}
      assetAccounts={assetAccounts}
      depAccounts={depAccounts}
      cashAccounts={cashAccounts}
      currentSetting={setting}
    />
  );
}
