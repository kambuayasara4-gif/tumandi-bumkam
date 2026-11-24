import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTransactionNumber, postJournalEntry } from '@/lib/accounting';
import { Decimal } from 'decimal.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const type = searchParams.get('type');

    const where = {};
    if (accountId) {
      where.OR = [
        { accountId },
        { oppositeAccountId: accountId },
      ];
    }
    if (type && type !== 'ALL') {
      where.type = type;
    }

    const transactions = await prisma.cashBankTransaction.findMany({
      where,
      include: {
        account: true,
        oppositeAccount: true,
        contact: true,
        journalEntry: true,
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error get cash bank:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil riwayat transaksi kas & bank.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      type, // IN, OUT, TRANSFER
      date,
      accountId, // Kas/Bank utama (Pengirim pada OUT/TRANSFER, Penerima pada IN)
      oppositeAccountId, // Akun lawan (Pendapatan pada IN, Beban pada OUT, Kas tujuan pada TRANSFER)
      amount,
      contactId,
      recipientOrPayer,
      notes,
    } = body;

    if (!type || !accountId || !oppositeAccountId || !amount) {
      return NextResponse.json(
        { success: false, message: 'Jenis transaksi, akun kas/bank, akun lawan, dan nominal wajib diisi.' },
        { status: 400 }
      );
    }

    const decAmount = new Decimal(amount);
    if (!decAmount.greaterThan(0)) {
      return NextResponse.json(
        { success: false, message: 'Nominal transaksi harus lebih dari nol (Rp 0).' },
        { status: 400 }
      );
    }

    if (accountId === oppositeAccountId) {
      return NextResponse.json(
        { success: false, message: 'Akun kas/bank dan akun tujuan/lawan tidak boleh sama.' },
        { status: 400 }
      );
    }

    const txDate = date ? new Date(date) : new Date();

    // 1. Tentukan Prefix & Nomor Transaksi Otomatis
    let prefix = 'BKM';
    let journalRefType = 'CASH_IN';
    if (type === 'OUT') {
      prefix = 'BKK';
      journalRefType = 'CASH_OUT';
    } else if (type === 'TRANSFER') {
      prefix = 'TRF';
      journalRefType = 'TRANSFER';
    }

    const txCount = await prisma.cashBankTransaction.count({ where: { type } });
    const transactionNumber = generateTransactionNumber(prefix, txCount + 1, txDate);

    // Ambil detail nama akun untuk deskripsi jurnal
    const accPrimary = await prisma.account.findUnique({ where: { id: accountId } });
    const accOpposite = await prisma.account.findUnique({ where: { id: oppositeAccountId } });

    if (!accPrimary || !accOpposite) {
      return NextResponse.json(
        { success: false, message: 'Akun akuntansi tidak ditemukan di database.' },
        { status: 404 }
      );
    }

    // 2. Susun Jurnal Double-Entry Seimbang
    // Nomor Jurnal Otomatis
    const journalCount = await prisma.journalEntry.count();
    const journalNumber = generateTransactionNumber('JU', journalCount + 1, txDate);

    let journalItems = [];
    let journalDesc = '';

    if (type === 'IN') {
      // Kas Masuk: Debit Kas/Bank, Kredit Akun Lawan (Pendapatan/Modal)
      journalDesc = `Penerimaan Kas/Bank [${transactionNumber}]: ${notes || accOpposite.name} dari ${recipientOrPayer || 'Pelanggan/Umum'}`;
      journalItems = [
        { accountId: accPrimary.id, debit: decAmount.toString(), credit: '0.00', memo: `Penerimaan ke ${accPrimary.name}` },
        { accountId: accOpposite.id, debit: '0.00', credit: decAmount.toString(), memo: `Sumber: ${accOpposite.name}` },
      ];
    } else if (type === 'OUT') {
      // Kas Keluar: Debit Beban/HPP, Kredit Kas/Bank
      journalDesc = `Pengeluaran Kas/Bank [${transactionNumber}]: ${notes || accOpposite.name} kepada ${recipientOrPayer || 'Penerima'}`;
      journalItems = [
        { accountId: accOpposite.id, debit: decAmount.toString(), credit: '0.00', memo: `Beban/Keperluan: ${accOpposite.name}` },
        { accountId: accPrimary.id, debit: '0.00', credit: decAmount.toString(), memo: `Dibayar dari ${accPrimary.name}` },
      ];
    } else if (type === 'TRANSFER') {
      // Transfer: Debit Kas Tujuan (accOpposite), Kredit Kas Asal (accPrimary)
      journalDesc = `Transfer Antar Kas/Bank [${transactionNumber}]: Dari ${accPrimary.name} ke ${accOpposite.name}`;
      journalItems = [
        { accountId: accOpposite.id, debit: decAmount.toString(), credit: '0.00', memo: `Transfer masuk ke ${accOpposite.name}` },
        { accountId: accPrimary.id, debit: '0.00', credit: decAmount.toString(), memo: `Transfer keluar dari ${accPrimary.name}` },
      ];
    }

    // 3. Posting Jurnal Menggunakan Core Engine Double-Entry
    const journalEntry = await postJournalEntry(prisma, {
      entryNumber: journalNumber,
      date: txDate,
      referenceType: journalRefType,
      referenceId: transactionNumber,
      description: journalDesc,
      items: journalItems,
    });

    // 4. Catat Transaksi Kas/Bank Terkait
    const newTx = await prisma.cashBankTransaction.create({
      data: {
        transactionNumber,
        date: txDate,
        type,
        accountId: accPrimary.id,
        oppositeAccountId: accOpposite.id,
        amount: decAmount.toString(),
        contactId: contactId || null,
        recipientOrPayer: recipientOrPayer?.trim() || null,
        notes: notes?.trim() || null,
        journalEntryId: journalEntry.id,
      },
      include: {
        account: true,
        oppositeAccount: true,
        contact: true,
        journalEntry: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Transaksi ${transactionNumber} dan Jurnal ${journalNumber} berhasil diposting.`,
      transaction: newTx,
      journalEntry,
    });
  } catch (error) {
    console.error('Error posting cash bank transaction:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memproses transaksi kas/bank.' },
      { status: 500 }
    );
  }
}
