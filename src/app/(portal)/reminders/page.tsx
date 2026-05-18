import { RemindersClient } from '@/components/reminders/reminders-client';
import { requirePortalAuth } from '@/lib/require-portal-auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Relances | Portail Client',
  robots: { index: false, follow: false }
};

export default async function RemindersPage() {
  await requirePortalAuth('/reminders');

  return <RemindersClient />;
}
