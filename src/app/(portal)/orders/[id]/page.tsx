import { OrderDetailClient } from '@/components/orders/order-detail-client';
import { requirePortalAuth } from '@/lib/require-portal-auth';
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: 'Commande | Portail Client',
  robots: { index: false, follow: false }
};

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  await requirePortalAuth(`/orders/${id}`);

  return <OrderDetailClient id={id} />;
}
