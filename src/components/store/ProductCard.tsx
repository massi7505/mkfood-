'use client';

import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DolibarrProduct } from '@/lib/dolibarr/types';
import { Minus, Package, Plus } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface ProductCardProps {
  product: DolibarrProduct;
  onAdd: (qty: number) => void;
  viewMode?: 'grid' | 'list';
}

export function ProductCard({ product, onAdd, viewMode = 'grid' }: ProductCardProps) {
  const stock = Number(product.stock_reel ?? 0);
  const isOutOfStock = stock <= 0;
  const [qty, setQty] = useState(1);
  const [imageError, setImageError] = useState(false);
  const priceHt = Number(product.price_ht ?? product.price ?? 0) || 0;

  function updateQty(nextQty: number) {
    setQty(Math.max(nextQty, 1));
  }

  return (
    <Card
      className={viewMode === 'list' ? 'rounded-lg py-3 md:py-4' : 'overflow-hidden rounded-lg'}
    >
      <CardContent
        className={
          viewMode === 'list'
            ? 'grid grid-cols-[64px_1fr] gap-3 px-3 sm:grid-cols-[80px_1fr_auto] sm:gap-4 sm:px-4'
            : 'space-y-3 px-3 min-[390px]:space-y-4 sm:px-4'
        }
      >
        <div
          className={
            viewMode === 'list'
              ? 'bg-muted relative size-16 overflow-hidden rounded-md sm:size-20'
              : 'bg-muted relative aspect-square overflow-hidden rounded-md'
          }
        >
          {!imageError ? (
            <Image
              src={`/api/dolibarr/products/${product.id}/image`}
              alt={product.label}
              fill
              unoptimized
              sizes={
                viewMode === 'list'
                  ? '80px'
                  : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw'
              }
              className='object-cover'
              onError={() => setImageError(true)}
            />
          ) : (
            <div className='flex h-full flex-col items-center justify-center gap-2 p-2 text-center'>
              <Package className='text-muted-foreground size-7' />
              <span className='text-muted-foreground text-[10px] leading-tight font-medium'>
                Photo indisponible
              </span>
            </div>
          )}
        </div>

        <div className='min-w-0 space-y-1.5 sm:space-y-2'>
          <p className='text-muted-foreground truncate font-mono text-[10px] uppercase tracking-wide sm:text-xs'>
            {product.ref}
          </p>
          <h3 className='line-clamp-2 min-h-10 text-sm leading-snug font-medium'>
            {product.label}
          </h3>
          <PriceDisplay amount={priceHt} showTva tvaRate={Number(product.tva_tx ?? 20)} />
          {isOutOfStock ? (
            <div className='space-y-1'>
              <Badge className='border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100'>
                En rupture de stock
              </Badge>
              <p className='text-muted-foreground text-xs'>Precommande possible</p>
            </div>
          ) : (
            <p className='text-muted-foreground text-xs'>
              Stock: <span className='font-mono'>{stock}</span>
            </p>
          )}
        </div>

        <div
          className={
            viewMode === 'list'
              ? 'col-span-2 flex items-center gap-2 sm:col-span-1 sm:flex-col sm:items-stretch sm:justify-end'
              : 'grid grid-cols-1 items-center gap-2'
          }
        >
          <div className='flex h-10 w-full shrink-0 items-center rounded-md border'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='size-10 shrink-0'
              onClick={() => updateQty(qty - 1)}
              aria-label='Diminuer'
            >
              <Minus className='size-4' />
            </Button>
            <input
              className='h-10 min-w-10 flex-1 bg-transparent text-center text-sm font-medium outline-none'
              inputMode='numeric'
              value={qty}
              onChange={(event) => updateQty(Number(event.target.value) || 1)}
              aria-label='Quantite'
            />
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='size-10 shrink-0'
              onClick={() => updateQty(qty + 1)}
              aria-label='Augmenter'
            >
              <Plus className='size-4' />
            </Button>
          </div>
          <Button
            type='button'
            className='h-10 w-full min-w-0 bg-blue-600 px-3 text-sm hover:bg-blue-700'
            onClick={() => onAdd(qty)}
          >
            {isOutOfStock ? 'Precommander' : 'Ajouter'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
