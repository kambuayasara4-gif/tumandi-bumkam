// lib/accounting.js
// Core Engine Akuntansi Double-Entry & Validasi Keuangan TUMANDI
// Menjamin kepatuhan standar SAK EMKM dan aturan BUMKam Tungkuwiri Mandiri

const { Decimal } = require('decimal.js');

/**
 * Validasi persentase pembagian hasil usaha BUMKam
 * Syarat mutlak: Total persentase harus tepat 100%
 */
function validateProfitSharing(padkam, reserve, management, social) {
  const dPadkam = new Decimal(padkam || 0);
  const dReserve = new Decimal(reserve || 0);
  const dManagement = new Decimal(management || 0);
  const dSocial = new Decimal(social || 0);

  // Nilai tidak boleh negatif
  if (dPadkam.isNegative() || dReserve.isNegative() || dManagement.isNegative() || dSocial.isNegative()) {
    return {
      isValid: false,
      total: null,
      message: 'Persentase alokasi tidak boleh bernilai negatif.',
    };
  }

  const total = dPadkam.plus(dReserve).plus(dManagement).plus(dSocial);

  if (!total.equals(100)) {
    return {
      isValid: false,
      total: total.toNumber(),
      message: `Total persentase pembagian hasil usaha harus tepat 100%. Saat ini: ${total.toString()}% (PADKam: ${dPadkam}%, Cadangan: ${dReserve}%, Jasa Pengurus: ${dManagement}%, Sosial: ${dSocial}%).`,
    };
  }

  return {
    isValid: true,
    total: 100,
    message: 'Validasi pembagian hasil usaha sukses (Total 100%).',
  };
}

/**
 * Validasi keseimbangan jurnal Debit = Kredit (Double-Entry Bookkeeping)
 * @param {Array<{ accountId: string, debit: number|string|Decimal, credit: number|string|Decimal }>} items
 */
function validateJournalBalance(items) {
  if (!items || !Array.isArray(items) || items.length < 2) {
    return {
      isValid: false,
      totalDebit: new Decimal(0),
      totalCredit: new Decimal(0),
      message: 'Jurnal akuntansi minimal harus memiliki 2 baris akun (1 sisi Debit dan 1 sisi Kredit).',
    };
  }

  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const debit = new Decimal(item.debit || 0);
    const credit = new Decimal(item.credit || 0);

    if (debit.lessThan(0) || credit.lessThan(0)) {
      return {
        isValid: false,
        totalDebit,
        totalCredit,
        message: `Baris ${i + 1}: Nilai Debit atau Kredit tidak boleh negatif.`,
      };
    }

    if (debit.greaterThan(0) && credit.greaterThan(0)) {
      return {
        isValid: false,
        totalDebit,
        totalCredit,
        message: `Baris ${i + 1}: Satu baris akun tidak boleh memiliki nilai Debit dan Kredit sekaligus.`,
      };
    }

    totalDebit = totalDebit.plus(debit);
    totalCredit = totalCredit.plus(credit);
  }

  if (totalDebit.equals(0) && totalCredit.equals(0)) {
    return {
      isValid: false,
      totalDebit,
      totalCredit,
      message: 'Nilai transaksi jurnal tidak boleh nol.',
    };
  }

  // Uji Keseimbangan Mutlak
  if (!totalDebit.equals(totalCredit)) {
    const selisih = totalDebit.minus(totalCredit).abs();
    return {
      isValid: false,
      totalDebit,
      totalCredit,
      difference: selisih,
      message: `Jurnal TIDAK SEIMBANG! Total Debit: Rp ${totalDebit.toFixed(2)}, Total Kredit: Rp ${totalCredit.toFixed(2)}. Selisih: Rp ${selisih.toFixed(2)}. Transaksi ditolak oleh sistem.`,
    };
  }

  return {
    isValid: true,
    totalDebit,
    totalCredit,
    difference: new Decimal(0),
    message: 'Jurnal seimbang (Balance: Debit = Kredit).',
  };
}

/**
 * Membuat nomor transaksi otomatis dengan format standar
 * Contoh: INV/2026/04/0001, PO/2026/04/0001, JU/2026/04/0001
 */
function generateTransactionNumber(prefix, sequenceNumber, date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const seq = String(sequenceNumber).padStart(4, '0');
  return `${prefix}/${year}/${month}/${seq}`;
}

/**
 * Engine simpan Jurnal Double-Entry aman dengan transaksi database
 */
async function postJournalEntry(prisma, { entryNumber, date, referenceType, referenceId, description, items }) {
  // 1. Validasi Keseimbangan Debit vs Kredit
  const balanceCheck = validateJournalBalance(items);
  if (!balanceCheck.isValid) {
    throw new Error(`[VALIDASI AKUNTANSI GAGAL] ${balanceCheck.message}`);
  }

  // 2. Periksa Kunci Tanggal Tutup Buku (Lock Date)
  const setting = await prisma.setting.findFirst({ where: { id: 1 } });
  if (setting && setting.lockDate) {
    const txDate = new Date(date || Date.now());
    if (txDate <= setting.lockDate) {
      throw new Error(`[PERIODE TERKUNCI] Transaksi tanggal ${txDate.toISOString().split('T')[0]} tidak dapat diposting karena periode pembukuan sebelum ${setting.lockDate.toISOString().split('T')[0]} sudah ditutup.`);
    }
  }

  // 3. Simpan Jurnal & Baris Item secara langsung dengan nested write atomic
  const journal = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: new Date(date || Date.now()),
      referenceType,
      referenceId: referenceId ? String(referenceId) : null,
      description,
      totalDebit: balanceCheck.totalDebit.toString(),
      totalCredit: balanceCheck.totalCredit.toString(),
      isPosted: true,
      items: {
        create: items.map((item) => ({
          accountId: item.accountId,
          debit: new Decimal(item.debit || 0).toString(),
          credit: new Decimal(item.credit || 0).toString(),
          memo: item.memo || null,
        })),
      },
    },
    include: {
      items: {
        include: {
          account: true,
        },
      },
    },
  });

  return journal;
}

module.exports = {
  validateProfitSharing,
  validateJournalBalance,
  generateTransactionNumber,
  postJournalEntry,
};
