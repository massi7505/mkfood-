'use client';

import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DolibarrInvoice, DolibarrOrder } from '@/lib/dolibarr/types';
import { getInvoiceDate } from '@/lib/invoices/format';
import { isInvoicePaid } from '@/lib/invoices/status';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

type AdminOrder = DolibarrOrder;
type AdminInvoice = DolibarrInvoice;

interface AdminOrdersResponse {
  orders: AdminOrder[];
}

interface AdminInvoicesResponse {
  invoices: AdminInvoice[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Chargement impossible');
  return response.json() as Promise<T>;
}

function getMonthKey(timestamp: number | string | null | undefined) {
  const date =
    typeof timestamp === 'number'
      ? new Date(timestamp * 1000)
      : timestamp
        ? getInvoiceDate(timestamp)
        : null;

  return date ? format(date, 'yyyy-MM') : 'sans-date';
}

export function AdminCommerceOverview() {
  const ordersQuery = useQuery({
    queryKey: ['admin-orders', 'commerce-overview'],
    queryFn: () => fetchJson<AdminOrdersResponse>('/api/admin/orders?limit=500'),
    staleTime: 30_000
  });
  const invoicesQuery = useQuery({
    queryKey: ['admin-invoices', 'commerce-overview'],
    queryFn: () => fetchJson<AdminInvoicesResponse>('/api/admin/invoices?limit=500'),
    staleTime: 30_000
  });

  const orders = ordersQuery.data?.orders ?? [];
  const invoices = invoicesQuery.data?.invoices ?? [];
  const revenueTtc = invoices.reduce((sum, invoice) => sum + Number(invoice.total_ttc ?? 0), 0);
  const openAmount = invoices.reduce(
    (sum, invoice) => sum + Math.max(Number(invoice.remaintopay ?? 0), 0),
    0
  );
  const paidAmount = invoices.reduce(
    (sum, invoice) =>
      sum + Math.max(Number(invoice.total_ttc ?? 0) - Number(invoice.remaintopay ?? 0), 0),
    0
  );
  const averageOrder = orders.length
    ? orders.reduce((sum, order) => sum + Number(order.total_ttc ?? 0), 0) / orders.length
    : 0;
  const conversionRate = orders.length
    ? (orders.filter((order) => Number(order.billed ?? 0) === 1).length / orders.length) * 100
    : 0;

  const monthlyRows = Array.from(
    invoices.reduce((map, invoice) => {
      const key = getMonthKey(invoice.date);
      const current = map.get(key) ?? { month: key, ventes: 0, encaisse: 0 };
      const total = Number(invoice.total_ttc ?? 0);
      const remaining = Number(invoice.remaintopay ?? 0);
      current.ventes += total;
      current.encaisse += Math.max(total - remaining, 0);
      map.set(key, current);
      return map;
    }, new Map<string, { month: string; ventes: number; encaisse: number }>())
  )
    .map(([, value]) => value)
    .toSorted((a, b) => a.month.localeCompare(b.month))
    .slice(-8);

  const statusRows = [
    { label: 'Commandes', value: orders.length },
    { label: 'Facturees', value: orders.filter((order) => Number(order.billed ?? 0) === 1).length },
    { label: 'Factures', value: invoices.length },
    { label: 'Payees', value: invoices.filter(isInvoicePaid).length }
  ];

  if (ordersQuery.isLoading || invoicesQuery.isLoading) {
    return (
      <Card>
        <CardContent className='p-6 text-sm text-muted-foreground'>
          Chargement de la visibilite commerce...
        </CardContent>
      </Card>
    );
  }

  if (ordersQuery.isError || invoicesQuery.isError) {
    return (
      <Card>
        <CardContent className='p-6 text-sm text-red-600'>
          Impossible de charger la visibilite commerce.
        </CardContent>
      </Card>
    );
  }

  return (
    <section className='grid gap-4 xl:grid-cols-[1.5fr_0.9fr]'>
      <Card>
        <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle className='text-base'>Visibilite commerce</CardTitle>
          <Badge variant='outline'>{orders.length} commande(s) analysees</Badge>
        </CardHeader>
        <CardContent>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <CommerceMetric label='CA TTC' value={<PriceDisplay amount={revenueTtc} />} />
            <CommerceMetric label='Encaisse' value={<PriceDisplay amount={paidAmount} />} />
            <CommerceMetric label='Encours' value={<PriceDisplay amount={openAmount} />} />
            <CommerceMetric label='Panier moyen' value={<PriceDisplay amount={averageOrder} />} />
          </div>
          <div className='mt-5 h-72'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={monthlyRows}>
                <defs>
                  <linearGradient id='commerceRevenue' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#2563eb' stopOpacity={0.35} />
                    <stop offset='95%' stopColor='#2563eb' stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' vertical={false} />
                <XAxis dataKey='month' tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={72} />
                <Tooltip formatter={(value) => `${Number(value).toFixed(2)} EUR`} />
                <Area
                  type='monotone'
                  dataKey='ventes'
                  stroke='#2563eb'
                  strokeWidth={2}
                  fill='url(#commerceRevenue)'
                />
                <Area
                  type='monotone'
                  dataKey='encaisse'
                  stroke='#16a34a'
                  strokeWidth={2}
                  fill='transparent'
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Tunnel commercial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='h-72'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={statusRows} layout='vertical' margin={{ left: 18 }}>
                <CartesianGrid strokeDasharray='3 3' horizontal={false} />
                <XAxis type='number' allowDecimals={false} />
                <YAxis dataKey='label' type='category' width={86} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey='value' fill='#18181b' radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className='rounded-lg border bg-muted/30 p-3'>
            <p className='text-sm font-medium'>Transformation facturee</p>
            <p className='text-2xl font-semibold'>{conversionRate.toFixed(0)}%</p>
            <p className='text-muted-foreground text-xs'>Commandes marquees facturees dans Dolibarr.</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function CommerceMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className='rounded-lg border bg-white p-3'>
      <p className='text-muted-foreground text-xs'>{label}</p>
      <div className='mt-1 text-lg font-semibold'>{value}</div>
    </div>
  );
}
