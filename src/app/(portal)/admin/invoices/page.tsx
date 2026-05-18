import { AdminInvoicesClient } from '@/components/admin/admin-invoices-client';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin facturation | Portail Client',
  robots: { index: false, follow: false }
};

export default async function AdminInvoicesPage() {
  await requireAdminAuth('/admin/invoices');

  return <AdminInvoicesClient />;
}
