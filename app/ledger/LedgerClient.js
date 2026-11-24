'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Search,
  Calendar,
  ArrowRight,
  Printer,
  FileText,
  Building,
  CheckCircle2,
} from 'lucide-react';

export default function LedgerClient({ accounts, initialSelectedAccount }) {
  const [selectedAccountId, setSelectedAccountId] = useState(initialSelectedAccount?.id || accounts[0]?.id || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ledgerData, setLedgerData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLedger = async () => {
    if (!selectedAccountId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ accountId: selectedAccountId });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/ledger?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLedgerData(data);
      }
    } catch (e) {
      console.error('Error fetching ledger:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [selectedAccountId, startDate, endDate]);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(parseFloat(val || 0));
  };

  const currentAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-800">Buku Besar (General Ledger)</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Saldo Berjalan Realtime
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Riwayat mutasi debet, kredit, dan saldo akhir akun buku besar berstandar SAK EMKM.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Cetak Kartu Buku Besar</span>
        </button>
      </div>

      {/* Filter Akun & Rentang Tanggal */}
      <div className="card-financial p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Dropdown Akun */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pilih Akun Buku Besar
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name} ({acc.category})
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Mulai */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Dari Tanggal (Opsional)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Tanggal Akhir */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Sampai Tanggal (Opsional)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards Akun Terpilih */}
      {ledgerData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-financial p-4 border-l-4 border-l-slate-700">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Informasi Akun
            </span>
            <div className="font-bold text-sm text-slate-900 leading-tight">
              {ledgerData.account.name}
            </div>
            <div className="mt-2 flex items-center space-x-2 text-[11px]">
              <span className="font-mono text-slate-500">{ledgerData.account.code}</span>
              <span className={ledgerData.account.normalBalance === 'DEBIT' ? 'badge-debit' : 'badge-credit'}>
                Saldo Normal: {ledgerData.account.normalBalance}
              </span>
            </div>
          </div>

          <div className="card-financial p-4 border-l-4 border-l-blue-500">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Saldo Awal
            </span>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              {formatRupiah(ledgerData.openingBalance)}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Saldo sebelum periode pencatatan
            </p>
          </div>

          <div className="card-financial p-4 border-l-4 border-l-indigo-500">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Total Mutasi Periode
            </span>
            <div className="text-xs font-mono text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span>Debit (+):</span>
                <span className="font-bold">{formatRupiah(ledgerData.totalDebitMutation)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kredit (-):</span>
                <span className="font-bold">{formatRupiah(ledgerData.totalCreditMutation)}</span>
              </div>
            </div>
          </div>

          <div className="card-financial p-4 border-l-4 border-l-emerald-600 bg-emerald-50/20">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
              Saldo Akhir Buku Besar
            </span>
            <div className="text-xl font-extrabold text-emerald-800 font-mono">
              {formatRupiah(ledgerData.endingBalance)}
            </div>
            <div className="mt-2 flex items-center space-x-1 text-[11px] text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sesuai Double-Entry SAK EMKM</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabel Kartu Buku Besar */}
      <div className="card-financial p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-financial">
            <thead>
              <tr>
                <th className="w-32">Tanggal</th>
                <th className="w-36">No. Bukti / Jurnal</th>
                <th className="w-24">Tipe</th>
                <th>Keterangan Transaksi</th>
                <th className="text-right w-32">Debit (Rp)</th>
                <th className="text-right w-32">Kredit (Rp)</th>
                <th className="text-right w-36">Saldo Berjalan (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {/* Baris Saldo Awal */}
              {ledgerData && (
                <tr className="bg-slate-100/60 font-semibold text-slate-700">
                  <td colSpan="4" className="italic text-xs">
                    [SALDO AWAL PERIODE]
                  </td>
                  <td className="text-right font-mono text-xs">-</td>
                  <td className="text-right font-mono text-xs">-</td>
                  <td className="text-right font-mono font-bold text-xs text-slate-900">
                    {formatRupiah(ledgerData.openingBalance)}
                  </td>
                </tr>
              )}

              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400 text-xs">
                    Memuat data buku besar...
                  </td>
                </tr>
              ) : !ledgerData || ledgerData.rows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400 text-xs">
                    Tidak ada mutasi transaksi pada akun ini pada periode yang dipilih.
                  </td>
                </tr>
              ) : (
                ledgerData.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-xs text-slate-700">
                      {new Date(row.date).toLocaleDateString('id-ID')}
                    </td>
                    <td>
                      <Link
                        href={`/journals?search=${row.entryNumber}`}
                        className="font-mono font-bold text-xs text-emerald-700 hover:underline inline-flex items-center space-x-1"
                        title="Klik untuk menelusuri ke Jurnal Sumber"
                      >
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span>{row.entryNumber}</span>
                      </Link>
                      {row.referenceId && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Ref: {row.referenceId}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {row.referenceType}
                      </span>
                    </td>
                    <td className="text-xs text-slate-800">
                      <span>{row.description}</span>
                      {row.memo && (
                        <span className="text-[11px] text-slate-400 block mt-0.5 italic">
                          Memo: {row.memo}
                        </span>
                      )}
                    </td>
                    <td className="text-right font-mono text-xs font-semibold text-slate-800">
                      {parseFloat(row.debit) > 0 ? formatRupiah(row.debit) : '-'}
                    </td>
                    <td className="text-right font-mono text-xs font-semibold text-slate-800">
                      {parseFloat(row.credit) > 0 ? formatRupiah(row.credit) : '-'}
                    </td>
                    <td className="text-right font-mono font-bold text-xs text-emerald-800 bg-slate-50/50">
                      {formatRupiah(row.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {ledgerData && (
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t border-slate-300 text-slate-900">
                  <td colSpan="4" className="text-right text-xs">
                    Total Mutasi & Saldo Akhir:
                  </td>
                  <td className="text-right font-mono text-xs">
                    {formatRupiah(ledgerData.totalDebitMutation)}
                  </td>
                  <td className="text-right font-mono text-xs">
                    {formatRupiah(ledgerData.totalCreditMutation)}
                  </td>
                  <td className="text-right font-mono text-xs text-emerald-900 bg-emerald-100/40">
                    {formatRupiah(ledgerData.endingBalance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
