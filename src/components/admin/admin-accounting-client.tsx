'use client';

import { Icons } from '@/components/icons';
import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { DolibarrInvoice, DolibarrOrder, DolibarrProduct } from '@/lib/dolibarr/types';
import { formatInvoiceDate, getInvoiceDate, invoiceDateIso } from '@/lib/invoices/format';
import { getInvoiceDelay, isInvoiceOverdue } from '@/lib/invoices/reminders';
import { getInvoiceStatus, isInvoicePaid } from '@/lib/invoices/status';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

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

type AdminOrder = DolibarrOrder & {
  portalUser: PortalUserSummary | null;
};

interface AdminInvoicesResponse {
  invoices: AdminInvoice[];
}

interface AdminOrdersResponse {
  orders: AdminOrder[];
}

interface AdminProductsResponse {
  products: DolibarrProduct[];
}

interface ApiErrorPayload {
  error?: string;
}

type AccountingView = 'sales' | 'payments' | 'reconcile' | 'clients';

interface ClientExposure {
  thirdpartyId: number;
  customer: string;
  email: string;
  invoiceCount: number;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  totalInvoiced: number;
  paidAmount: number;
  remainingDue: number;
}

interface ProductMarginSummary {
  soldHt: number;
  soldTtc: number;
  collectedTva: number;
  purchaseCost: number;
  profit: number;
  marginRate: number;
  minSaleHt: number;
  belowMinCount: number;
  missingCostCount: number;
  lineCount: number;
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

function getOrderCustomer(order: AdminOrder) {
  return (
    order.portalUser?.companyName ??
    order.portalUser?.name ??
    order.portalUser?.email ??
    `Tiers #${order.socid ?? order.fk_soc ?? '-'}`
  );
}

function escapeCsv(value: string | number) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function exportSalesCsv(invoices: AdminInvoice[]) {
  const headers = [
    'Reference',
    'Client',
    'Email',
    'Date',
    'Echeance',
    'Statut',
    'Total HT',
    'TVA',
    'Total TTC',
    'Verse',
    'Restant du'
  ];
  const rows = invoices.map((invoice) => {
    const totalHt = Number(invoice.total_ht ?? 0);
    const totalTtc = Number(invoice.total_ttc ?? 0);
    const remaining = Number(invoice.remaintopay ?? 0);
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
      Math.max(totalTtc - remaining, 0).toFixed(2),
      remaining.toFixed(2)
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ventes-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function getPaymentPercent(invoice: AdminInvoice) {
  const total = Number(invoice.total_ttc ?? 0);
  const remaining = Number(invoice.remaintopay ?? 0);
  if (total <= 0) return 0;
  return Math.min(Math.max(((total - remaining) / total) * 100, 0), 100);
}

function getClientExposures(invoices: AdminInvoice[]): ClientExposure[] {
  const clients = new Map<number, ClientExposure>();

  for (const invoice of invoices) {
    const thirdpartyId = Number(invoice.socid ?? invoice.fk_soc ?? 0);
    if (thirdpartyId <= 0) continue;

    const totalTtc = Number(invoice.total_ttc ?? 0);
    const remainingDue = Math.max(Number(invoice.remaintopay ?? 0), 0);
    const current = clients.get(thirdpartyId) ?? {
      thirdpartyId,
      customer: getInvoiceCustomer(invoice),
      email: invoice.portalUser?.email ?? '',
      invoiceCount: 0,
      openInvoiceCount: 0,
      overdueInvoiceCount: 0,
      totalInvoiced: 0,
      paidAmount: 0,
      remainingDue: 0
    };
    current.invoiceCount += 1;
    current.openInvoiceCount += remainingDue > 0 ? 1 : 0;
    current.overdueInvoiceCount += remainingDue > 0 && isInvoiceOverdue(invoice) ? 1 : 0;
    current.totalInvoiced += totalTtc;
    current.paidAmount += Math.max(totalTtc - remainingDue, 0);
    current.remainingDue += remainingDue;
    clients.set(thirdpartyId, current);
  }

  return Array.from(clients.values()).toSorted((a, b) => b.remainingDue - a.remainingDue);
}

function invoiceReferencesOrder(invoice: AdminInvoice, order: AdminOrder) {
  const orderId = String(order.id);
  if (String(invoice.origin_id ?? '') === orderId) return true;
  if (String(invoice.fk_source ?? '') === orderId) return true;

  const linkedValues = [
    invoice.linkedObjectsIds,
    invoice.linked_objects,
    invoice.array_options
  ].filter(Boolean);
  return linkedValues.some((value) => JSON.stringify(value).includes(orderId));
}

function getOrderDate(order: AdminOrder) {
  const timestamp = Number(order.date_commande ?? 0);
  return timestamp > 0 ? new Date(timestamp * 1000) : null;
}

function getProductNumber(product: DolibarrProduct | undefined, keys: Array<keyof DolibarrProduct>) {
  if (!product) return 0;

  for (const key of keys) {
    const value = Number(product[key] ?? 0);
    if (Number.isFinite(value) && value > 0) return value;
  }

  return 0;
}

function getProductSalePriceHt(product: DolibarrProduct | undefined) {
  const priceHt = getProductNumber(product, ['price_ht', 'price']);
  if (priceHt > 0) return priceHt;

  const priceTtc = getProductNumber(product, ['price_ttc']);
  const vatRate = Number(product?.tva_tx ?? 0);
  return priceTtc > 0 && vatRate > 0 ? priceTtc / (1 + vatRate / 100) : priceTtc;
}

function getProductMinSalePriceHt(product: DolibarrProduct | undefined) {
  const priceMinHt = getProductNumber(product, ['price_min_ht', 'price_min']);
  if (priceMinHt > 0) return priceMinHt;

  const priceMinTtc = getProductNumber(product, ['price_min_ttc']);
  const vatRate = Number(product?.tva_tx ?? 0);
  return priceMinTtc > 0 && vatRate > 0 ? priceMinTtc / (1 + vatRate / 100) : priceMinTtc;
}

function getProductPurchasePriceHt(product: DolibarrProduct | undefined) {
  return getProductNumber(product, [
    'cost_price',
    'pmp',
    'buyprice',
    'buying_price',
    'last_purchase_price'
  ]);
}

function getProductVatRate(product: DolibarrProduct | undefined, lineVat: unknown) {
  const productVat = Number(product?.tva_tx ?? 0);
  const fallbackVat = Number(lineVat ?? 0);
  if (Number.isFinite(productVat) && productVat > 0) return productVat;
  if (Number.isFinite(fallbackVat) && fallbackVat > 0) return fallbackVat;
  return 0;
}

function getProductMarginSummary(
  orders: AdminOrder[],
  products: DolibarrProduct[]
): ProductMarginSummary {
  const productById = new Map(products.map((product) => [String(product.id), product]));
  const productByRef = new Map(products.map((product) => [product.ref, product]));

  return orders.reduce<ProductMarginSummary>(
    (summary, order) => {
      for (const line of order.lines ?? []) {
        const product =
          productById.get(String(line.fk_product ?? '')) ||
          productByRef.get(line.product_ref ?? '');
        const qty = Number(line.qty ?? 0);
        const soldHt = Number(line.total_ht ?? 0) || qty * Number(line.subprice ?? 0);
        const productSaleHt = getProductSalePriceHt(product);
        const purchaseUnitHt = getProductPurchasePriceHt(product);
        const minSaleUnitHt = getProductMinSalePriceHt(product);
        const vatRate = getProductVatRate(product, line.tva_tx);
        const purchaseCost = purchaseUnitHt * qty;
        const minSaleHt = minSaleUnitHt * qty;

        summary.soldHt += soldHt;
        summary.soldTtc += Number(line.total_ttc ?? 0) || soldHt * (1 + vatRate / 100);
        summary.collectedTva += soldHt * (vatRate / 100);
        summary.purchaseCost += purchaseCost;
        summary.profit += soldHt - purchaseCost;
        summary.minSaleHt += minSaleHt || productSaleHt * qty;
        summary.belowMinCount += minSaleUnitHt > 0 && soldHt < minSaleHt ? 1 : 0;
        summary.missingCostCount += purchaseUnitHt <= 0 ? 1 : 0;
        summary.lineCount += 1;
      }

      return summary;
    },
    {
      soldHt: 0,
      soldTtc: 0,
      collectedTva: 0,
      purchaseCost: 0,
      profit: 0,
      marginRate: 0,
      minSaleHt: 0,
      belowMinCount: 0,
      missingCostCount: 0,
      lineCount: 0
    }
  );
}

export function AdminAccountingClient() {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<AccountingView>('sales');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const invoicesQuery = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => fetchJson<AdminInvoicesResponse>('/api/admin/invoices?limit=500'),
    staleTime: 0,
    refetchOnWindowFocus: true
  });
  const ordersQuery = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => fetchJson<AdminOrdersResponse>('/api/admin/orders?limit=500'),
    staleTime: 0,
    refetchOnWindowFocus: true
  });
  const productsQuery = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => fetchJson<AdminProductsResponse>('/api/admin/products?limit=500'),
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const invoices = useMemo(() => invoicesQuery.data?.invoices ?? [], [invoicesQuery.data?.invoices]);
  const orders = useMemo(() => ordersQuery.data?.orders ?? [], [ordersQuery.data?.orders]);
  const products = useMemo(() => productsQuery.data?.products ?? [], [productsQuery.data?.products]);
  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const invoiceDate = getInvoiceDate(invoice.date);
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
      const matchesFrom = dateFrom && invoiceDate ? invoiceDate >= new Date(dateFrom) : true;
      const matchesTo =
        dateTo && invoiceDate ? invoiceDate <= new Date(`${dateTo}T23:59:59`) : true;

      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [dateFrom, dateTo, invoices, search]);
  const filteredOrdersForMargin = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const orderDate = getOrderDate(order);
      const haystack = [
        order.ref,
        getOrderCustomer(order),
        order.portalUser?.email,
        order.portalUser?.phone,
        order.portalUser?.mobile,
        (order.lines ?? []).map((line) => `${line.product_ref} ${line.product_label}`).join(' ')
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      const matchesFrom = dateFrom && orderDate ? orderDate >= new Date(dateFrom) : true;
      const matchesTo = dateTo && orderDate ? orderDate <= new Date(`${dateTo}T23:59:59`) : true;

      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [dateFrom, dateTo, orders, search]);

  const clientExposures = useMemo(() => getClientExposures(filteredInvoices), [filteredInvoices]);
  const openInvoices = filteredInvoices.filter((invoice) => !isInvoicePaid(invoice));
  const overdueInvoices = openInvoices.filter((invoice) => isInvoiceOverdue(invoice));
  const totalSales = filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.total_ht ?? 0), 0);
  const totalTva = filteredInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_ttc ?? 0) - Number(invoice.total_ht ?? 0),
    0
  );
  const remainingDue = openInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.remaintopay ?? 0),
    0
  );
  const paidAmount = filteredInvoices.reduce(
    (sum, invoice) =>
      sum + Math.max(Number(invoice.total_ttc ?? 0) - Number(invoice.remaintopay ?? 0), 0),
    0
  );
  const productMargin = useMemo(() => {
    const summary = getProductMarginSummary(filteredOrdersForMargin, products);
    return {
      ...summary,
      marginRate: summary.soldHt > 0 ? (summary.profit / summary.soldHt) * 100 : 0
    };
  }, [filteredOrdersForMargin, products]);
  const taxAndMarginRows = [
    { label: 'Vente HT', value: productMargin.soldHt },
    { label: 'TVA', value: productMargin.collectedTva },
    { label: 'Vente TTC', value: productMargin.soldTtc },
    { label: 'Achat', value: productMargin.purchaseCost },
    { label: 'Benefice', value: productMargin.profit },
    { label: 'Prix min', value: productMargin.minSaleHt }
  ];

  const reconcileRows = useMemo(
    () =>
      orders.slice(0, 80).map((order) => {
        const matchedInvoices = invoices.filter((invoice) => invoiceReferencesOrder(invoice, order));
        return {
          order,
          matchedInvoices,
          orderTotal: Number(order.total_ttc ?? 0),
          invoiceTotal: matchedInvoices.reduce(
            (sum, invoice) => sum + Number(invoice.total_ttc ?? 0),
            0
          )
        };
      }),
    [invoices, orders]
  );

  const isLoading = invoicesQuery.isLoading || ordersQuery.isLoading || productsQuery.isLoading;
  const isError = invoicesQuery.isError || ordersQuery.isError || productsQuery.isError;

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 border-b pb-5 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <p className='text-muted-foreground text-sm'>Administration</p>
          <h1 className='text-2xl font-semibold tracking-normal md:text-3xl'>
            Comptabilite
          </h1>
          <p className='text-muted-foreground mt-2 text-sm'>
            Exporter les ventes, controler les versements, rapprocher commandes et factures,
            puis suivre les encours client.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            disabled={filteredInvoices.length === 0}
            onClick={() => exportSalesCsv(filteredInvoices)}
          >
            <Icons.upload className='size-4' />
            Export ventes
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
              queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
              queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            }}
          >
            <Icons.refreshCw className='size-4' />
            Actualiser
          </Button>
        </div>
      </div>

      <section className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard label='Ventes HT' value={<PriceDisplay amount={totalSales} />} detail='Periode filtree' />
        <MetricCard label='TVA estimee' value={<PriceDisplay amount={totalTva} />} detail='TTC moins HT' />
        <MetricCard label='Versements' value={<PriceDisplay amount={paidAmount} />} detail='Montant deja encaisse' />
        <MetricCard label='Reste du' value={<PriceDisplay amount={remainingDue} />} detail={`${overdueInvoices.length} retard(s)`} />
      </section>

      <Card>
        <CardHeader className='gap-3'>
          <div className='flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between'>
            <div>
              <CardTitle className='text-base'>Marge, benefice, TVA et taxes</CardTitle>
              <p className='text-muted-foreground mt-1 text-sm'>
                Calcul depuis Dolibarr: lignes de commandes, prix d'achat/coût produit, prix de vente, prix minimum et TVA.
              </p>
            </div>
            <Badge variant='outline'>
              {productMargin.lineCount} ligne(s) produit - {products.length} produit(s)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className='grid gap-4 xl:grid-cols-[0.9fr_1.2fr]'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <MetricCard label='Vente HT lignes' value={<PriceDisplay amount={productMargin.soldHt} />} detail='Prix de vente Dolibarr' />
            <MetricCard label='Prix achat' value={<PriceDisplay amount={productMargin.purchaseCost} />} detail={`${productMargin.missingCostCount} ligne(s) sans cout`} />
            <MetricCard label='Benefice' value={<PriceDisplay amount={productMargin.profit} />} detail={`${productMargin.marginRate.toFixed(1)}% de marge`} />
            <MetricCard label='TVA collectee' value={<PriceDisplay amount={productMargin.collectedTva} />} detail={`${productMargin.belowMinCount} sous prix minimum`} />
          </div>
          <div className='h-72 rounded-lg border p-3'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={taxAndMarginRows}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} />
                <XAxis dataKey='label' tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={72} />
                <Tooltip formatter={(value) => `${Number(value).toFixed(2)} EUR`} />
                <Bar dataKey='value' fill='#2563eb' radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='gap-3'>
          <CardTitle className='text-base'>Fonctions du module</CardTitle>
          <div className='grid gap-2 lg:grid-cols-[1fr_160px_160px]'>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Filtrer client, email ou facture'
            />
            <Input
              type='date'
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <Input type='date' value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
          <ModuleActionCard
            active={activeView === 'sales'}
            label='Exporter les ventes'
            detail={`${filteredInvoices.length} facture(s) dans le filtre`}
            onOpen={() => setActiveView('sales')}
          />
          <ModuleActionCard
            active={activeView === 'payments'}
            label='Controler les paiements'
            detail={`${openInvoices.length} facture(s) non soldee(s)`}
            onOpen={() => setActiveView('payments')}
          />
          <ModuleActionCard
            active={activeView === 'reconcile'}
            label='Rapprocher factures et commandes'
            detail={`${reconcileRows.filter((row) => row.matchedInvoices.length === 0).length} a verifier`}
            onOpen={() => setActiveView('reconcile')}
          />
          <ModuleActionCard
            active={activeView === 'clients'}
            label='Suivre les encours client'
            detail={`${clientExposures.filter((client) => client.remainingDue > 0).length} client(s) ouverts`}
            onOpen={() => setActiveView('clients')}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className='p-6 text-sm text-muted-foreground'>
            Chargement comptabilite...
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className='p-6 text-sm text-red-600'>
            Impossible de charger les donnees comptables.
          </CardContent>
        </Card>
      ) : (
        <>
          {activeView === 'sales' && <SalesPanel invoices={filteredInvoices} />}
          {activeView === 'payments' && <PaymentsPanel invoices={openInvoices} />}
          {activeView === 'reconcile' && <ReconcilePanel rows={reconcileRows} />}
          {activeView === 'clients' && <ClientsPanel clients={clientExposures} />}
        </>
      )}
    </div>
  );
}

