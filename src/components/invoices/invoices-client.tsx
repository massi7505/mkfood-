'use client';

import { getInvoiceStatus } from '@/components/invoices/InvoiceBadge';
import { InvoiceStats } from '@/components/invoices/InvoiceStats';
import { InvoiceTable } from '@/components/invoices/InvoiceTable';
import { DataTableToolbar } from '@/components/shared/DataTableToolbar';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useInvoices } from '@/hooks/useInvoices';
import type { DolibarrInvoice } from '@/lib/dolibarr/types';
import { getInvoiceDate, invoiceDateIso } from '@/lib/invoices/format';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

function exportCsv(invoices: DolibarrInvoice[]) {
  const header = ['ref', 'date', 'echeance', 'total_ht', 'total_ttc', 'remaintopay', 'statut'];
  const rows = invoices.map((invoice) => [
    invoice.ref,
    invoiceDateIso(invoice.date),
    invoiceDateIso(invoice.date_lim_reglement),
    invoice.total_ht,
    invoice.total_ttc,
    invoice.remaintopay,
    getInvoiceStatus(invoice)
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'factures.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function InvoicesClient() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { invoices, isLoading, isError, error } = useInvoices('all');

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const invoiceDate = getInvoiceDate(invoice.date);
      const normalizedStatus = getInvoiceStatus(invoice);
      const matchesStatus = status === 'all' || normalizedStatus === status;
      const matchesSearch = invoice.ref.toLowerCase().includes(search.toLowerCase());
      const matchesFrom = dateFrom && invoiceDate ? invoiceDate >= new Date(dateFrom) : true;
      const matchesTo =
        dateTo && invoiceDate ? invoiceDate <= new Date(`${dateTo}T23:59:59`) : true;
      return matchesStatus && matchesSearch && matchesFrom && matchesTo;
    });
  }, [dateFrom, dateTo, invoices, search, status]);

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Mes factures'
        description='Suivi, filtres et telechargement PDF de vos factures.'
      />

      <InvoiceStats invoices={invoices} />

      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        onExport={() => exportCsv(filteredInvoices)}
        onReset={() => {
          setSearch('');
          setStatus('all');
          setDateFrom('');
          setDateTo('');
        }}
        placeholder='Reference facture'
        filters={
          <div className='grid flex-1 gap-2 sm:grid-cols-3'>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder='Statut' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Toutes</SelectItem>
                <SelectItem value='paid'>Payees</SelectItem>
                <SelectItem value='pending'>En attente</SelectItem>
                <SelectItem value='overdue'>En retard</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type='date'
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <Input type='date' value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        }
      />

      {isLoading && (
        <div className='rounded-lg border'>
          {Array.from({ length: 8 }).map((_, index) => (
            <LoadingSkeleton variant='table-row' key={index} />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          icon={FileText}
          title='Factures indisponibles'
          description={
            error instanceof Error && error.message === 'Compte client non rattache'
              ? 'Votre compte doit etre rattache a une fiche client Dolibarr avant de voir les factures.'
              : "Impossible de charger vos factures pour l'instant."
          }
        />
      )}

      {isError && error instanceof Error && error.message === 'Compte client non rattache' && (
        <div>
          <Link className='text-sm font-medium text-blue-600 hover:underline' href='/account'>
            Completer mon compte
          </Link>
        </div>
      )}

      {!isLoading && !isError && filteredInvoices.length === 0 && (
        <EmptyState
          icon={FileText}
          title='Aucune facture'
          description='Aucune facture ne correspond aux filtres.'
        />
      )}

      {!isLoading && !isError && filteredInvoices.length > 0 && (
        <InvoiceTable invoices={filteredInvoices} />
      )}
    </div>
  );
}
