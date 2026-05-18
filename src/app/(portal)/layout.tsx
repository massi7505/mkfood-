import { PortalShell } from '@/components/layout/portal-shell';
import { SidebarProvider } from '@/components/ui/sidebar';
import { getAppSettings } from '@/lib/app-settings';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Portail Client',
  robots: {
    index: false,
    follow: false
  }
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';
  const settings = await getAppSettings();

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <PortalShell appSettings={settings}>{children}</PortalShell>
    </SidebarProvider>
  );
}
