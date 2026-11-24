import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTransactionNumber, postJournalEntry } from '@/lib/accounting';
import { Decimal } from 'decimal.js';

export async function GET() {
  try {
    const assets = await prisma.fixedAsset.findMany({
      include: {
        assetAccount: true,
        depreciationAccount: true,
        expenseAccount: true,
        depreciations: {
          orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        },
      },
      orderBy: { acquisitionDate: 'desc' },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error get assets:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat daftar aset tetap.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name,
      acquisitionDate,
      acquisitionCost,
      salvageValue,
      usefulLifeMonths,
      assetAccountId,
      depreciationAccountId,
      expenseAccountId,
      paymentMethod, // 'CASH_PURCHASE' atau 'EXISTING_CAPITAL'
      cashAccountId,
      notes,
    } = body;

    if (!name || !acquisitionCost || !usefulLifeMonths || !assetAccountId) {
      return NextResponse.json(
        { success: false, message: 'Nama aset, harga perolehan, masa manfaat, dan akun aset wajib diisi.' },
        { status: 400 }
      );
    }

    const costDec = new Decimal(acquisitionCost);
    const salvageDec = new Decimal(salvageValue || 0);
    const monthsInt = parseInt(usefulLifeMonths, 10);

    if (!costDec.greaterThan(0) || monthsInt <= 0) {
      return NextResponse.json(
        { success: false, message: 'Harga perolehan dan masa manfaat harus bernilai positif.' },
        { status: 400 }
      );
    }

    // Kalkulasi Penyusutan Bulanan Metode Garis Lurus: (Cost - Salvage) / Months
    const depreciableAmount = Decimal.max(0, costDec.minus(salvageDec));
    const monthlyDepDec = depreciableAmount.dividedBy(monthsInt).toDecimalPlaces(2);

    const assetCount = await prisma.fixedAsset.count();
    const assetCode = `AST-${String(assetCount + 1).padStart(4, '0')}`;
    const txDate = acquisitionDate ? new Date(acquisitionDate) : new Date();

    // Default accounts jika tidak dipilih
    let depAccId = depreciationAccountId;
    let expAccId = expenseAccountId;

    if (!depAccId) {
      const defDep = await prisma.account.findUnique({ where: { code: '1-2110' } });
      depAccId = defDep ? defDep.id : assetAccountId;
    }
    if (!expAccId) {
      const defExp = await prisma.account.findUnique({ where: { code: '6-6000' } }); // Beban Penyusutan Aset Tetap
      expAccId = defExp ? defExp.id : assetAccountId;
    }

    // Simpan ke database dengan atomic transaction jika ada pembelian kas
    const result = await prisma.$transaction(async (tx) => {
      // Jika dibeli menggunakan kas/bank saat ini, posting jurnal perolehan aset
      if (paymentMethod === 'CASH_PURCHASE' && cashAccountId) {
        const cashAccount = await tx.account.findUnique({ where: { id: cashAccountId } });
        const jCount = await tx.journalEntry.count();
        const jNumber = generateTransactionNumber('JU', jCount + 1, txDate);

        await postJournalEntry(tx, {
          entryNumber: jNumber,
          date: txDate,
          referenceType: 'MANUAL',
          referenceId: assetCode,
          description: `Perolehan Aset Tetap [${assetCode}]: ${name} dibayar via ${cashAccount?.name}`,
          items: [
            {
              accountId: assetAccountId,
              debit: costDec.toString(),
              credit: '0.00',
              memo: `Perolehan aset ${name}`,
            },
            {
              accountId: cashAccountId,
              debit: '0.00',
              credit: costDec.toString(),
              memo: `Pengeluaran kas perolehan aset`,
            },
          ],
        });
      }

      // Buat data aset tetap
      const createdAsset = await tx.fixedAsset.create({
        data: {
          code: assetCode,
          name: name.trim(),
          acquisitionDate: txDate,
          acquisitionCost: costDec.toString(),
          salvageValue: salvageDec.toString(),
          usefulLifeMonths: monthsInt,
          monthlyDepreciation: monthlyDepDec.toString(),
          accumulatedDepreciation: '0.00',
          assetAccountId,
          depreciationAccountId: depAccId,
          expenseAccountId: expAccId,
          status: 'ACTIVE',
          notes: notes?.trim() || null,
        },
        include: {
          assetAccount: true,
          depreciationAccount: true,
          expenseAccount: true,
        },
      });

      return createdAsset;
    });

    return NextResponse.json({
      success: true,
      message: `Aset Tetap ${assetCode} (${name}) berhasil didaftarkan. Beban penyusutan bulanan: Rp ${monthlyDepDec.toFixed(2)}/bulan.`,
      asset: result,
    });
  } catch (error) {
    console.error('Error create asset:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mendaftarkan aset tetap.' },
      { status: 500 }
    );
  }
}
