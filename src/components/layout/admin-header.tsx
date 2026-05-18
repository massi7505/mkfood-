'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { signOut, useSession } from 'next-auth/react';

export function AdminHeader({ appSettings }: { appSettings: { companyName: string } }) {
  const { data: session } = useSession();

  return (
    <header className='sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-white/90 backdrop-blur-md md:h-14'>
      <div className='flex min-w-0 items-center gap-2 px-4'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mr-2 h-4' />
        <div className='min-w-0'>
          <p className='truncate text-sm font-semibold'>{appSettings.companyName}</p>
          <p className='text-muted-foreground truncate text-xs'>Modules internes uniquement</p>
        </div>
      </div>
      <div className='flex items-center gap-2 px-4'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type='button' variant='outline' size='icon' aria-label='Menu administrateur'>
              <Icons.user className='size-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-60'>
            <DropdownMenuLabel>Administrateur</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>{session?.user?.email ?? 'Session admin'}</DropdownMenuItem>
            <DropdownMenuItem disabled>Role: {session?.user?.role ?? 'ADMIN'}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/store' })}>
              <Icons.logout className='mr-2 size-4' />
              Deconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
