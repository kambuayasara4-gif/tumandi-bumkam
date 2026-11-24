import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Decimal } from 'decimal.js';

export async function GET() {
  const items = await prisma.item.findMany({
    include: { category: true },
    orderBy: { code: 'asc' },
  });
  return NextResponse.json(items);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, name, type, categoryId, unit, costPrice, sellingPrice, minStockAlert } = body;

    if (!code || !name || !type || !categoryId) {
      return NextResponse.json(
        { success: false, message: 'Kode, nama, jenis, dan kategori item wajib diisi.' },
        { status: 400 }
      );
    }

    // Periksa duplikasi kode
    const existing = await prisma.item.findUnique({
      where: { code: code.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Kode item "${code}" sudah terdaftar.` },
        { status: 400 }
      );
    }

    const newItem = await prisma.item.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        type,
        categoryId,
        unit: unit?.trim() || 'Pcs',
        costPrice: new Decimal(costPrice || 0).toString(),
        sellingPrice: new Decimal(sellingPrice || 0).toString(),
        currentStock: '0.00',
        minStockAlert: new Decimal(minStockAlert || 5).toString(),
        isActive: true,
      },
      include: { category: true },
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error) {
    console.error('Error create item:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan item ke database.' },
      { status: 500 }
    );
  }
}
