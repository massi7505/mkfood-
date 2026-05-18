'use client';

import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { useCreateOrder } from '@/hooks/useOrders';
import { useCartHydration, useCartStore } from '@/lib/store/cart';
import { Minus, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';

export function CartDrawer() {
  const hydrated = useCartHydration();
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const openCart = useCartStore((state) => state.openCart);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const totalHt = useCartStore((state) => state.totalHt());
  const tvaAmount = useCartStore((state) => state.tvaAmount());
  const totalTtc = useCartStore((state) => state.totalTtc());
  const createOrder = useCreateOrder();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? openCart() : closeCart())}>
      <SheetContent className='flex h-dvh w-full flex-col overflow-hidden p-4 sm:max-w-md sm:p-6'>
        <SheetHeader>
          <SheetTitle>Panier</SheetTitle>
          <SheetDescription>Verifiez les quantites avant validation.</SheetDescription>
        </SheetHeader>

        <div className='min-h-0 flex-1 space-y-3 overflow-y-auto pr-1'>
          {!hydrated || items.length === 0 ? (
            <div className='text-muted-foreground flex min-h-48 items-center justify-center text-sm'>
              Votre panier est vide
            </div>
          ) : (
            items.map((item) => (
              <div className='flex gap-3 rounded-lg border p-3' key={item.productId}>
                <div className='bg-muted relative size-14 shrink-0 overflow-hidden rounded-md'>
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=''
                      fill
                      unoptimized
                      className='object-cover'
                      sizes='56px'
                    />
                  ) : null}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0'>
                      <p className='text-muted-foreground truncate font-mono text-xs'>{item.ref}</p>
                      <p className='truncate text-sm font-medium'>{item.label}</p>
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='size-8'
                      onClick={() => removeItem(item.productId)}
                      aria-label='Supprimer'
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  </div>
                  <div className='mt-3 flex flex-col gap-2 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between'>
                    <div className='flex items-center rounded-md border'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='size-9'
                        onClick={() => updateQty(item.productId, item.qty - 1)}
                        aria-label='Diminuer'
                      >
                        <Minus className='size-4' />
                      </Button>
                      <span className='w-9 text-center text-sm font-medium'>{item.qty}</span>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='size-9'
                        onClick={() => updateQty(item.productId, item.qty + 1)}
                        aria-label='Augmenter'
                      >
                        <Plus className='size-4' />
                      </Button>
                    </div>
                    <PriceDisplay amount={item.priceHt * item.qty} className='text-sm' />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <SheetFooter className='shrink-0 border-t pt-4'>
          <div className='space-y-2 rounded-lg border bg-muted/40 p-4 text-sm'>
            <div className='flex justify-between'>
              <span>Total HT</span>
              <PriceDisplay amount={totalHt} />
            </div>
            <div className='flex justify-between'>
              <span>TVA</span>
              <PriceDisplay amount={tvaAmount} />
            </div>
            <div className='flex justify-between text-base font-semibold'>
              <span>Total TTC</span>
              <PriceDisplay amount={totalTtc} />
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type='button'
                size='lg'
                className='h-12 w-full bg-blue-600 text-base font-semibold hover:bg-blue-700'
                disabled={!hydrated || items.length === 0 || createOrder.isPending}
                isLoading={createOrder.isPending}
              >
                Valider la commande
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la commande</AlertDialogTitle>
                <AlertDialogDescription>
                  Voulez-vous valider la commande ?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => createOrder.mutate()}>
                  Valider
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
