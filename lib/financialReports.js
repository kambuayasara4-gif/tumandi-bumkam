// lib/financialReports.js
// Standard Financial Reporting Engine under SAK EMKM for TUMANDI (BUMKam Tungkuwiri Mandiri)

const { Decimal } = require('decimal.js');

/**
 * Helper to normalize date ranges to UTC boundaries
 */
function getDateBoundaries(startDateStr, endDateStr) {
  let startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), 0, 1);
  let endDate = endDateStr ? new Date(endDateStr) : new Date();

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

/**
 * 1. LAPORAN LABA RUGI (INCOME STATEMENT)
 */
async function getIncomeStatement(prisma, { startDate: startInput, endDate: endInput }) {
  const { startDate, endDate } = getDateBoundaries(startInput, endInput);

  // Ambil semua akun pendapatan (REVENUE) dan beban (EXPENSE)
  const accounts = await prisma.account.findMany({
    where: {
      category: { in: ['REVENUE', 'EXPENSE'] },
      isActive: true,
    },
    include: {
      journalItems: {
        where: {
          journalEntry: {
            date: {
              gte: startDate,
              lte: endDate,
            },
            isPosted: true,
          },
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  const revenues = [];
  const cogsItems = []; // HPP
  const operatingExpenses = [];
  const otherRevenues = [];
  const otherExpenses = [];

  let totalRevenue = new Decimal(0);
  let totalHpp = new Decimal(0);
  let totalOperatingExpenses = new Decimal(0);
  let totalOtherRevenue = new Decimal(0);
  let totalOtherExpense = new Decimal(0);

  for (const acc of accounts) {
    let debitSum = new Decimal(0);
    let creditSum = new Decimal(0);

    for (const item of acc.journalItems) {
      debitSum = debitSum.plus(new Decimal(item.debit.toString()));
      creditSum = creditSum.plus(new Decimal(item.credit.toString()));
    }

    if (acc.category === 'REVENUE') {
      // Normal balance: Credit
      const netAmount = creditSum.minus(debitSum);
      if (acc.subCategory === 'PENDAPATAN_NON_OPS' || acc.code.startsWith('8-')) {
        otherRevenues.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: netAmount.toNumber(),
          amountFormatted: netAmount.toString(),
        });
        totalOtherRevenue = totalOtherRevenue.plus(netAmount);
      } else {
        revenues.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: netAmount.toNumber(),
          amountFormatted: netAmount.toString(),
        });
        totalRevenue = totalRevenue.plus(netAmount);
      }
    } else if (acc.category === 'EXPENSE') {
      // Normal balance: Debit
      const netAmount = debitSum.minus(creditSum);
      if (acc.subCategory === 'HPP' || acc.code.startsWith('5-')) {
        cogsItems.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: netAmount.toNumber(),
          amountFormatted: netAmount.toString(),
        });
        totalHpp = totalHpp.plus(netAmount);
      } else if (acc.subCategory === 'BEBAN_NON_OPS' || acc.code.startsWith('9-')) {
        otherExpenses.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: netAmount.toNumber(),
          amountFormatted: netAmount.toString(),
        });
        totalOtherExpense = totalOtherExpense.plus(netAmount);
      } else {
        // Beban Operasional (6-xxxx)
        operatingExpenses.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: netAmount.toNumber(),
          amountFormatted: netAmount.toString(),
        });
        totalOperatingExpenses = totalOperatingExpenses.plus(netAmount);
      }
    }
  }

  const grossProfit = totalRevenue.minus(totalHpp);
  const operatingProfit = grossProfit.minus(totalOperatingExpenses);
  const netOther = totalOtherRevenue.minus(totalOtherExpense);
  const netProfit = operatingProfit.plus(netOther);

  return {
    period: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
    revenues,
    totalRevenue: totalRevenue.toNumber(),
    cogsItems,
    totalHpp: totalHpp.toNumber(),
    grossProfit: grossProfit.toNumber(),
    operatingExpenses,
    totalOperatingExpenses: totalOperatingExpenses.toNumber(),
    operatingProfit: operatingProfit.toNumber(),
    otherRevenues,
    totalOtherRevenue: totalOtherRevenue.toNumber(),
    otherExpenses,
    totalOtherExpense: totalOtherExpense.toNumber(),
    netOther: netOther.toNumber(),
    netProfit: netProfit.toNumber(),
    profitMarginPercent: totalRevenue.greaterThan(0)
      ? netProfit.dividedBy(totalRevenue).times(100).toDecimalPlaces(2).toNumber()
      : 0,
  };
}

