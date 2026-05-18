import { AdminSettingsClient } from '@/components/admin/admin-settings-client';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin parametres | Portail Client',
  robots: { index: false, follow: false }
};

export default async function AdminSettingsPage() {
  await requireAdminAuth('/admin/settings');

  return <AdminSettingsClient />;
}
