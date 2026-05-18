'use client';

import type { DolibarrInvoice } from '@/lib/dolibarr/types';
import { isInvoicePaid } from '@/lib/invoices/status';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAccount } from './useAccount';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = (await response.json().catch(() => null)) as { error?: string } | T | null;
  if (!response.ok) throw new Error((payload as { error?: string } | null)?.error ?? 'Erreur API');
  return payload as T;
}

export function useInvoices(status: 'all' | 'unpaid' = 'all', enabled = true) {
  const { account, isLoading: isAccountLoading } = useAccount(enabled);
  const query = useQuery({
    queryKey: ['invoices', account?.thirdpartyId ?? 0, status],
    queryFn: () =>
      fetchJson<DolibarrInvoice[]>(
        `/api/dolibarr/invoices${status === 'unpaid' ? '?status=unpaid' : ''}`
      ),
    staleTime: 0,
    gcTime: 0,
    enabled: enabled && Boolean(account) && !isAccountLoading
  });

  return {
    invoices: query.data ?? [],
    isLoading: isAccountLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  };
}

export function useInvoicePDF(invoiceId: string, invoice?: DolibarrInvoice) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function downloadPDF() {
    if (invoice && !isInvoicePaid(invoice)) {
      toast.error('PDF disponible uniquement apres paiement');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/dolibarr/invoices/${invoiceId}/pdf`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Telechargement impossible');
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Le PDF genere est vide');
      }

      const disposition = response.headers.get('Content-Disposition');
      const filename = disposition?.match(/filename="(.+)"/)?.[1] ?? `facture-${invoiceId}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('PDF telecharge');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Telechargement impossible');
    } finally {
      setIsDownloading(false);
    }
  }

  return { downloadPDF, isDownloading };
}
