import { AdminDeliveryClient } from '@/components/admin/admin-delivery-client';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin livreurs | Portail Client',
  robots: { index: false, follow: false }
};

export default async function AdminDeliveryPage() {
  await requireAdminAuth('/admin/delivery');

  return <AdminDeliveryClient />;
}
