import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(contacts);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, type, phone, address, notes, code } = body;

    if (!name || !type) {
      return NextResponse.json(
        { success: false, message: 'Nama dan jenis kontak wajib diisi.' },
        { status: 400 }
      );
    }

    // Buat kode otomatis jika tidak diisi manual
    let contactCode = code ? code.trim() : null;
    if (!contactCode) {
      const prefix = type === 'SUPPLIER' ? 'SPL' : 'PLG';
      const count = await prisma.contact.count({ where: { type } });
      contactCode = `${prefix}-${String(count + 1).padStart(4, '0')}`;
    }

    // Periksa duplikasi kode
    const existing = await prisma.contact.findUnique({
      where: { code: contactCode },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Kode kontak "${contactCode}" sudah digunakan.` },
        { status: 400 }
      );
    }

    const newContact = await prisma.contact.create({
      data: {
        code: contactCode,
        name: name.trim(),
        type,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, contact: newContact });
  } catch (error) {
    console.error('Error create contact:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan kontak ke database.' },
      { status: 500 }
    );
  }
}