/**
 * 2. LAPORAN POSISI KEUANGAN / NERACA (BALANCE SHEET)
 */
async function getBalanceSheet(prisma, { asOfDate: dateInput }) {
  const asOfDate = dateInput ? new Date(dateInput) : new Date();
  asOfDate.setHours(23, 59, 59, 999);

  // Ambil semua akun
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    include: {
      journalItems: {
        where: {
          journalEntry: {
            date: { lte: asOfDate },
            isPosted: true,
          },
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  // Pengelompokan Aset
  const cashAndBank = [];
  const receivables = [];
  const inventories = [];
  const otherCurrentAssets = [];
  const fixedAssets = [];
  const accumulatedDepreciations = [];

  // Pengelompokan Kewajiban
  const currentLiabilities = [];
  const longTermLiabilities = [];

  // Pengelompokan Ekuitas
  const equityAccounts = [];

  let totalCashAndBank = new Decimal(0);
  let totalReceivables = new Decimal(0);
  let totalInventories = new Decimal(0);
  let totalOtherCurrentAssets = new Decimal(0);
  let totalFixedAssetCost = new Decimal(0);
  let totalAccumulatedDepreciation = new Decimal(0);

  let totalCurrentLiabilities = new Decimal(0);
  let totalLongTermLiabilities = new Decimal(0);

  let totalEquityRecorded = new Decimal(0);

  // Akumulasi Laba/Rugi berjalan hingga asOfDate
  let cumulativeRevenue = new Decimal(0);
  let cumulativeExpense = new Decimal(0);

  for (const acc of accounts) {
    let debitSum = new Decimal(0);
    let creditSum = new Decimal(0);

    for (const item of acc.journalItems) {
      debitSum = debitSum.plus(new Decimal(item.debit.toString()));
      creditSum = creditSum.plus(new Decimal(item.credit.toString()));
    }

    if (acc.category === 'ASSET') {
      if (acc.subCategory === 'AKUMULASI_PENYUSUTAN' || acc.normalBalance === 'CREDIT') {
        // Kontra Aset (Akumulasi Penyusutan)
        const netAmount = creditSum.minus(debitSum);
        accumulatedDepreciations.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: netAmount.toNumber(),
          amountFormatted: netAmount.toString(),
        });
        totalAccumulatedDepreciation = totalAccumulatedDepreciation.plus(netAmount);
      } else if (acc.subCategory === 'ASET_TETAP') {
        const netAmount = debitSum.minus(creditSum);
        fixedAssets.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: netAmount.toNumber(),
          amountFormatted: netAmount.toString(),
        });
        totalFixedAssetCost = totalFixedAssetCost.plus(netAmount);
      } else if (acc.subCategory === 'KAS_BANK') {
        const netAmount = debitSum.minus(creditSum);
        cashAndBank.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: netAmount.toNumber(),
          amountFormatted: netAmount.toString(),
        });
        totalCashAndBank = totalCashAndBank.plus(netAmount);
      } else if (acc.subCategory === 'PIUTANG') {
        const netAmount = debitSum.minus(creditSum);
        receivables.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: netAmount.toNumber(),
          amountFormatted: netAmount.toString(),
        });
        totalReceivables = totalReceivables.plus(netAmount);
      } else if (acc.subCategory === 'PERSEDIAAN') {
        const netAmount = debitSum.minus(creditSum);
        inventories.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: netAmount.toNumber(),
          amountFormatted: netAmount.toString(),
        });
        totalInventories = totalInventories.plus(netAmount);
      } else {
        const netAmount = debitSum.minus(creditSum);
        otherCurrentAssets.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: netAmount.toNumber(),
          amountFormatted: netAmount.toString(),
        });
        totalOtherCurrentAssets = totalOtherCurrentAssets.plus(netAmount);
      }
    } else if (acc.category === 'LIABILITY') {
      const netAmount = creditSum.minus(debitSum);
      currentLiabilities.push({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        amount: netAmount.toNumber(),
        amountFormatted: netAmount.toString(),
      });
      totalCurrentLiabilities = totalCurrentLiabilities.plus(netAmount);
    } else if (acc.category === 'EQUITY') {
      const netAmount = creditSum.minus(debitSum);
      equityAccounts.push({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        amount: netAmount.toNumber(),
        amountFormatted: netAmount.toString(),
      });
      totalEquityRecorded = totalEquityRecorded.plus(netAmount);
    } else if (acc.category === 'REVENUE') {
      cumulativeRevenue = cumulativeRevenue.plus(creditSum.minus(debitSum));
    } else if (acc.category === 'EXPENSE') {
      cumulativeExpense = cumulativeExpense.plus(debitSum.minus(creditSum));
    }
  }

  // Perhitungan Subtotal dan Total
  const totalCurrentAssets = totalCashAndBank
    .plus(totalReceivables)
    .plus(totalInventories)
    .plus(totalOtherCurrentAssets);

  const netFixedAssets = totalFixedAssetCost.minus(totalAccumulatedDepreciation);
  const totalAssets = totalCurrentAssets.plus(netFixedAssets);

  const totalLiabilities = totalCurrentLiabilities.plus(totalLongTermLiabilities);

  // Laba Bersih Tahun Berjalan Kumulatif (Unclosed Earnings)
  const currentEarnings = cumulativeRevenue.minus(cumulativeExpense);

  const totalEquity = totalEquityRecorded.plus(currentEarnings);
  const totalLiabilitiesAndEquity = totalLiabilities.plus(totalEquity);

  const difference = totalAssets.minus(totalLiabilitiesAndEquity);
  const isBalanced = difference.abs().lessThan(0.01);

  return {
    asOfDate: asOfDate.toISOString().split('T')[0],
    assets: {
      currentAssets: {
        cashAndBank,
        totalCashAndBank: totalCashAndBank.toNumber(),
        receivables,
        totalReceivables: totalReceivables.toNumber(),
        inventories,
        totalInventories: totalInventories.toNumber(),
        otherCurrentAssets,
        totalOtherCurrentAssets: totalOtherCurrentAssets.toNumber(),
        totalCurrentAssets: totalCurrentAssets.toNumber(),
      },
      fixedAssets: {
        items: fixedAssets,
        totalCost: totalFixedAssetCost.toNumber(),
        accumulatedDepreciations,
        totalAccumulatedDepreciation: totalAccumulatedDepreciation.toNumber(),
        netFixedAssets: netFixedAssets.toNumber(),
      },
      totalAssets: totalAssets.toNumber(),
    },
    liabilities: {
      currentLiabilities,
      totalCurrentLiabilities: totalCurrentLiabilities.toNumber(),
      longTermLiabilities,
      totalLongTermLiabilities: totalLongTermLiabilities.toNumber(),
      totalLiabilities: totalLiabilities.toNumber(),
    },
    equity: {
      accounts: equityAccounts,
      totalEquityRecorded: totalEquityRecorded.toNumber(),
      currentEarnings: currentEarnings.toNumber(),
      totalEquity: totalEquity.toNumber(),
    },
    totalLiabilitiesAndEquity: totalLiabilitiesAndEquity.toNumber(),
    difference: difference.toNumber(),
    isBalanced,
  };
}

