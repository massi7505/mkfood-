import { AdminAccountingClient } from '@/components/admin/admin-accounting-client';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin comptabilite | Portail Client',
  robots: { index: false, follow: false }
};

export default async function AdminAccountingPage() {
  await requireAdminAuth('/admin/accounting');

  return <AdminAccountingClient />;
}
