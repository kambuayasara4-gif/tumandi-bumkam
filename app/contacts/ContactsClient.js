'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users, Phone, MapPin, CheckCircle2, AlertCircle, Building } from 'lucide-react';

export default function ContactsClient({ initialContacts }) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts || []);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'CUSTOMER',
    code: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredContacts = contacts.filter((c) => {
    const matchType = filterType === 'ALL' || c.type === filterType;
    const matchSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery));
    return matchType && matchSearch;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || 'Gagal menyimpan kontak baru.');
        setIsSubmitting(false);
        return;
      }

      setContacts([data.contact, ...contacts]);
      setIsModalOpen(false);
      setFormData({
        name: '',
        type: 'CUSTOMER',
        code: '',
        phone: '',
        address: '',
        notes: '',
      });
      router.refresh();
    } catch (err) {
      setFormError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-800">Kontak (Pelanggan & Pemasok)</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {contacts.length} Kontak
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data pemesan sablon kaos (instansi, komunitas, gereja) dan pemasok bahan baku workshop.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kontak Baru</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="card-financial p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Kontak ({contacts.length})
            </button>
            <button
              onClick={() => setFilterType('CUSTOMER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'CUSTOMER'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pelanggan Sablon
            </button>
            <button
              onClick={() => setFilterType('SUPPLIER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'SUPPLIER'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pemasok Bahan (Vendor)
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, kode, atau telepon..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Tabel Kontak */}
      <div className="card-financial p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-financial">
            <thead>
              <tr>
                <th className="w-32">Kode</th>
                <th>Nama Kontak / Lembaga</th>
                <th className="w-32">Jenis</th>
                <th>No. Telepon / WA</th>
                <th>Alamat</th>
                <th className="text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-400 text-xs">
                    Tidak ada kontak yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono font-bold text-xs text-slate-900">
                      {c.code}
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-slate-800 block">
                        {c.name}
                      </span>
                      {c.notes && (
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {c.notes}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          c.type === 'CUSTOMER'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.type === 'CUSTOMER' ? 'Pelanggan' : 'Pemasok (Vendor)'}
                      </span>
                    </td>
                    <td className="text-xs text-slate-600 font-mono">
                      {c.phone ? (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="text-xs text-slate-600">
                      {c.address ? (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-xs">{c.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Kontak */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">Tambah Kontak Baru</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Kontak
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      formData.type === 'CUSTOMER'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="contactType"
                      value="CUSTOMER"
                      checked={formData.type === 'CUSTOMER'}
                      onChange={() => setFormData({ ...formData, type: 'CUSTOMER' })}
                      className="sr-only"
                    />
                    <span>Pelanggan (Customer)</span>
                  </label>

                  <label
                    className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      formData.type === 'SUPPLIER'
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="contactType"
                      value="SUPPLIER"
                      checked={formData.type === 'SUPPLIER'}
                      onChange={() => setFormData({ ...formData, type: 'SUPPLIER' })}
                      className="sr-only"
                    />
                    <span>Pemasok (Supplier / Vendor)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap / Instansi / Komunitas
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Misal: Panitia Paskah Kampung Doyo Lama / Toko Kaos"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Kontak (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Kosongkan untuk otomatis"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0812-XXXX-XXXX"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Lengkap
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Kampung Doyo Lama / Sentani / Jayapura"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Misal: Pelanggan langganan pesanan kaos kaos distro/seragam"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Kontak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
