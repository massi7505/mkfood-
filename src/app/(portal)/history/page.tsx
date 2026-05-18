import { HistoryClient } from '@/components/history/history-client';
import { requirePortalAuth } from '@/lib/require-portal-auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Historique | Portail Client',
  robots: { index: false, follow: false }
};

export default async function HistoryPage() {
  await requirePortalAuth('/history');

  return <HistoryClient />;
}