/**
 * 3. LAPORAN ARUS KAS (CASH FLOW STATEMENT - METODE LANGSUNG)
 */
async function getCashFlow(prisma, { startDate: startInput, endDate: endInput }) {
  const { startDate, endDate } = getDateBoundaries(startInput, endInput);

  // Akun Kas & Bank
  const cashAccounts = await prisma.account.findMany({
    where: { subCategory: 'KAS_BANK', isActive: true },
    select: { id: true, code: true, name: true },
  });
  const cashAccountIds = cashAccounts.map((a) => a.id);

  // 1. Hitung Saldo Awal Kas & Bank (sebelum startDate)
  const priorCashItems = await prisma.journalItem.findMany({
    where: {
      accountId: { in: cashAccountIds },
      journalEntry: {
        date: { lt: startDate },
        isPosted: true,
      },
    },
  });

  let beginningBalance = new Decimal(0);
  for (const item of priorCashItems) {
    beginningBalance = beginningBalance
      .plus(new Decimal(item.debit.toString()))
      .minus(new Decimal(item.credit.toString()));
  }

  // 2. Ambil seluruh Jurnal yang melibatkan Kas & Bank dalam periode terpilih
  const cashJournals = await prisma.journalEntry.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      isPosted: true,
      items: {
        some: {
          accountId: { in: cashAccountIds },
        },
      },
    },
    include: {
      items: {
        include: {
          account: true,
        },
      },
    },
    orderBy: { date: 'asc' },
  });

  // Aliran Kas Masuk & Keluar berdasarkan kategori aktivitas
  let operatingInflow = new Decimal(0);
  let operatingOutflow = new Decimal(0);
  let investingInflow = new Decimal(0);
  let investingOutflow = new Decimal(0);
  let financingInflow = new Decimal(0);
  let financingOutflow = new Decimal(0);

  const operatingDetails = [];
  const investingDetails = [];
  const financingDetails = [];

  for (const journal of cashJournals) {
    // Cari mutasi kas di jurnal ini
    let cashDebit = new Decimal(0);
    let cashCredit = new Decimal(0);

    for (const item of journal.items) {
      if (cashAccountIds.includes(item.accountId)) {
        cashDebit = cashDebit.plus(new Decimal(item.debit.toString()));
        cashCredit = cashCredit.plus(new Decimal(item.credit.toString()));
      }
    }

    const netCashMovement = cashDebit.minus(cashCredit);
    if (netCashMovement.equals(0)) {
      // Transfer antar kas/bank internal, tidak ada perubahan kas bersih
      continue;
    }

    // Identifikasi akun lawan non-kas
    const nonCashItems = journal.items.filter((item) => !cashAccountIds.includes(item.accountId));

    // Klasifikasi Arus Kas
    let category = 'OPERATING';
    let memo = journal.description;

    for (const opp of nonCashItems) {
      const oppCode = opp.account.code;
      const oppCat = opp.account.category;

      if (oppCat === 'EQUITY' || opp.account.subCategory.includes('MODAL')) {
        category = 'FINANCING';
      } else if (opp.account.code === '2-1500') {
        category = 'FINANCING'; // Bagi hasil PADKam
      } else if (oppCat === 'ASSET' && opp.account.subCategory === 'ASET_TETAP') {
        category = 'INVESTING';
      }
    }

    const amount = netCashMovement.abs();

    if (category === 'FINANCING') {
      if (netCashMovement.greaterThan(0)) {
        financingInflow = financingInflow.plus(amount);
        financingDetails.push({ description: memo, date: journal.date, amount: amount.toNumber() });
      } else {
        financingOutflow = financingOutflow.plus(amount);
        financingDetails.push({ description: memo, date: journal.date, amount: -amount.toNumber() });
      }
    } else if (category === 'INVESTING') {
      if (netCashMovement.greaterThan(0)) {
        investingInflow = investingInflow.plus(amount);
        investingDetails.push({ description: memo, date: journal.date, amount: amount.toNumber() });
      } else {
        investingOutflow = investingOutflow.plus(amount);
        investingDetails.push({ description: memo, date: journal.date, amount: -amount.toNumber() });
      }
    } else {
      // OPERATING
      if (netCashMovement.greaterThan(0)) {
        operatingInflow = operatingInflow.plus(amount);
        operatingDetails.push({ description: memo, date: journal.date, amount: amount.toNumber() });
      } else {
        operatingOutflow = operatingOutflow.plus(amount);
        operatingDetails.push({ description: memo, date: journal.date, amount: -amount.toNumber() });
      }
    }
  }

  const netOperatingCash = operatingInflow.minus(operatingOutflow);
  const netInvestingCash = investingInflow.minus(investingOutflow);
  const netFinancingCash = financingInflow.minus(financingOutflow);

  const netCashChange = netOperatingCash.plus(netInvestingCash).plus(netFinancingCash);
  const endingBalance = beginningBalance.plus(netCashChange);

  return {
    period: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
    operating: {
      inflow: operatingInflow.toNumber(),
      outflow: operatingOutflow.toNumber(),
      net: netOperatingCash.toNumber(),
      details: operatingDetails,
    },
    investing: {
      inflow: investingInflow.toNumber(),
      outflow: investingOutflow.toNumber(),
      net: netInvestingCash.toNumber(),
      details: investingDetails,
    },
    financing: {
      inflow: financingInflow.toNumber(),
      outflow: financingOutflow.toNumber(),
      net: netFinancingCash.toNumber(),
      details: financingDetails,
    },
    beginningBalance: beginningBalance.toNumber(),
    netCashChange: netCashChange.toNumber(),
    endingBalance: endingBalance.toNumber(),
  };
}

