'use client';

import { Icons } from '@/components/icons';
import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { DolibarrProduct } from '@/lib/dolibarr/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import Image from 'next/image';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

interface AdminProductsResponse {
  products: DolibarrProduct[];
}

interface ApiErrorPayload {
  error?: string;
}

interface ProductAdminFlags {
  featured: boolean;
  preorder: boolean;
}

interface ProductFormValues {
  id?: string;
  ref: string;
  label: string;
  description: string;
  priceHt: string;
  tvaTx: string;
}

const PRODUCT_FLAGS_STORAGE_KEY = 'admin-product-flags';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => null)) as ApiErrorPayload | T | null;

  if (!response.ok) {
    throw new Error((payload as ApiErrorPayload | null)?.error ?? 'Erreur API');
  }

  return payload as T;
}

function getStock(product: DolibarrProduct) {
  return Number(product.stock_reel ?? 0);
}

function getPriceHt(product: DolibarrProduct) {
  return Number(product.price_ht ?? product.price ?? 0) || 0;
}

function getDefaultFlags(): ProductAdminFlags {
  return {
    featured: false,
    preorder: false
  };
}

function getDefaultProductFormValues(product?: DolibarrProduct | null): ProductFormValues {
  return {
    id: product?.id,
    ref: product?.ref ?? '',
    label: product?.label ?? '',
    description: product?.description ?? '',
    priceHt: String(getPriceHt(product ?? ({} as DolibarrProduct)) || ''),
    tvaTx: String(product?.tva_tx ?? '20')
  };
}

function toProductPayload(values: ProductFormValues) {
  return {
    id: values.id,
    ref: values.ref.trim(),
    label: values.label.trim(),
    description: values.description.trim(),
    priceHt: Number(values.priceHt),
    tvaTx: Number(values.tvaTx)
  };
}

