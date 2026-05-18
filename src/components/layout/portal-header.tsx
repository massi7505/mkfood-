'use client';

import { CartButton } from '@/components/cart/cart-button';
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
import { useInvoices } from '@/hooks/useInvoices';
import { useAccount } from '@/hooks/useAccount';
import { isInvoiceMoreThan30DaysLate } from '@/lib/invoices/reminders';
import { LogIn, LogOut, User } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export function PortalHeader() {
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const { displayName } = useAccount(isLoggedIn);
  const canLoadInvoices = isLoggedIn && Number(session?.user?.thirdpartyId ?? 0) > 0;
  const { invoices } = useInvoices('unpaid', canLoadInvoices);
  const lateCount = invoices.filter((invoice) => isInvoiceMoreThan30DaysLate(invoice)).length;

  return (
    <>
      {lateCount > 0 && (
        <div className='sticky top-0 z-30 border-b border-red-700 bg-red-600 px-4 py-2 text-sm font-medium text-white'>
          {lateCount} facture(s) en retard de plus de 30 jours.
        </div>
      )}
      <header className='bg-background/80 sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b backdrop-blur-md md:h-14'>
        <div className='flex min-w-0 items-center gap-2 px-4'>
          <SidebarTrigger className='-ml-1' />
          <Separator orientation='vertical' className='mr-2 h-4' />
          <div className='min-w-0'>
            <p className='truncate text-sm font-medium'>
              {displayName ?? session?.user?.name ?? 'Catalogue'}
            </p>
            <p className='text-muted-foreground truncate text-xs'>
              {isLoggedIn
                ? `thirdparty_id ${session?.user?.thirdpartyId ?? '-'}`
                : 'Consultation libre'}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2 px-4'>
          <CartButton />
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type='button' variant='outline' size='icon' aria-label='Menu utilisateur'>
                  <User className='size-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56'>
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href='/account'>Completer mon profil</Link>
                </DropdownMenuItem>
                {session?.user?.role === 'ADMIN' ? (
                  <DropdownMenuItem asChild>
                    <Link href='/admin'>Administration</Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem disabled>{session?.user?.email}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/store' })}>
                  <LogOut className='mr-2 size-4' />
                  Deconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild type='button' variant='outline' size='sm'>
              <Link href='/login?callbackUrl=/store'>
                <LogIn className='size-4' />
                Connexion
              </Link>
            </Button>
          )}
        </div>
      </header>
    </>
  );
}
