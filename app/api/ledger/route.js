import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Decimal } from 'decimal.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: 'Parameter accountId wajib disertakan.' },
        { status: 400 }
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Akun tidak ditemukan.' },
        { status: 404 }
      );
    }

    const isDebitNormal = account.normalBalance === 'DEBIT';

    // 1. Hitung Saldo Awal (Sebelum startDate jika ada)
    let openingBalance = new Decimal(0);
    if (startDate) {
      const priorItems = await prisma.journalItem.findMany({
        where: {
          accountId,
          journalEntry: {
            date: { lt: new Date(startDate) },
            isPosted: true,
          },
        },
      });

      for (const item of priorItems) {
        const d = new Decimal(item.debit.toString());
        const c = new Decimal(item.credit.toString());
        if (isDebitNormal) {
          openingBalance = openingBalance.plus(d).minus(c);
        } else {
          openingBalance = openingBalance.plus(c).minus(d);
        }
      }
    }

    // 2. Ambil Transaksi Periode Terkait
    const whereJournal = { isPosted: true };
    if (startDate && endDate) {
      whereJournal.date = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59'),
      };
    } else if (startDate) {
      whereJournal.date = { gte: new Date(startDate) };
    } else if (endDate) {
      whereJournal.date = { lte: new Date(endDate + 'T23:59:59') };
    }

    const journalItems = await prisma.journalItem.findMany({
      where: {
        accountId,
        journalEntry: whereJournal,
      },
      include: {
        journalEntry: true,
      },
      orderBy: {
        journalEntry: { date: 'asc' },
      },
    });

    // 3. Hitung Mutasi dan Saldo Berjalan (Running Balance)
    let currentBalance = new Decimal(openingBalance);
    let totalDebitMutation = new Decimal(0);
    let totalCreditMutation = new Decimal(0);

    const rows = journalItems.map((item) => {
      const debit = new Decimal(item.debit.toString());
      const credit = new Decimal(item.credit.toString());

      totalDebitMutation = totalDebitMutation.plus(debit);
      totalCreditMutation = totalCreditMutation.plus(credit);

      if (isDebitNormal) {
        currentBalance = currentBalance.plus(debit).minus(credit);
      } else {
        currentBalance = currentBalance.plus(credit).minus(debit);
      }

      return {
        id: item.id,
        date: item.journalEntry.date,
        entryNumber: item.journalEntry.entryNumber,
        referenceType: item.journalEntry.referenceType,
        referenceId: item.journalEntry.referenceId,
        description: item.journalEntry.description,
        memo: item.memo,
        debit: debit.toString(),
        credit: credit.toString(),
        runningBalance: currentBalance.toString(),
      };
    });

    return NextResponse.json({
      success: true,
      account,
      openingBalance: openingBalance.toString(),
      totalDebitMutation: totalDebitMutation.toString(),
      totalCreditMutation: totalCreditMutation.toString(),
      endingBalance: currentBalance.toString(),
      rows,
    });
  } catch (error) {
    console.error('Error calculate ledger:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghitung buku besar.' },
      { status: 500 }
    );
  }
}
