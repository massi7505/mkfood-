import { AdminOrdersClient } from '@/components/admin/admin-orders-client';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin commandes | Portail Client',
  robots: { index: false, follow: false }
};

export default async function AdminOrdersPage() {
  await requireAdminAuth('/admin/orders');

  return <AdminOrdersClient />;
}
