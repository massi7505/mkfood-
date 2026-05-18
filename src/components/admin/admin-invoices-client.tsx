'use client';

import { getInvoiceStatus, InvoiceBadge } from '@/components/invoices/InvoiceBadge';
import { Icons } from '@/components/icons';
import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { DolibarrInvoice } from '@/lib/dolibarr/types';
import { formatInvoiceDate, getInvoiceDate, invoiceDateIso } from '@/lib/invoices/format';
import { getInvoiceDelay, isInvoiceOverdue } from '@/lib/invoices/reminders';
import { isInvoicePaid } from '@/lib/invoices/status';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

interface PortalUserSummary {
  email: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  mobile: string | null;
  thirdpartyId: number;
}

type AdminInvoice = DolibarrInvoice & {
  portalUser: PortalUserSummary | null;
};

interface AdminInvoicesResponse {
  invoices: AdminInvoice[];
}

interface ApiErrorPayload {
  error?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = (await response.json().catch(() => null)) as ApiErrorPayload | T | null;

  if (!response.ok) {
    throw new Error((payload as ApiErrorPayload | null)?.error ?? 'Erreur API');
  }

  return payload as T;
}

function getInvoiceCustomer(invoice: AdminInvoice) {
  return (
    invoice.portalUser?.companyName ??
    invoice.portalUser?.name ??
    invoice.portalUser?.email ??
    `Tiers #${invoice.socid ?? invoice.fk_soc ?? '-'}`
  );
}

