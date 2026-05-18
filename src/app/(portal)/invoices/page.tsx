import { InvoicesClient } from '@/components/invoices/invoices-client';
import { requirePortalAuth } from '@/lib/require-portal-auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Factures | Portail Client',
  robots: { index: false, follow: false }
};

export default async function InvoicesPage() {
  await requirePortalAuth('/invoices');

  return <InvoicesClient />;
}
