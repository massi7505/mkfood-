import { OrdersClient } from '@/components/orders/orders-client';
import { requirePortalAuth } from '@/lib/require-portal-auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Commandes | Portail Client',
  robots: { index: false, follow: false }
};

export default async function OrdersPage() {
  await requirePortalAuth('/orders');

  return <OrdersClient />;
}
