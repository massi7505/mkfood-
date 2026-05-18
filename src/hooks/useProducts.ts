'use client';

import type { DolibarrProduct, ProductFilters } from '@/lib/dolibarr/types';
import { useQuery } from '@tanstack/react-query';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error((await response.json().catch(() => null))?.error ?? 'Erreur API');
  return response.json() as Promise<T>;
}

export function useProducts(filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.limit) params.set('limit', String(filters.limit));

  const query = useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchJson<DolibarrProduct[]>(`/api/dolibarr/products?${params.toString()}`),
    staleTime: 3_600_000,
    gcTime: 7_200_000
  });

  return {
    products: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch
  };
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => fetchJson<DolibarrProduct>(`/api/dolibarr/products/${id}`),
    enabled: !!id
  });
}