function escapeCsv(value: string | number) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function exportAccountingCsv(invoices: AdminInvoice[]) {
  const headers = [
    'Reference',
    'Client',
    'Email',
    'Date facture',
    'Echeance',
    'Statut',
    'Total HT',
    'TVA',
    'Total TTC',
    'Restant du',
    'Retard jours'
  ];
  const rows = invoices.map((invoice) => {
    const totalHt = Number(invoice.total_ht ?? 0);
    const totalTtc = Number(invoice.total_ttc ?? 0);
    return [
      invoice.ref,
      getInvoiceCustomer(invoice),
      invoice.portalUser?.email ?? '',
      invoiceDateIso(invoice.date),
      invoiceDateIso(invoice.date_lim_reglement),
      getInvoiceStatus(invoice),
      totalHt.toFixed(2),
      (totalTtc - totalHt).toFixed(2),
      totalTtc.toFixed(2),
      Number(invoice.remaintopay ?? 0).toFixed(2),
      isInvoiceOverdue(invoice) ? String(getInvoiceDelay(invoice)) : '0'
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `export-comptabilite-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadAdminPdf(invoice: AdminInvoice) {
  const response = await fetch(`/api/admin/invoices/${invoice.id}/pdf`);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    throw new Error(payload?.error ?? 'Telechargement PDF impossible');
  }

  const blob = await response.blob();
  if (blob.size === 0) throw new Error('PDF vide');

  const disposition = response.headers.get('Content-Disposition');
  const filename = disposition?.match(/filename="(.+)"/)?.[1] ?? `facture-${invoice.id}.pdf`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminInvoicesClient() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => fetchJson<AdminInvoicesResponse>('/api/admin/invoices?limit=200'),
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const invoices = useMemo(() => data?.invoices ?? [], [data?.invoices]);
  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const invoiceDate = getInvoiceDate(invoice.date);
      const normalizedStatus = getInvoiceStatus(invoice);
      const haystack = [
        invoice.ref,
        getInvoiceCustomer(invoice),
        invoice.portalUser?.email,
        invoice.portalUser?.phone,
        invoice.portalUser?.mobile
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      const matchesStatus = status === 'all' || normalizedStatus === status;
      const matchesFrom = dateFrom && invoiceDate ? invoiceDate >= new Date(dateFrom) : true;
      const matchesTo =
        dateTo && invoiceDate ? invoiceDate <= new Date(`${dateTo}T23:59:59`) : true;

      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });
  }, [dateFrom, dateTo, invoices, search, status]);

  const openAmount = invoices
    .filter((invoice) => !isInvoicePaid(invoice))
    .reduce((sum, invoice) => sum + Number(invoice.remaintopay ?? 0), 0);
  const overdueInvoices = invoices.filter((invoice) => getInvoiceStatus(invoice) === 'overdue');
  const paidCount = invoices.filter(isInvoicePaid).length;
  const clientsCount = new Set(
    invoices.map((invoice) => Number(invoice.socid ?? invoice.fk_soc ?? 0)).filter(Boolean)
  ).size;

  async function handlePdf(invoice: AdminInvoice) {
    setDownloadingId(invoice.id);
    try {
      await downloadAdminPdf(invoice);
      toast.success('PDF telecharge');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Telechargement impossible');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 border-b pb-5 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <p className='text-muted-foreground text-sm'>Administration</p>
          <h1 className='text-2xl font-semibold tracking-normal md:text-3xl'>
            Facturation clients
          </h1>
          <p className='text-muted-foreground mt-2 text-sm'>
            Lister les factures par client, telecharger les PDF, piloter les relances et exporter.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            disabled={filteredInvoices.length === 0}
            onClick={() => exportAccountingCsv(filteredInvoices)}
          >
            <Icons.upload className='size-4' />
            Export comptable
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-invoices'] })}
          >
            <Icons.refreshCw className='size-4' />
            Actualiser Dolibarr
          </Button>
        </div>
      </div>

      <section className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard label='A encaisser' value={<PriceDisplay amount={openAmount} />} detail='Restant du total' />
        <MetricCard label='En retard' value={overdueInvoices.length} detail='Relances prioritaires' />
        <MetricCard label='Payees' value={paidCount} detail='Factures soldees' />
        <MetricCard label='Clients' value={clientsCount} detail='Clients avec factures' />
      </section>

      <section className='grid gap-3 md:grid-cols-4'>
        <WorkflowCard title='Factures par client' description='Liste globale groupee par client.' />
        <WorkflowCard title='PDF' description='Telechargement admin sans restriction client.' />
        <WorkflowCard title='Relances' description='Retards et montant restant visibles.' />
        <WorkflowCard title='Comptabilite' description='Export CSV filtre pour rapprochement.' />
      </section>

      <Card>
        <CardHeader className='gap-3'>
          <CardTitle className='text-base'>Factures Dolibarr</CardTitle>
          <div className='grid gap-2 lg:grid-cols-[1fr_180px_160px_160px]'>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Rechercher client, email ou reference'
            />
            <select
              className='border-input bg-background h-9 rounded-md border px-3 text-sm'
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value='all'>Toutes</option>
              <option value='paid'>Payees</option>
              <option value='pending'>En attente</option>
              <option value='overdue'>En retard</option>
              <option value='draft'>Brouillon</option>
            </select>
            <Input
              type='date'
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <Input type='date' value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className='text-muted-foreground text-sm'>Chargement des factures...</p>
          ) : isError ? (
            <p className='text-sm text-red-600'>
              {error instanceof Error ? error.message : 'Impossible de charger les factures admin.'}
            </p>
          ) : filteredInvoices.length === 0 ? (
            <p className='text-muted-foreground text-sm'>Aucune facture trouvee.</p>
          ) : (
            <div className='overflow-x-auto rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facture</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Echeance</TableHead>
                    <TableHead>Montants</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Relance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className='align-top'>
                      <TableCell className='min-w-40'>
                        <p className='font-mono text-sm font-semibold'>{invoice.ref}</p>
                        <p className='text-muted-foreground text-xs'>
                          {formatInvoiceDate(invoice.date)}
                        </p>
                      </TableCell>
                      <TableCell className='min-w-56'>
                        <p className='font-medium'>{getInvoiceCustomer(invoice)}</p>
                        <p className='text-muted-foreground text-xs'>
                          {invoice.portalUser?.email ?? `thirdparty ${invoice.socid ?? invoice.fk_soc}`}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {invoice.portalUser?.mobile ?? invoice.portalUser?.phone ?? ''}
                        </p>
                      </TableCell>
                      <TableCell className='min-w-32'>
                        <p>{formatInvoiceDate(invoice.date_lim_reglement)}</p>
                      </TableCell>
                      <TableCell className='min-w-40'>
                        <PriceDisplay amount={Number(invoice.total_ttc)} className='font-semibold' />
                        <p className='text-muted-foreground text-xs'>
                          Restant <PriceDisplay amount={Number(invoice.remaintopay)} />
                        </p>
                      </TableCell>
                      <TableCell className='min-w-32'>
                        <InvoiceBadge invoice={invoice} />
                      </TableCell>
                      <TableCell className='min-w-48'>
                        {isInvoiceOverdue(invoice) ? (
                          <div className='space-y-1'>
                            <Badge className='bg-red-600 text-white'>
                              {getInvoiceDelay(invoice)} jour(s)
                            </Badge>
                            <p className='text-muted-foreground text-xs'>
                              Relance prioritaire
                            </p>
                          </div>
                        ) : (
                          <p className='text-muted-foreground text-sm'>Aucune relance</p>
                        )}
                      </TableCell>
                      <TableCell className='min-w-44'>
                        <div className='flex flex-wrap gap-2'>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            isLoading={downloadingId === invoice.id}
                            onClick={() => handlePdf(invoice)}
                          >
                            PDF
                          </Button>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            disabled={!invoice.portalUser?.email || !isInvoiceOverdue(invoice)}
                            onClick={() => {
                              const subject = encodeURIComponent(`Relance facture ${invoice.ref}`);
                              const body = encodeURIComponent(
                                `Bonjour,\n\nLa facture ${invoice.ref} presente un solde restant de ${invoice.remaintopay} EUR.\nMerci de proceder au reglement.\n\nCordialement,`
                              );
                              window.location.href = `mailto:${invoice.portalUser?.email}?subject=${subject}&body=${body}`;
                            }}
                          >
                            Relancer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
