'use client';

import { useCartStore } from '@/lib/store/cart';
import type { DolibarrInvoice, DolibarrOrder } from '@/lib/dolibarr/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAccount } from './useAccount';

class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => null)) as { error?: string } | T | null;
  if (!response.ok) {
    throw new ApiError(
      (payload as { error?: string } | null)?.error ?? 'Erreur API',
      response.status
    );
  }
  return payload as T;
}

function compareOrdersNewestFirst(a: DolibarrOrder, b: DolibarrOrder): number {
  const dateDifference = Number(b.date_commande ?? 0) - Number(a.date_commande ?? 0);
  if (dateDifference !== 0) return dateDifference;

  return Number(b.id ?? 0) - Number(a.id ?? 0);
}

export function useOrders() {
  const { account, isLoading: isAccountLoading } = useAccount();
  const query = useQuery({
    queryKey: ['orders', account?.thirdpartyId ?? 0],
    queryFn: () => fetchJson<DolibarrOrder[]>('/api/dolibarr/orders'),
    staleTime: 0,
    gcTime: 0,
    enabled: Boolean(account) && !isAccountLoading,
    refetchOnWindowFocus: true
  });

  return {
    orders: query.data?.toSorted(compareOrdersNewestFirst) ?? [],
    isLoading: isAccountLoading || query.isLoading,
    isError: query.isError,
    refetch: query.refetch
  };
}

export function useOrder(id: string) {
  const { account, isLoading: isAccountLoading } = useAccount();
  return useQuery({
    queryKey: ['orders', account?.thirdpartyId ?? 0, 'detail', id],
    queryFn: () => fetchJson<DolibarrOrder>(`/api/dolibarr/orders/${id}`),
    enabled: !!id && Boolean(account) && !isAccountLoading
  });
}

export function useCreateInvoiceFromOrder(orderId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () =>
      fetchJson<DolibarrInvoice>(`/api/dolibarr/orders/${orderId}/invoice`, {
        method: 'POST'
      }),
    onSuccess: async (invoice) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] })
      ]);
      toast.success(`Facture creee ${invoice.ref ?? ''}`);
      router.push('/invoices');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Generation impossible');
    }
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const closeCart = useCartStore((state) => state.closeCart);

  return useMutation({
    mutationFn: () =>
      fetchJson<DolibarrOrder>('/api/dolibarr/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            priceHt: item.priceHt
          }))
        })
      }),
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      clear();
      closeCart();
      toast.success('Commande creee');
      router.push(`/orders/${order.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        toast.info('Connectez-vous pour valider votre commande');
        router.push('/login?callbackUrl=/store');
        return;
      }

      toast.error(error instanceof Error ? error.message : 'Commande impossible');
    }
  });
}
