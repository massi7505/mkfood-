'use client';

import { CartButton } from '@/components/cart/cart-button';
import { Icons } from '@/components/icons';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { ProductGrid } from '@/components/store/ProductGrid';
import { SearchFilter } from '@/components/store/SearchFilter';
import type { DolibarrProduct } from '@/lib/dolibarr/types';
import { useProducts } from '@/hooks/useProducts';
import { useCartHydration, useCartStore } from '@/lib/store/cart';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export function StoreClient() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [priceSort, setPriceSort] = useState('none');
  const [stockFilter, setStockFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { products, isLoading, isError } = useProducts({
    search: search || undefined,
    category: category === 'all' ? undefined : category,
    limit: 100
  });
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);
  const totalItems = useCartStore((state) => state.totalItems());
  const totalHt = useCartStore((state) => state.totalHt());
  const cartHydrated = useCartHydration();
  const availableCount = products.filter((product) => Number(product.stock_reel ?? 0) > 0).length;
  const preorderCount = products.filter((product) => Number(product.stock_reel ?? 0) <= 0).length;

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map(
              (product) => product.array_options?.categoryLabel ?? product.array_options?.category
            )
            .filter((value): value is string => Boolean(value))
        )
      ).slice(0, 8),
    [products]
  );

  const displayedProducts = useMemo(() => {
    const priceOf = (p: DolibarrProduct) => Number(p.price_ht ?? p.price ?? 0) || 0;
    const nextProducts = products.filter((product) => {
      if (stockFilter === 'available') return Number(product.stock_reel) > 0;
      if (stockFilter === 'empty') return Number(product.stock_reel) <= 0;
      return true;
    });

    if (priceSort === 'asc') {
      nextProducts.sort((a, b) => priceOf(a) - priceOf(b));
    }

    if (priceSort === 'desc') {
      nextProducts.sort((a, b) => priceOf(b) - priceOf(a));
    }

    return nextProducts;
  }, [products, priceSort, stockFilter]);

  function addProduct(product: DolibarrProduct, qty: number) {
    addItem({
      productId: product.id,
      ref: product.ref,
      label: product.label,
      priceHt: Number(product.price_ht ?? product.price ?? 0) || 0,
      tva: Number(product.tva_tx ?? 0) || 0,
      qty,
      imageUrl: `/api/dolibarr/products/${product.id}/image`
    });
    toast.success('Produit ajoute');
  }

  return (
    <div className='space-y-6 pb-24'>
      <section className='overflow-hidden rounded-lg border bg-zinc-950 text-white shadow-sm'>
        <div className='grid gap-6 p-5 md:grid-cols-[1.25fr_0.75fr] md:p-8'>
          <div className='space-y-5'>
            <div className='inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100'>
              <Icons.store className='size-4' />
              Catalogue professionnel
            </div>
            <div className='max-w-3xl space-y-3'>
              <h1 className='text-3xl font-semibold tracking-tight md:text-5xl'>
                Stock, prix Dolibarr et panier en direct
              </h1>
              <p className='text-sm leading-6 text-zinc-300 md:text-base'>
                Retrouvez vos references, comparez les prix HT/TTC, filtrez les disponibilites
                et construisez une commande claire avant validation.
              </p>
            </div>
            <div className='grid gap-2 text-sm text-zinc-200 sm:grid-cols-3'>
              <div className='flex items-center gap-2 rounded-md bg-white/10 px-3 py-2'>
                <Icons.cart className='size-4 text-blue-300' />
                Panier libre
              </div>
              <div className='flex items-center gap-2 rounded-md bg-white/10 px-3 py-2'>
                <Icons.lock className='size-4 text-emerald-300' />
                Validation securisee
              </div>
              <div className='flex items-center gap-2 rounded-md bg-white/10 px-3 py-2'>
                <Icons.truckDelivery className='size-4 text-amber-300' />
                Suivi client
              </div>
            </div>
          </div>
          <div className='rounded-lg border border-white/10 bg-white/[0.06] p-4'>
            <p className='text-sm font-medium text-zinc-200'>Panier et catalogue</p>
            <div className='mt-4 grid grid-cols-3 gap-2'>
              <StoreMetric label='Affiches' value={displayedProducts.length} />
              <StoreMetric label='En stock' value={availableCount} />
              <StoreMetric label='Precommande' value={preorderCount} />
            </div>
            <div className='mt-4 rounded-md border border-white/10 bg-black/20 p-3'>
              <p className='text-xs text-zinc-400'>Panier HT</p>
              <div className='mt-1 text-2xl font-semibold'>
                <PriceDisplay amount={cartHydrated ? totalHt : 0} />
              </div>
              <p className='text-xs text-zinc-400'>{cartHydrated ? totalItems : 0} article(s)</p>
            </div>
            <div className='mt-6'>
              <CartButton />
            </div>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className='flex gap-2 overflow-x-auto pb-1'>
          <button
            type='button'
            className={`h-9 shrink-0 rounded-full border px-4 text-sm ${
              category === 'all' ? 'bg-zinc-950 text-white' : 'bg-white hover:bg-muted'
            }`}
            onClick={() => setCategory('all')}
          >
            Tous
          </button>
          {categories.map((item) => (
            <button
              type='button'
              className={`h-9 shrink-0 rounded-full border px-4 text-sm ${
                category === item ? 'bg-zinc-950 text-white' : 'bg-white hover:bg-muted'
              }`}
              onClick={() => setCategory(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </section>
      )}

      <SearchFilter
        search={search}
        category={category}
        priceSort={priceSort}
        stockFilter={stockFilter}
        viewMode={viewMode}
        categories={categories}
        resultsCount={displayedProducts.length}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onPriceSortChange={setPriceSort}
        onStockFilterChange={setStockFilter}
        onViewModeChange={setViewMode}
      />

      {isLoading && (
        <div className='grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
          {Array.from({ length: 10 }).map((_, index) => (
            <LoadingSkeleton variant='product-card' key={index} />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          icon={Icons.packageSearch}
          title='Catalogue indisponible'
          description="Impossible de charger les produits Dolibarr pour l'instant."
        />
      )}

      {!isLoading && !isError && displayedProducts.length === 0 && (
        <EmptyState
          icon={Icons.packageSearch}
          title='Aucun produit'
          description='Aucun article ne correspond aux filtres actifs.'
        />
      )}

      {!isLoading && !isError && displayedProducts.length > 0 && (
        <ProductGrid products={displayedProducts} viewMode={viewMode} onAdd={addProduct} />
      )}

      {cartHydrated && totalItems > 0 && (
        <button
          type='button'
          className='fixed right-3 bottom-3 z-30 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 sm:right-4 sm:bottom-4 sm:gap-3 sm:px-5'
          style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          onClick={openCart}
        >
          <Icons.cart className='size-4' />
          <span>Panier ({totalItems})</span>
          <span className='font-mono text-xs sm:text-sm'>
            <PriceDisplay amount={totalHt} />
          </span>
        </button>
      )}
    </div>
  );
}

function StoreMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded-md border border-white/10 bg-white/[0.05] p-2'>
      <p className='text-lg font-semibold'>{value}</p>
      <p className='text-[11px] text-zinc-400'>{label}</p>
    </div>
  );
}
