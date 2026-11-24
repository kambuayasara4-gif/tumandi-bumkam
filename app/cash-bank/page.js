import { prisma } from '@/lib/prisma';
import CashBankClient from './CashBankClient';

export const metadata = {
  title: 'Kas & Bank - TUMANDI',
  description: 'Penerimaan Kas, Pengeluaran Workshop, dan Transfer Bank BUMKam Tungkuwiri Mandiri',
};

export default async function CashBankPage() {
  // Ambil transaksi kas & bank
  const transactions = await prisma.cashBankTransaction.findMany({
    include: {
      account: true,
      oppositeAccount: true,
      contact: true,
      journalEntry: true,
    },
    orderBy: { date: 'desc' },
  });

  // Ambil akun Kas & Bank
  const cashAccounts = await prisma.account.findMany({
    where: { subCategory: 'KAS_BANK', isActive: true },
    orderBy: { code: 'asc' },
    include: { journalItems: true },
  });

  // Hitung saldo riil tiap akun kas/bank
  const cashAccountsWithBalance = cashAccounts.map((acc) => {
    let balance = 0;
    for (const item of acc.journalItems) {
      balance += (parseFloat(item.debit.toString()) - parseFloat(item.credit.toString()));
    }
    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      balance,
    };
  });

  // Ambil akun lawan untuk penerimaan (Pendapatan & Modal)
  const revenueAndEquityAccounts = await prisma.account.findMany({
    where: {
      category: { in: ['REVENUE', 'EQUITY', 'LIABILITY'] },
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });

  // Ambil akun lawan untuk pengeluaran (Beban Operasional & HPP)
  const expenseAccounts = await prisma.account.findMany({
    where: {
      category: 'EXPENSE',
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });

  // Ambil daftar kontak
  const contacts = await prisma.contact.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  return (
    <CashBankClient
      initialTransactions={transactions}
      cashAccounts={cashAccountsWithBalance}
      revenueAccounts={revenueAndEquityAccounts}
      expenseAccounts={expenseAccounts}
      contacts={contacts}
    />
  );
}
