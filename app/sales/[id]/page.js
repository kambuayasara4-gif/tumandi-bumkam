import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Printer, ArrowLeft, Building2, CheckCircle2, Clock } from 'lucide-react';

export default async function InvoicePage({ params }) {
  const resolvedParams = await params;
  const invoiceId = resolvedParams.id;

  const invoice = await prisma.salesInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      cashAccount: true,
      items: {
        include: { item: true },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  const settings = await prisma.setting.findFirst({ where: { id: 1 } });

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(parseFloat(val || 0));
  };

  const grandTotal = parseFloat(invoice.grandTotal.toString());
  const paid = parseFloat(invoice.paidAmount.toString());
  const unpaid = Math.max(0, grandTotal - paid);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/sales"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Penjualan</span>
        </Link>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Nota / Unduh PDF</span>
        </button>
      </div>

      {/* Invoice Document Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg p-8 md:p-12 print:shadow-none print:border-none print:p-0">
        {/* Kop Surat BUMKam */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b-2 border-slate-800 gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-extrabold text-xl shadow-md">
              TM
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-slate-900 leading-tight">
                {settings?.bumkamName || 'BUMKam Tungkuwiri Mandiri'}
              </h1>
              <p className="text-xs font-bold text-emerald-700 mt-0.5">
                {settings?.businessType || 'Pencetakan Baju Kaos (Sablon) & Konveksi'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {settings?.address || 'Kampung Doyo Lama, Distrik Waibu, Kab. Jayapura, Papua'}
                <br />
                WhatsApp/Telp: {settings?.phone || '-'}
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="font-mono text-2xl font-black text-slate-900 block tracking-tight">
              FAKTUR NOTA
            </span>
            <span className="font-mono text-sm font-bold text-emerald-800 block mt-1">
              {invoice.invoiceNumber}
            </span>
            <span className="text-xs text-slate-500 block mt-1">
              Tanggal: {new Date(invoice.date).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Informasi Pelanggan & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Ditujukan Kepada (Pemesan):
            </span>
            <p className="font-bold text-sm text-slate-900">{invoice.customer?.name}</p>
            <p className="text-slate-600 mt-1">{invoice.customer?.phone || '-'}</p>
            <p className="text-slate-500 mt-0.5">{invoice.customer?.address || 'Kampung Doyo Lama'}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Status Pembayaran Pesanan:
              </span>
              <div className="mt-1">
                {invoice.paymentStatus === 'PAID' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    LUNAS
                  </span>
                )}
                {invoice.paymentStatus === 'PARTIAL' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    UANG MUKA (DP) TERCATAT
                  </span>
                )}
                {invoice.paymentStatus === 'UNPAID' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    BELUM DIBAYAR (TEMPO)
                  </span>
                )}
              </div>
            </div>

            {invoice.dueDate && (
              <p className="text-slate-500 text-[11px] mt-2">
                Batas Pelunasan / Target Selesai: {new Date(invoice.dueDate).toLocaleDateString('id-ID')}
              </p>
            )}
          </div>
        </div>

        {/* Tabel Rincian Pesanan Sablon */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3">Item Bahan & Deskripsi Sablon</th>
                <th className="p-3 text-center w-20">Qty</th>
                <th className="p-3 text-right w-32">Harga Satuan</th>
                <th className="p-3 text-right w-36">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((line, idx) => (
                <tr key={line.id} className="hover:bg-slate-50/50">
                  <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block">{line.item?.name}</span>
                    {line.description && (
                      <span className="text-[11px] text-slate-500 italic block mt-0.5">
                        Rincian: {line.description}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center font-mono font-semibold text-slate-800">
                    {line.quantity} {line.item?.unit}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-700">
                    {formatRupiah(line.unitPrice)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    {formatRupiah(line.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ringkasan Perhitungan */}
        <div className="flex justify-end mb-8">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-bold">{formatRupiah(invoice.subtotal)}</span>
            </div>
            {parseFloat(invoice.discountAmount.toString()) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Potongan / Diskon:</span>
                <span className="font-mono font-bold">
                  - {formatRupiah(invoice.discountAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-800">{formatRupiah(grandTotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold pt-1">
              <span>Sudah Dibayar (DP/Tunai):</span>
              <span className="font-mono">{formatRupiah(paid)}</span>
            </div>
            <div className="flex justify-between text-slate-800 font-bold pt-1 border-t border-slate-100">
              <span>Sisa Piutang / Tagihan:</span>
              <span className={`font-mono ${unpaid > 0 ? 'text-amber-800' : 'text-slate-400'}`}>
                {formatRupiah(unpaid)}
              </span>
            </div>
          </div>
        </div>

        {/* Lembar Tanda Tangan */}
        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-center text-xs">
          <div>
            <p className="text-slate-500 mb-16">Penerima Pesanan,</p>
            <p className="font-bold text-slate-900 underline">{invoice.customer?.name}</p>
            <p className="text-[10px] text-slate-400">Pelanggan / Perwakilan</p>
          </div>

          <div>
            <p className="text-slate-500 mb-16">
              Pengelola BUMKam Tungkuwiri Mandiri,
            </p>
            <p className="font-bold text-slate-900 underline">Pengurus / Admin Workshop</p>
            <p className="text-[10px] text-slate-400">Kampung Doyo Lama</p>
          </div>
        </div>
      </div>
    </div>
  );
}
