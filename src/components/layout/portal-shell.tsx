'use client';

import { CartDrawer } from '@/components/cart/cart-drawer';
import { AdminHeader } from '@/components/layout/admin-header';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { PortalHeader } from '@/components/layout/portal-header';
import { PortalSidebar } from '@/components/layout/portal-sidebar';
import { SidebarInset } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  return (
    <>
      {isAdminRoute ? <AdminSidebar /> : <PortalSidebar />}
      <SidebarInset className={isAdminRoute ? 'bg-zinc-50/80 dark:bg-zinc-950' : undefined}>
        {isAdminRoute ? <AdminHeader /> : <PortalHeader />}
        <main
          className={cn(
            'mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6',
            isAdminRoute && 'space-y-5'
          )}
        >
          {children}
        </main>
      </SidebarInset>
      {!isAdminRoute ? <CartDrawer /> : null}
    </>
  );
}
