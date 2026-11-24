import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getIncomeStatement } from '@/lib/financialReports';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const report = await getIncomeStatement(prisma, { startDate, endDate });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating income statement:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menyusun Laporan Laba Rugi: ' + error.message },
      { status: 500 }
    );
  }
}
