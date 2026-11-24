import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const accounts = await prisma.account.findMany({
    orderBy: { code: 'asc' },
  });
  return NextResponse.json(accounts);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, name, category, subCategory, normalBalance } = body;

    if (!code || !name || !category || !subCategory || !normalBalance) {
      return NextResponse.json(
        { success: false, message: 'Semua bidang wajib diisi.' },
        { status: 400 }
      );
    }

    // Periksa duplikasi kode
    const existing = await prisma.account.findUnique({
      where: { code: code.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Kode akun "${code}" sudah digunakan oleh akun "${existing.name}".` },
        { status: 400 }
      );
    }

    const newAccount = await prisma.account.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        category,
        subCategory,
        normalBalance,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, account: newAccount });
  } catch (error) {
    console.error('Error create account:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan akun ke database.' },
      { status: 500 }
    );
  }
}