/**
 * 4. LAPORAN PEMBAGIAN HASIL USAHA (PADKAM STATEMENT)
 */
async function getProfitSharingCalculation(prisma, { year: yearInput }) {
  const year = parseInt(yearInput || new Date().getFullYear(), 10);
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Hitung Laba Bersih Tahun Terkait
  const incomeStmt = await getIncomeStatement(prisma, { startDate, endDate });
  const netProfit = new Decimal(incomeStmt.netProfit);

  // Ambil konfigurasi persentase dinamis dari Settings
  const setting = await prisma.setting.findFirst({ where: { id: 1 } });
  if (!setting) {
    throw new Error('Konfigurasi BUMKam tidak ditemukan di tabel settings.');
  }

  const padkamPercent = new Decimal(setting.padkamPercent.toString());
  const reservePercent = new Decimal(setting.reserveFundPercent.toString());
  const bonusPercent = new Decimal(setting.managementBonusPercent.toString());
  const socialPercent = new Decimal(setting.socialFundPercent.toString());

  // Pastikan total tepat 100%
  const totalPercent = padkamPercent.plus(reservePercent).plus(bonusPercent).plus(socialPercent);

  // Hitung Nominal Rupiah Alokasi
  let padkamAmount = new Decimal(0);
  let reserveAmount = new Decimal(0);
  let bonusAmount = new Decimal(0);
  let socialAmount = new Decimal(0);

  if (netProfit.greaterThan(0)) {
    padkamAmount = netProfit.times(padkamPercent).dividedBy(100).toDecimalPlaces(2);
    reserveAmount = netProfit.times(reservePercent).dividedBy(100).toDecimalPlaces(2);
    bonusAmount = netProfit.times(bonusPercent).dividedBy(100).toDecimalPlaces(2);
    socialAmount = netProfit.times(socialPercent).dividedBy(100).toDecimalPlaces(2);
  }

  // Cek apakah sudah pernah dibukukan / disimpan di ProfitSharingHistory
  const history = await prisma.profitSharingHistory.findUnique({
    where: { fiscalYear: year },
    include: { journalEntry: true },
  });

  return {
    fiscalYear: year,
    bumkamName: setting.bumkamName,
    villageName: setting.villageName,
    netProfit: netProfit.toNumber(),
    percentages: {
      padkamPercent: padkamPercent.toNumber(),
      reservePercent: reservePercent.toNumber(),
      bonusPercent: bonusPercent.toNumber(),
      socialPercent: socialPercent.toNumber(),
      totalPercent: totalPercent.toNumber(),
    },
    allocations: {
      padkamAmount: padkamAmount.toNumber(),
      reserveAmount: reserveAmount.toNumber(),
      bonusAmount: bonusAmount.toNumber(),
      socialAmount: socialAmount.toNumber(),
      totalAllocated: padkamAmount.plus(reserveAmount).plus(bonusAmount).plus(socialAmount).toNumber(),
    },
    isAlreadyPosted: !!history,
    historyRecord: history || null,
  };
}

module.exports = {
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getProfitSharingCalculation,
};
