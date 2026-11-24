import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBalanceSheet } from '@/lib/financialReports';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('asOfDate');

    const report = await getBalanceSheet(prisma, { asOfDate });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating balance sheet:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menyusun Laporan Posisi Keuangan (Neraca): ' + error.message },
      { status: 500 }
    );
  }
}
