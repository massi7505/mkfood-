'use client';

import { CartDrawer } from '@/components/cart/cart-drawer';
import { AdminHeader } from '@/components/layout/admin-header';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { PortalHeader } from '@/components/layout/portal-header';
import { PortalSidebar } from '@/components/layout/portal-sidebar';
import { SidebarInset } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

interface ShellAppSettings {
  companyName: string;
  logoUrl?: string;
  faviconUrl?: string;
}

export function PortalShell({
  children,
  appSettings
}: {
  children: React.ReactNode;
  appSettings: ShellAppSettings;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  return (
    <>
      {isAdminRoute ? <AdminSidebar appSettings={appSettings} /> : <PortalSidebar />}
      <SidebarInset className={isAdminRoute ? 'bg-zinc-50/80' : undefined}>
        {isAdminRoute ? <AdminHeader appSettings={appSettings} /> : <PortalHeader />}
        <main
          className={cn(
            'mx-auto w-full px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6',
            isAdminRoute ? 'max-w-none space-y-5' : 'max-w-7xl'
          )}
        >
          {children}
        </main>
      </SidebarInset>
      {!isAdminRoute ? <CartDrawer /> : null}
    </>
  );
}
