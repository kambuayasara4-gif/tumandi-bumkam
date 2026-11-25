import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTransactionNumber, postJournalEntry } from '@/lib/accounting';
import { Decimal } from 'decimal.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { salesInvoiceId, amount, cashAccountId, date, notes } = body;

    if (!salesInvoiceId || !amount || !cashAccountId) {
      return NextResponse.json(
        { success: false, message: 'Faktur penjualan, nominal pembayaran, dan rekening Kas/Bank wajib diisi.' },
        { status: 400 }
      );
    }

    const invoice = await prisma.salesInvoice.findUnique({
      where: { id: salesInvoiceId },
      include: { customer: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: 'Faktur penjualan tidak ditemukan.' },
        { status: 404 }
      );
    }

    const grandTotal = new Decimal(invoice.grandTotal.toString());
    const oldPaid = new Decimal(invoice.paidAmount.toString());
    const unpaid = grandTotal.minus(oldPaid);
    const payAmount = new Decimal(amount);

    if (!payAmount.greaterThan(0)) {
      return NextResponse.json(
        { success: false, message: 'Nominal pembayaran harus lebih dari nol.' },
        { status: 400 }
      );
    }

    if (payAmount.greaterThan(unpaid)) {
      return NextResponse.json(
        { success: false, message: `Nominal pembayaran melebihi sisa piutang (Sisa Piutang: Rp ${unpaid.toFixed(2)}).` },
        { status: 400 }
      );
    }

    const cashAccount = await prisma.account.findUnique({ where: { id: cashAccountId } });
    const piutangAcc = await prisma.account.findUnique({ where: { code: '1-1200' } });

    const txDate = date ? new Date(date) : new Date();
    const journalCount = await prisma.journalEntry.count();
    const journalNumber = generateTransactionNumber('JU', journalCount + 1, txDate);

    // Jurnal Pelunasan Piutang: Debit Kas/Bank, Kredit Piutang Usaha
    const journalDesc = `Pelunasan Piutang Faktur [${invoice.invoiceNumber}] dari ${invoice.customer.name}`;
    const journalItems = [
      {
        accountId: cashAccount.id,
        debit: payAmount.toString(),
        credit: '0.00',
        memo: `Penerimaan pelunasan via ${cashAccount.name}`,
      },
      {
        accountId: piutangAcc.id,
        debit: '0.00',
        credit: payAmount.toString(),
        memo: `Pengurangan piutang [${invoice.invoiceNumber}]`,
      },
    ];

    // 1. Posting Jurnal
    const journalEntry = await postJournalEntry(prisma, {
      entryNumber: journalNumber,
      date: txDate,
      referenceType: 'SALES',
      referenceId: invoice.invoiceNumber,
      description: journalDesc,
      items: journalItems,
    });

    // 2. Update Faktur Penjualan
    const newPaid = oldPaid.plus(payAmount);
    const newStatus = newPaid.greaterThanOrEqualTo(grandTotal) ? 'PAID' : 'PARTIAL';

    const updatedInvoice = await prisma.salesInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaid.toString(),
        paymentStatus: newStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Pembayaran piutang Rp ${payAmount.toFixed(2)} untuk faktur ${invoice.invoiceNumber} berhasil diposting.`,
      invoice: updatedInvoice,
      journalEntry: journalEntry,
    });
  } catch (error) {
    console.error('Error posting receivable payment:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memproses pembayaran piutang.' },
      { status: 500 }
    );
  }
}
