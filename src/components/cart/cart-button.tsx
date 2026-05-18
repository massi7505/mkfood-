'use client';

import { Button } from '@/components/ui/button';
import { useCartHydration, useCartStore } from '@/lib/store/cart';
import { cn } from '@/lib/utils';
import { ShoppingCart } from 'lucide-react';

export function CartButton() {
  const hydrated = useCartHydration();
  const totalItems = useCartStore((state) => state.totalItems());
  const openCart = useCartStore((state) => state.openCart);

  return (
    <Button
      type='button'
      variant='outline'
      size='icon'
      className={cn('relative', hydrated && totalItems > 0 && 'animate-pulse')}
      onClick={openCart}
      aria-label='Ouvrir le panier'
    >
      <ShoppingCart className='size-4' />
      {hydrated && totalItems > 0 && (
        <span className='absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white'>
          {totalItems}
        </span>
      )}
    </Button>
  );
}