function ModuleActionCard({
  active,
  label,
  detail,
  onOpen
}: {
  active: boolean;
  label: string;
  detail: string;
  onOpen: () => void;
}) {
  return (
    <div className='rounded-lg border p-3'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold'>{label}</p>
          <p className='text-muted-foreground mt-1 text-xs'>{detail}</p>
        </div>
        <Badge className={active ? 'bg-green-600 text-white' : 'bg-zinc-600 text-white'}>
          {active ? 'Ouvert' : 'Planifie'}
        </Badge>
      </div>
      <Button type='button' className='mt-3 w-full' variant={active ? 'default' : 'outline'} onClick={onOpen}>
        Ouvrir
      </Button>
    </div>
  );
}

function SalesPanel({ invoices }: { invoices: AdminInvoice[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Exporter les ventes</CardTitle>
      </CardHeader>
      <CardContent>
        <InvoiceTable invoices={invoices} mode='sales' />
      </CardContent>
    </Card>
  );
}

function PaymentsPanel({ invoices }: { invoices: AdminInvoice[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Controler les paiements</CardTitle>
      </CardHeader>
      <CardContent>
        <InvoiceTable invoices={invoices} mode='payments' />
      </CardContent>
    </Card>
  );
}

function ReconcilePanel({
  rows
}: {
  rows: Array<{
    order: AdminOrder;
    matchedInvoices: AdminInvoice[];
    orderTotal: number;
    invoiceTotal: number;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Rapprocher factures et commandes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='overflow-x-auto rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commande</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Total commande</TableHead>
                <TableHead>Facture(s)</TableHead>
                <TableHead>Ecart</TableHead>
                <TableHead>Controle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const diff = row.invoiceTotal - row.orderTotal;
                return (
                  <TableRow key={row.order.id}>
                    <TableCell className='font-mono text-sm'>{row.order.ref}</TableCell>
                    <TableCell>{getOrderCustomer(row.order)}</TableCell>
                    <TableCell>
                      <PriceDisplay amount={row.orderTotal} />
                    </TableCell>
                    <TableCell>
                      {row.matchedInvoices.length > 0 ? (
                        <div className='space-y-1'>
                          {row.matchedInvoices.map((invoice) => (
                            <p className='font-mono text-xs' key={invoice.id}>
                              {invoice.ref}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <span className='text-muted-foreground text-sm'>Aucune facture liee</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <PriceDisplay amount={diff} />
                    </TableCell>
                    <TableCell>
                      {row.matchedInvoices.length === 0 ? (
                        <Badge className='bg-amber-500 text-white'>A rapprocher</Badge>
                      ) : Math.abs(diff) > 0.01 ? (
                        <Badge className='bg-red-600 text-white'>Ecart</Badge>
                      ) : (
                        <Badge className='bg-green-600 text-white'>OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ClientsPanel({ clients }: { clients: ClientExposure[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Suivre les encours client</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='overflow-x-auto rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Factures</TableHead>
                <TableHead>Verse</TableHead>
                <TableHead>Reste du</TableHead>
                <TableHead>Risque</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.thirdpartyId}>
                  <TableCell>
                    <p className='font-medium'>{client.customer}</p>
                    <p className='text-muted-foreground text-xs'>{client.email || `Tiers #${client.thirdpartyId}`}</p>
                  </TableCell>
                  <TableCell>
                    {client.invoiceCount} facture(s), {client.openInvoiceCount} ouverte(s)
                  </TableCell>
                  <TableCell>
                    <PriceDisplay amount={client.paidAmount} />
                  </TableCell>
                  <TableCell>
                    <PriceDisplay amount={client.remainingDue} className='font-semibold' />
                  </TableCell>
                  <TableCell>
                    {client.overdueInvoiceCount > 0 ? (
                      <Badge className='bg-red-600 text-white'>{client.overdueInvoiceCount} retard(s)</Badge>
                    ) : client.remainingDue > 0 ? (
                      <Badge className='bg-amber-500 text-white'>A suivre</Badge>
                    ) : (
                      <Badge className='bg-green-600 text-white'>Solde</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function InvoiceTable({ invoices, mode }: { invoices: AdminInvoice[]; mode: 'sales' | 'payments' }) {
  if (invoices.length === 0) {
    return <p className='text-muted-foreground text-sm'>Aucune facture dans cette vue.</p>;
  }

  return (
    <div className='overflow-x-auto rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Facture</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Versement</TableHead>
            <TableHead>Reste</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const total = Number(invoice.total_ttc ?? 0);
            const remaining = Number(invoice.remaintopay ?? 0);
            const paid = Math.max(total - remaining, 0);
            return (
              <TableRow key={invoice.id}>
                <TableCell className='font-mono text-sm'>{invoice.ref}</TableCell>
                <TableCell>
                  <p className='font-medium'>{getInvoiceCustomer(invoice)}</p>
                  <p className='text-muted-foreground text-xs'>{invoice.portalUser?.email ?? ''}</p>
                </TableCell>
                <TableCell>
                  <p>{formatInvoiceDate(invoice.date)}</p>
                  <p className='text-muted-foreground text-xs'>
                    Ech. {formatInvoiceDate(invoice.date_lim_reglement)}
                  </p>
                </TableCell>
                <TableCell>
                  <PriceDisplay amount={total} />
                </TableCell>
                <TableCell className='min-w-40'>
                  <PriceDisplay amount={paid} className='font-medium' />
                  <Progress value={getPaymentPercent(invoice)} className='mt-2 h-2' />
                </TableCell>
                <TableCell>
                  <PriceDisplay amount={remaining} className='font-semibold' />
                </TableCell>
                <TableCell>
                  {mode === 'payments' && isInvoiceOverdue(invoice) ? (
                    <Badge className='bg-red-600 text-white'>
                      {getInvoiceDelay(invoice)} jour(s)
                    </Badge>
                  ) : (
                    <Badge variant='outline'>{getInvoiceStatus(invoice)}</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
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
