import { prisma } from '@/lib/prisma';
import ReportsClient from './ReportsClient';
import {
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getProfitSharingCalculation,
} from '@/lib/financialReports';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;
  const asOfDate = new Date().toISOString().split('T')[0];

  const [setting, initialIncome, initialBalance, initialCashFlow, initialProfitSharing] =
    await Promise.all([
      prisma.setting.findFirst({ where: { id: 1 } }),
      getIncomeStatement(prisma, { startDate, endDate }),
      getBalanceSheet(prisma, { asOfDate }),
      getCashFlow(prisma, { startDate, endDate }),
      getProfitSharingCalculation(prisma, { year: currentYear }),
    ]);

  return (
    <ReportsClient
      setting={setting}
      initialIncome={initialIncome}
      initialBalance={initialBalance}
      initialCashFlow={initialCashFlow}
      initialProfitSharing={initialProfitSharing}
    />
  );
}
