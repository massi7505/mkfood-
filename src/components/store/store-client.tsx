'use client';

import { CartButton } from '@/components/cart/cart-button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { ProductGrid } from '@/components/store/ProductGrid';
import { SearchFilter } from '@/components/store/SearchFilter';
import type { DolibarrProduct } from '@/lib/dolibarr/types';
import { useProducts } from '@/hooks/useProducts';
import { useCartHydration, useCartStore } from '@/lib/store/cart';
import { PackageSearch, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
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
      ),
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
              Catalogue professionnel
            </div>
            <div className='max-w-3xl space-y-3'>
              <h1 className='text-3xl font-semibold tracking-tight md:text-5xl'>
                Commandez vos produits en quelques clics
              </h1>
              <p className='text-sm leading-6 text-zinc-300 md:text-base'>
                Consultez le catalogue, ajoutez vos articles au panier sans compte, puis
                connectez-vous seulement au moment de valider la commande.
              </p>
            </div>
            <div className='grid gap-2 text-sm text-zinc-200 sm:grid-cols-3'>
              <div className='flex items-center gap-2 rounded-md bg-white/10 px-3 py-2'>
                <ShoppingCart className='size-4 text-blue-300' />
                Panier libre
              </div>
              <div className='flex items-center gap-2 rounded-md bg-white/10 px-3 py-2'>
                <ShieldCheck className='size-4 text-emerald-300' />
                Connexion a la validation
              </div>
              <div className='flex items-center gap-2 rounded-md bg-white/10 px-3 py-2'>
                <Truck className='size-4 text-amber-300' />
                Suivi client
              </div>
            </div>
          </div>
          <div className='rounded-lg border border-white/10 bg-white/[0.06] p-4'>
            <p className='text-sm font-medium text-zinc-200'>Catalogue actif</p>
            <p className='mt-2 text-4xl font-semibold'>{displayedProducts.length}</p>
            <p className='mt-1 text-sm text-zinc-400'>produit(s) disponible(s) selon vos filtres</p>
            <div className='mt-6'>
              <CartButton />
            </div>
          </div>
        </div>
      </section>

      <PageHeader
        title='Produits'
        description='Ajout rapide par quantite avec prix client Dolibarr.'
      />

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
          icon={PackageSearch}
          title='Catalogue indisponible'
          description="Impossible de charger les produits Dolibarr pour l'instant."
        />
      )}

      {!isLoading && !isError && displayedProducts.length === 0 && (
        <EmptyState
          icon={PackageSearch}
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
          <span>Panier ({totalItems})</span>
          <span className='font-mono text-xs sm:text-sm'>
            <PriceDisplay amount={totalHt} />
          </span>
        </button>
      )}
    </div>
  );
}