function escapeCsv(value: string | number) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function exportProductsCsv(products: DolibarrProduct[], flags: Record<string, ProductAdminFlags>) {
  const headers = [
    'ID',
    'Reference',
    'Libelle',
    'Prix HT',
    'TVA',
    'Stock',
    'Rupture',
    'Mis en avant',
    'Precommande'
  ];
  const rows = products.map((product) => {
    const productFlags = flags[product.id] ?? getDefaultFlags();
    const stock = getStock(product);
    return [
      product.id,
      product.ref,
      product.label,
      getPriceHt(product).toFixed(2),
      String(product.tva_tx ?? ''),
      String(stock),
      stock <= 0 ? 'Oui' : 'Non',
      productFlags.featured ? 'Oui' : 'Non',
      productFlags.preorder ? 'Oui' : 'Non'
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `catalogue-admin-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminProductsClient() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [flags, setFlags] = useState<Record<string, ProductAdminFlags>>({});
  const [productEditor, setProductEditor] = useState<DolibarrProduct | null | undefined>();

  useEffect(() => {
    const stored = window.localStorage.getItem(PRODUCT_FLAGS_STORAGE_KEY);
    if (!stored) return;

    try {
      setFlags(JSON.parse(stored) as Record<string, ProductAdminFlags>);
    } catch {
      window.localStorage.removeItem(PRODUCT_FLAGS_STORAGE_KEY);
    }
  }, []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => fetchJson<AdminProductsResponse>('/api/admin/products?limit=300'),
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const productMutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const payload = toProductPayload(values);
      return fetchJson('/api/admin/products', {
        method: payload.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async (_, values) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setProductEditor(undefined);
      toast.success(values.id ? 'Produit modifie' : 'Produit ajoute');
    },
    onError: (mutationError) => {
      toast.error(mutationError instanceof Error ? mutationError.message : 'Enregistrement impossible');
    }
  });

  const products = useMemo(() => data?.products ?? [], [data?.products]);
  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const stock = getStock(product);
      const productFlags = flags[product.id] ?? getDefaultFlags();
      const matchesSearch =
        !normalizedSearch ||
        [product.ref, product.label, product.description].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch);
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'out' && stock <= 0) ||
        (stockFilter === 'low' && stock > 0 && stock <= 5) ||
        (stockFilter === 'available' && stock > 5) ||
        (stockFilter === 'featured' && productFlags.featured) ||
        (stockFilter === 'preorder' && productFlags.preorder);

      return matchesSearch && matchesStock;
    });
  }, [flags, products, search, stockFilter]);

  const outOfStockCount = products.filter((product) => getStock(product) <= 0).length;
  const lowStockCount = products.filter((product) => {
    const stock = getStock(product);
    return stock > 0 && stock <= 5;
  }).length;
  const featuredCount = products.filter((product) => flags[product.id]?.featured).length;
  const preorderCount = products.filter((product) => flags[product.id]?.preorder).length;

  function updateFlags(productId: string, update: Partial<ProductAdminFlags>) {
    setFlags((current) => {
      const next = {
        ...current,
        [productId]: {
          ...getDefaultFlags(),
          ...current[productId],
          ...update
        }
      };
      window.localStorage.setItem(PRODUCT_FLAGS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 border-b pb-5 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <p className='text-muted-foreground text-sm'>Administration</p>
          <h1 className='text-2xl font-semibold tracking-normal md:text-3xl'>
            Catalogue produits
          </h1>
          <p className='text-muted-foreground mt-2 text-sm'>
            Verifier les stocks, mettre en avant, gerer les precommandes et synchroniser Dolibarr.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            disabled={filteredProducts.length === 0}
            onClick={() => exportProductsCsv(filteredProducts, flags)}
          >
            <Icons.upload className='size-4' />
            Export catalogue
          </Button>
          <Button type='button' onClick={() => setProductEditor(null)}>
            <Icons.add className='size-4' />
            Nouveau produit
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-products'] })}
          >
            <Icons.refreshCw className='size-4' />
            Synchroniser Dolibarr
          </Button>
        </div>
      </div>

      <section className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard label='Catalogue' value={products.length} detail='Produits Dolibarr charges' />
        <MetricCard label='Ruptures' value={outOfStockCount} detail='Stock nul ou negatif' />
        <MetricCard label='Stock faible' value={lowStockCount} detail='Stock de 1 a 5' />
        <MetricCard label='Precommandes' value={preorderCount} detail='Activees cote admin' />
      </section>

      <section className='grid gap-3 md:grid-cols-4'>
        <WorkflowCard title='Stocks' description='Controle rupture et stock faible.' />
        <WorkflowCard title='Mise en avant' description={`${featuredCount} produit(s) selectionne(s).`} />
        <WorkflowCard title='Precommandes' description='Activation produit par produit.' />
        <WorkflowCard title='Synchronisation' description='Recharge directe depuis Dolibarr.' />
      </section>

      <Card>
        <CardHeader className='gap-3'>
          <CardTitle className='text-base'>Produits Dolibarr</CardTitle>
          <div className='grid gap-2 md:grid-cols-[1fr_220px]'>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Rechercher reference, libelle ou description'
            />
            <select
              className='border-input bg-background h-9 rounded-md border px-3 text-sm'
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
            >
              <option value='all'>Tous les produits</option>
              <option value='out'>Rupture</option>
              <option value='low'>Stock faible</option>
              <option value='available'>Disponible</option>
              <option value='featured'>Mis en avant</option>
              <option value='preorder'>Precommande</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className='text-muted-foreground text-sm'>Chargement du catalogue...</p>
          ) : isError ? (
            <p className='text-sm text-red-600'>
              {error instanceof Error ? error.message : 'Impossible de charger les produits admin.'}
            </p>
          ) : filteredProducts.length === 0 ? (
            <p className='text-muted-foreground text-sm'>Aucun produit trouve.</p>
          ) : (
            <div className='overflow-x-auto rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Visibilite</TableHead>
                    <TableHead>Precommande</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const stock = getStock(product);
                    const productFlags = flags[product.id] ?? getDefaultFlags();
                    return (
                      <TableRow key={product.id} className='align-top'>
                        <TableCell className='min-w-96'>
                          <div className='flex items-start gap-3'>
                            <div className='bg-muted relative size-14 shrink-0 overflow-hidden rounded-md'>
                              <Image
                                src={`/api/dolibarr/products/${product.id}/image`}
                                alt={product.label}
                                fill
                                unoptimized
                                sizes='56px'
                                className='object-cover'
                              />
                            </div>
                            <div className='min-w-0'>
                              <p className='font-mono text-xs text-muted-foreground'>{product.ref}</p>
                              <p className='font-medium'>{product.label}</p>
                              <p className='text-muted-foreground line-clamp-2 text-xs'>
                                {product.description || 'Sans description'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className='min-w-32'>
                          <PriceDisplay amount={getPriceHt(product)} showTva tvaRate={Number(product.tva_tx ?? 0)} />
                        </TableCell>
                        <TableCell className='min-w-36'>
                          <div className='space-y-1'>
                            <p className='font-mono text-sm'>{stock}</p>
                            {stock <= 0 ? (
                              <Badge className='bg-red-600 text-white'>Rupture</Badge>
                            ) : stock <= 5 ? (
                              <Badge className='bg-amber-500 text-white'>Stock faible</Badge>
                            ) : (
                              <Badge className='bg-green-600 text-white'>Disponible</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='min-w-40'>
                          <Button
                            type='button'
                            size='sm'
                            variant={productFlags.featured ? 'default' : 'outline'}
                            onClick={() =>
                              updateFlags(product.id, { featured: !productFlags.featured })
                            }
                          >
                            {productFlags.featured ? 'Mis en avant' : 'Mettre en avant'}
                          </Button>
                        </TableCell>
                        <TableCell className='min-w-44'>
                          <Button
                            type='button'
                            size='sm'
                            variant={productFlags.preorder ? 'default' : 'outline'}
                            onClick={() =>
                              updateFlags(product.id, { preorder: !productFlags.preorder })
                            }
                          >
                            {productFlags.preorder ? 'Precommande ON' : 'Activer'}
                          </Button>
                        </TableCell>
                        <TableCell className='min-w-32'>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            onClick={() => setProductEditor(product)}
                          >
                            <Icons.edit className='size-4' />
                            Modifier
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductEditorDialog
        product={productEditor}
        isPending={productMutation.isPending}
        onOpenChange={(open) => !open && setProductEditor(undefined)}
        onSubmit={(values) => productMutation.mutate(values)}
      />
    </div>
  );
}

function ProductEditorDialog({
  product,
  isPending,
  onOpenChange,
  onSubmit
}: {
  product: DolibarrProduct | null | undefined;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProductFormValues) => void;
}) {
  const [values, setValues] = useState<ProductFormValues>(getDefaultProductFormValues(null));
  const isOpen = product !== undefined;
  const isEdit = Boolean(product);

  useEffect(() => {
    if (isOpen) setValues(getDefaultProductFormValues(product));
  }, [isOpen, product]);

  const price = Number(values.priceHt);
  const tva = Number(values.tvaTx);
  const canSubmit =
    values.ref.trim().length > 0 &&
    values.label.trim().length > 0 &&
    Number.isFinite(price) &&
    price >= 0 &&
    Number.isFinite(tva) &&
    tva >= 0;

  function updateValue(field: keyof ProductFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le produit' : 'Ajouter un produit'}</DialogTitle>
          <DialogDescription>
            Les informations sont enregistrees dans Dolibarr puis le catalogue admin est recharge.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-3 sm:grid-cols-2'>
          <label className='block text-sm font-medium' htmlFor='admin-product-ref'>
            Reference
            <Input
              id='admin-product-ref'
              className='mt-1'
              value={values.ref}
              onChange={(event) => updateValue('ref', event.target.value)}
              placeholder='REF-001'
            />
          </label>
          <label className='block text-sm font-medium' htmlFor='admin-product-label'>
            Libelle
            <Input
              id='admin-product-label'
              className='mt-1'
              value={values.label}
              onChange={(event) => updateValue('label', event.target.value)}
              placeholder='Nom du produit'
            />
          </label>
          <label className='block text-sm font-medium' htmlFor='admin-product-price'>
            Prix HT
            <Input
              id='admin-product-price'
              className='mt-1'
              type='number'
              min='0'
              step='0.01'
              value={values.priceHt}
              onChange={(event) => updateValue('priceHt', event.target.value)}
            />
          </label>
          <label className='block text-sm font-medium' htmlFor='admin-product-tva'>
            TVA (%)
            <Input
              id='admin-product-tva'
              className='mt-1'
              type='number'
              min='0'
              step='0.01'
              value={values.tvaTx}
              onChange={(event) => updateValue('tvaTx', event.target.value)}
            />
          </label>
          <label className='block text-sm font-medium sm:col-span-2' htmlFor='admin-product-description'>
            Description
            <Textarea
              id='admin-product-description'
              className='mt-1 min-h-28'
              value={values.description}
              onChange={(event) => updateValue('description', event.target.value)}
              placeholder='Description courte visible dans le catalogue'
            />
          </label>
        </div>
        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type='button'
            isLoading={isPending}
            disabled={!canSubmit}
            onClick={() => onSubmit(values)}
          >
            {isEdit ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({
  label,
  value,
  detail
}: {
  label: string;
  value: ReactNode;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium'>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-semibold'>{value}</div>
        <p className='text-muted-foreground mt-1 text-sm'>{detail}</p>
      </CardContent>
    </Card>
  );
}

function WorkflowCard({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className='p-4'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <p className='text-sm font-semibold'>{title}</p>
            <p className='text-muted-foreground mt-1 text-xs'>{description}</p>
          </div>
          <Badge className='bg-green-600 text-white'>Connecte</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
