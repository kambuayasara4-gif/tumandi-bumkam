import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, message: 'Sesi login telah berakhir. Silakan login kembali.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Seluruh kolom kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Kata sandi baru dan konfirmasi kata sandi tidak cocok.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Kata sandi baru minimal harus 6 karakter.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Akun pengguna tidak ditemukan di database.' },
        { status: 404 }
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Kata sandi saat ini yang Anda masukkan salah.' },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    // Catat log audit
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CHANGE_PASSWORD',
          details: `Pengguna ${user.username} berhasil mengubah kata sandi.`,
        },
      });
    } catch (e) {
      // Abaikan jika audit log gagal
    }

    return NextResponse.json({
      success: true,
      message: 'Kata sandi administrator berhasil diperbarui! Silakan gunakan kata sandi baru untuk login berikutnya.',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem: ' + error.message },
      { status: 500 }
    );
  }
}
