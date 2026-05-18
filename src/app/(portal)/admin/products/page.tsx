import { AdminProductsClient } from '@/components/admin/admin-products-client';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin produits | Portail Client',
  robots: { index: false, follow: false }
};

export default async function AdminProductsPage() {
  await requireAdminAuth('/admin/products');

  return <AdminProductsClient />;
}
