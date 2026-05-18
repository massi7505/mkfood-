'use client';

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
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminShellSettings {
  companyName: string;
  logoUrl?: string;
}

export function AdminSidebar({ appSettings }: { appSettings: AdminShellSettings }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible='icon' className='border-zinc-800'>
      <SidebarHeader className='border-b border-zinc-800 bg-zinc-950 text-white'>
        <Link className='flex items-center gap-3 px-2 py-3' href='/admin'>
          <span className='flex size-9 items-center justify-center overflow-hidden rounded-md bg-white text-xs font-bold text-zinc-950'>
            {appSettings.logoUrl ? (
              <Image
                src={appSettings.logoUrl}
                alt={appSettings.companyName}
                width={36}
                height={36}
                className='size-9 object-contain'
                unoptimized
              />
            ) : (
              'ADM'
            )}
          </span>
          <span className='group-data-[collapsible=icon]:hidden'>
            <span className='block max-w-40 truncate text-sm font-semibold'>
              {appSettings.companyName}
            </span>
            <span className='block text-xs text-zinc-400'>Pilotage interne</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className='bg-zinc-950 text-zinc-100'>
        <SidebarGroup>
          <SidebarGroupLabel className='text-zinc-500'>Fonctions admin</SidebarGroupLabel>
          <SidebarMenu>
            {adminNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <SidebarMenuItem key={`${item.href}-${item.label}`}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={isActive}
                    className='text-zinc-300 hover:bg-zinc-800 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white'
                  >
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
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
