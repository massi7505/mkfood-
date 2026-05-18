'use client';

import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@/components/ui/sidebar';
import { adminNav } from '@/config/admin-nav';
import { portalNav } from '@/config/portal-nav';
import { useInvoices } from '@/hooks/useInvoices';
import { useAccount } from '@/hooks/useAccount';
import { isInvoiceOverdue } from '@/lib/invoices/reminders';
import { User } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export function PortalSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const { displayName } = useAccount(isLoggedIn);
  const canLoadInvoices = isLoggedIn && Number(session?.user?.thirdpartyId ?? 0) > 0;
  const { invoices } = useInvoices('unpaid', canLoadInvoices);
  const remindersCount = invoices.filter((invoice) => isInvoiceOverdue(invoice)).length;
  const visibleItems = isLoggedIn ? portalNav : portalNav.filter((item) => item.href === '/store');
  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className='border-b'>
        <Link
          className='flex items-center gap-3 px-2 py-3'
          href={isLoggedIn ? '/dashboard' : '/store'}
        >
          <span className='flex size-9 items-center justify-center rounded-md bg-blue-600 text-sm font-semibold text-white'>
            B2B
          </span>
          <span className='group-data-[collapsible=icon]:hidden'>
            <span className='block max-w-40 truncate text-sm font-semibold'>
              {displayName ?? session?.user?.name ?? 'Catalogue'}
            </span>
            <span className='text-muted-foreground block text-xs'>Espace client</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Espace Client</SidebarGroupLabel>
          <SidebarMenu>
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const badge = item.href === '/reminders' ? remindersCount : undefined;
              return (
                <SidebarMenuItem key={`${item.href}-${item.label}`}>
                  <SidebarMenuButton asChild tooltip={item.label} isActive={isActive}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                      {badge ? (
                        <Badge className='ml-auto bg-red-600 text-white group-data-[collapsible=icon]:hidden'>
                          {badge}
                        </Badge>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
            {!isLoggedIn ? (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip='Connexion'>
                  <Link href='/login?callbackUrl=/store'>
                    <User />
                    <span>Connexion</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : null}
          </SidebarMenu>
        </SidebarGroup>
        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>
              {adminNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={`${item.href}-${item.label}`}>
                    <SidebarMenuButton asChild tooltip={item.label} isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
