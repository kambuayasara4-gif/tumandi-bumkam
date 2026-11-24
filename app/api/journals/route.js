import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTransactionNumber, postJournalEntry } from '@/lib/accounting';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const referenceType = searchParams.get('referenceType');

    const where = {};
    if (referenceType && referenceType !== 'ALL') {
      where.referenceType = referenceType;
    }
    if (search) {
      where.OR = [
        { entryNumber: { contains: search } },
        { description: { contains: search } },
        { referenceId: { contains: search } },
      ];
    }

    const journals = await prisma.journalEntry.findMany({
      where,
      include: {
        items: {
          include: { account: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(journals);
  } catch (error) {
    console.error('Error get journals:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat daftar jurnal akuntansi.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { date, referenceType, referenceId, description, items } = body;

    if (!description || !items || !Array.isArray(items) || items.length < 2) {
      return NextResponse.json(
        { success: false, message: 'Keterangan transaksi dan minimal 2 baris akun jurnal wajib diisi.' },
        { status: 400 }
      );
    }

    const txDate = date ? new Date(date) : new Date();
    const count = await prisma.journalEntry.count();
    const entryNumber = generateTransactionNumber('JU', count + 1, txDate);

    // Gunakan postJournalEntry yang memvalidasi keseimbangan Debit == Kredit
    const createdJournal = await postJournalEntry(prisma, {
      entryNumber,
      date: txDate,
      referenceType: referenceType || 'MANUAL',
      referenceId: referenceId?.trim() || null,
      description: description.trim(),
      items,
    });

    return NextResponse.json({
      success: true,
      message: `Jurnal ${entryNumber} berhasil disimpan dan seimbang.`,
      journal: createdJournal,
    });
  } catch (error) {
    console.error('Error post journal:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menyimpan jurnal akuntansi.' },
      { status: 400 }
    );
  }
}
