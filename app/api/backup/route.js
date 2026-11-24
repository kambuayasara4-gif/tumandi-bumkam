import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json(
        { success: false, message: 'File database tidak ditemukan di server.' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(dbPath);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const filename = `tumandi_backup_${dateStr}_${timeStr}.db`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error creating database backup:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal membuat salinan cadangan database: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('backupFile');

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'File cadangan database (.db) wajib diunggah.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validasi Header SQLite ("SQLite format 3\0")
    const header = buffer.subarray(0, 16).toString('utf-8');
    if (!header.startsWith('SQLite format 3')) {
      return NextResponse.json(
        { success: false, message: 'File yang diunggah bukan file database SQLite yang valid.' },
        { status: 400 }
      );
    }

    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const backupSafetyPath = path.join(process.cwd(), 'prisma', `dev.db.before_restore_${Date.now()}`);

    // Simpan salinan database lama untuk keamanan
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupSafetyPath);
    }

    // Tulis database baru
    fs.writeFileSync(dbPath, buffer);

    return NextResponse.json({
      success: true,
      message: 'Database TUMANDI berhasil dipulihkan (restore) dari file cadangan.',
      safetyBackup: path.basename(backupSafetyPath),
    });
  } catch (error) {
    console.error('Error restoring database backup:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memulihkan database: ' + error.message },
      { status: 500 }
    );
  }
}
