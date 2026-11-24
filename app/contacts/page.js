import { prisma } from '@/lib/prisma';
import ContactsClient from './ContactsClient';

export const metadata = {
  title: 'Kontak Pelanggan & Pemasok - TUMANDI',
  description: 'Pengelolaan data Pelanggan Sablon dan Pemasok Bahan BUMKam Tungkuwiri Mandiri',
};

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          salesInvoices: true,
          purchaseInvoices: true,
        },
      },
    },
  });

  return <ContactsClient initialContacts={contacts} />;
}
