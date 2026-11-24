import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCashFlow } from '@/lib/financialReports';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const report = await getCashFlow(prisma, { startDate, endDate });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating cash flow statement:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menyusun Laporan Arus Kas: ' + error.message },
      { status: 500 }
    );
  }
}
