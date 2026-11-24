import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
  try {
    const body = await request.json();
    const { lockDate } = body;

    const parsedLockDate = lockDate ? new Date(lockDate) : null;

    const updatedSetting = await prisma.setting.update({
      where: { id: 1 },
      data: {
        lockDate: parsedLockDate,
      },
    });

    // Catat di Audit Log
    await prisma.auditLog.create({
      data: {
        action: parsedLockDate ? 'LOCK_PERIOD' : 'UNLOCK_PERIOD',
        entityType: 'SETTING',
        details: parsedLockDate
          ? `Periode pembukuan dikunci hingga tanggal ${parsedLockDate.toISOString().split('T')[0]}`
          : 'Kunci periode pembukuan dibuka kembali oleh admin',
      },
    });

    return NextResponse.json({
      success: true,
      message: parsedLockDate
        ? `Periode pembukuan berhasil dikunci hingga tanggal ${parsedLockDate.toLocaleDateString('id-ID')}. Transaksi bertanggal sebelumnya tidak dapat diubah.`
        : 'Kunci periode pembukuan berhasil dibuka.',
      lockDate: updatedSetting.lockDate,
    });
  } catch (error) {
    console.error('Error update lock date:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui status tutup buku periode.' },
      { status: 500 }
    );
  }
}
