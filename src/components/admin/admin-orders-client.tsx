'use client';

import { Icons } from '@/components/icons';
import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { DolibarrOrder, DolibarrOrderLine } from '@/lib/dolibarr/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

interface PortalUserSummary {
  email: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  mobile: string | null;
  thirdpartyId: number;
}

type AdminOrder = DolibarrOrder & {
  accountingSummary: {
    invoiceCount: number;
    openInvoiceCount: number;
    overdueInvoiceCount: number;
    totalInvoiced: number;
    totalPaid: number;
    remainingDue: number;
  } | null;
  portalUser: PortalUserSummary | null;
};

interface AdminOrdersResponse {
  orders: AdminOrder[];
}

interface ApiErrorPayload {
  error?: string;
}

type OrderAction =
  | { action: 'validate' }
  | { action: 'invoice' }
  | { action: 'close' }
  | { action: 'draft' }
  | { action: 'markInvoiced' }
  | { action: 'deleteOrder' }
  | { action: 'addLine'; productId: string; qty: number; priceHt: number }
  | { action: 'updateLine'; lineId: string; productId?: string; qty: number; priceHt: number }
  | { action: 'deleteLine'; lineId: string }
  | {
      action: 'updateWorkflow';
      preparationStatus: PreparationStatus;
      driver?: string;
      deliveryDate?: string;
      deliveryNote?: string;
    };

type PreparationStatus =
  | 'to_prepare'
  | 'validated'
  | 'preparing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'blocked';

interface OrderWorkflow {
  preparationStatus: PreparationStatus;
  driver?: string | null;
  deliveryDate?: string | null;
  deliveryNote?: string | null;
  customerMessage?: string | null;
  customerNotifiedAt?: string | null;
}

interface PreparationLineSummary {
  key: string;
  ref: string;
  label: string;
  qty: number;
  orderCount: number;
}

const preparationLabels: Record<PreparationStatus, string> = {
  to_prepare: 'A preparer',
  validated: 'Validee',
  preparing: 'En preparation',
  ready: 'Pret',
  shipped: 'En livraison',
  delivered: 'Livree',
  blocked: 'Bloque'
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => null)) as ApiErrorPayload | T | null;

  if (!response.ok) {
    throw new Error((payload as ApiErrorPayload | null)?.error ?? 'Erreur API');
  }

  return payload as T;
}

function getOrderCustomer(order: AdminOrder) {
  return (
    order.portalUser?.companyName ??
    order.portalUser?.name ??
    order.portalUser?.email ??
    `Tiers #${order.socid ?? order.fk_soc ?? '-'}`
  );
}

function getOrderDate(order: AdminOrder) {
  const timestamp = Number(order.date_commande ?? 0);
  return timestamp > 0 ? format(new Date(timestamp * 1000), 'dd/MM/yyyy HH:mm') : '-';
}

function isBilled(order: AdminOrder) {
  return Number(order.billed ?? 0) === 1;
}

function canEditLines(order: AdminOrder) {
  return Number(order.statut) <= 0 && !isBilled(order);
}

function getDefaultWorkflow(): OrderWorkflow {
  return {
    preparationStatus: 'to_prepare',
    driver: '',
    deliveryDate: '',
    deliveryNote: ''
  };
}

function getOrderWorkflow(order: AdminOrder): OrderWorkflow {
  return {
    ...getDefaultWorkflow(),
    ...order.portalWorkflow,
    preparationStatus: (order.portalWorkflow?.preparationStatus ?? 'to_prepare') as PreparationStatus
  };
}

function getPaymentRisk(order: AdminOrder) {
  const summary = order.accountingSummary;
  if (!summary || summary.invoiceCount === 0) return 'none';
  if (summary.overdueInvoiceCount > 0) return 'overdue';
  if (summary.remainingDue > 0) return 'open';
  return 'paid';
}

function getWorkflowDateInputValue(workflow: OrderWorkflow) {
  return workflow.deliveryDate ? workflow.deliveryDate.slice(0, 10) : '';
}

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function exportOrdersCsv(orders: AdminOrder[], workflows: Record<string, OrderWorkflow>) {
  const headers = [
    'Reference',
    'Date',
    'Client',
    'Email',
    'Telephone',
    'Statut Dolibarr',
    'Facturee',
    'Preparation',
    'Livreur',
    'Date livraison',
    'Note livraison',
    'Total HT',
    'Total TTC',
    'Produits'
  ];
  const rows = orders.map((order) => {
    const workflow = workflows[order.id] ?? getOrderWorkflow(order);
    return [
      order.ref,
      getOrderDate(order),
      getOrderCustomer(order),
      order.portalUser?.email ?? '',
      order.portalUser?.mobile ?? order.portalUser?.phone ?? '',
      String(order.statut),
      isBilled(order) ? 'Oui' : 'Non',
      preparationLabels[workflow.preparationStatus],
      workflow.driver,
      workflow.deliveryDate,
      workflow.deliveryNote,
      Number(order.total_ht ?? 0).toFixed(2),
      Number(order.total_ttc ?? 0).toFixed(2),
      (order.lines ?? [])
        .map((line) => `${line.qty} x ${line.product_ref} ${line.product_label}`)
        .join(' | ')
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `commandes-admin-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function getPreparationSummary(orders: AdminOrder[]): PreparationLineSummary[] {
  const summary = new Map<string, PreparationLineSummary>();

  for (const order of orders) {
    for (const line of order.lines ?? []) {
      const key = line.fk_product || line.product_ref || line.product_label;
      const current = summary.get(key) ?? {
        key,
        ref: line.product_ref,
        label: line.product_label,
        qty: 0,
        orderCount: 0
      };
      current.qty += Number(line.qty ?? 0);
      current.orderCount += 1;
      summary.set(key, current);
    }
  }

  return Array.from(summary.values()).toSorted((a, b) => b.qty - a.qty);
}

export function AdminOrdersClient() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [preparationFilter, setPreparationFilter] = useState('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [lineEditor, setLineEditor] = useState<{
    order: AdminOrder;
    line?: DolibarrOrderLine;
  } | null>(null);
  const [deliveryEditor, setDeliveryEditor] = useState<AdminOrder | null>(null);
  const [bulkEditorOpen, setBulkEditorOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => fetchJson<AdminOrdersResponse>('/api/admin/orders?limit=100'),
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const actionMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: OrderAction }) =>
      fetchJson(`/api/admin/orders/${orderId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setLineEditor(null);
      setDeliveryEditor(null);
      toast.success('Commande mise a jour');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Action impossible');
    }
  });

  const bulkWorkflowMutation = useMutation({
    mutationFn: async ({
      orderIds,
      workflow
    }: {
      orderIds: string[];
      workflow: OrderWorkflow;
    }) => {
      await Promise.all(
        orderIds.map((orderId) =>
          fetchJson(`/api/admin/orders/${orderId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'updateWorkflow',
              preparationStatus: workflow.preparationStatus,
              driver: workflow.driver ?? '',
              deliveryDate: getWorkflowDateInputValue(workflow),
              deliveryNote: workflow.deliveryNote ?? ''
            })
          })
        )
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedOrderIds(new Set());
      setBulkEditorOpen(false);
      toast.success(`${variables.orderIds.length} commande(s) mise(s) a jour`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Mise a jour groupee impossible');
    }
  });

  const orders = useMemo(() => data?.orders ?? [], [data?.orders]);
  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        status === 'all' ||
        (status === 'billed' && isBilled(order)) ||
        (status !== 'billed' && String(order.statut) === status);
      const matchesPreparation =
        preparationFilter === 'all' ||
        getOrderWorkflow(order).preparationStatus === preparationFilter;
      const haystack = [
        order.ref,
        order.id,
        getOrderCustomer(order),
        order.portalUser?.email,
        (order.lines ?? []).map((line) => `${line.product_ref} ${line.product_label}`).join(' ')
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        matchesStatus &&
        matchesPreparation &&
        (!normalizedSearch || haystack.includes(normalizedSearch))
      );
    });
  }, [orders, preparationFilter, search, status]);

  const selectedOrders = useMemo(
    () => filteredOrders.filter((order) => selectedOrderIds.has(order.id)),
    [filteredOrders, selectedOrderIds]
  );
  const preparationSummary = useMemo(
    () => getPreparationSummary(selectedOrders.length > 0 ? selectedOrders : filteredOrders),
    [filteredOrders, selectedOrders]
  );
  const allVisibleSelected =
    filteredOrders.length > 0 && filteredOrders.every((order) => selectedOrderIds.has(order.id));

  const draftCount = orders.filter((order) => Number(order.statut) === 0).length;
  const validatedCount = orders.filter((order) => Number(order.statut) === 1).length;
  const billedCount = orders.filter(isBilled).length;
  const readyCount = orders.filter(
    (order) => getOrderWorkflow(order).preparationStatus === 'ready'
  ).length;

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 border-b pb-5 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <p className='text-muted-foreground text-sm'>Administration</p>
          <h1 className='text-2xl font-semibold tracking-normal md:text-3xl'>
            Commandes clients
          </h1>
          <p className='text-muted-foreground mt-2 text-sm'>
            Voir qui a commande, les produits, les dates, valider, facturer et corriger les lignes.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => exportOrdersCsv(filteredOrders, {})}
            disabled={filteredOrders.length === 0}
          >
            <Icons.upload className='size-4' />
            Export CSV
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })}
          >
            <Icons.refreshCw className='size-4' />
            Actualiser Dolibarr
          </Button>
          <Button
            type='button'
            disabled={selectedOrders.length === 0}
            onClick={() => setBulkEditorOpen(true)}
          >
            <Icons.checks className='size-4' />
            Action groupee
          </Button>
        </div>
      </div>

      <section className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard label='A preparer' value={draftCount} detail='Commandes brouillon Dolibarr' />
        <MetricCard label='Validees' value={validatedCount} detail='Pretes a facturer' />
        <MetricCard label='Pretes livraison' value={readyCount} detail='Statut preparation admin' />
        <MetricCard label='Facturees' value={billedCount} detail='Commande classee facturee' />
      </section>

      <section className='grid gap-3 md:grid-cols-4'>
        <WorkflowCard
          title='Suivi Dolibarr'
          description='Liste globale actualisee depuis /orders.'
          status='Connecte'
        />
        <WorkflowCard
          title='Preparation'
          description='Statut interne par commande.'
          status='Connecte'
        />
        <WorkflowCard
          title='Livraison'
          description='Livreur, date et note affectes.'
          status='Connecte'
        />
        <WorkflowCard
          title='Export'
          description='CSV des commandes filtrees.'
          status='Connecte'
        />
      </section>

      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>
            Preparation produits {selectedOrders.length > 0 ? `(${selectedOrders.length} selectionnee(s))` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {preparationSummary.length === 0 ? (
            <p className='text-muted-foreground text-sm'>Aucune ligne produit a preparer.</p>
          ) : (
            <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-3'>
              {preparationSummary.slice(0, 6).map((line) => (
                <div
                  key={line.key}
                  className='flex items-start justify-between gap-3 rounded-md border p-3'
                >
                  <div className='min-w-0'>
                    <p className='text-muted-foreground font-mono text-xs'>{line.ref || '-'}</p>
                    <p className='truncate text-sm font-medium'>{line.label}</p>
                    <p className='text-muted-foreground text-xs'>{line.orderCount} ligne(s)</p>
                  </div>
                  <Badge variant='outline'>x{line.qty}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='gap-3'>
          <CardTitle className='text-base'>File commandes</CardTitle>
          <div className='grid gap-2 md:grid-cols-[1fr_220px_220px]'>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Rechercher client, reference, email ou produit'
            />
            <select
              className='border-input bg-background h-9 rounded-md border px-3 text-sm'
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value='all'>Tous les statuts</option>
              <option value='0'>Brouillon</option>
              <option value='1'>Validee</option>
              <option value='2'>Expediee</option>
              <option value='3'>Livree</option>
              <option value='billed'>Facturee</option>
              <option value='-1'>Annulee</option>
            </select>
            <select
              className='border-input bg-background h-9 rounded-md border px-3 text-sm'
              value={preparationFilter}
              onChange={(event) => setPreparationFilter(event.target.value)}
            >
              <option value='all'>Toutes preparations</option>
              {Object.entries(preparationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className='text-muted-foreground text-sm'>Chargement des commandes...</p>
          ) : isError ? (
            <p className='text-sm text-red-600'>Impossible de charger les commandes admin.</p>
          ) : filteredOrders.length === 0 ? (
            <p className='text-muted-foreground text-sm'>Aucune commande trouvee.</p>
          ) : (
            <div className='overflow-x-auto rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-10'>
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(checked) => {
                          setSelectedOrderIds((current) => {
                            const next = new Set(current);
                            if (checked) {
                              filteredOrders.forEach((order) => next.add(order.id));
                            } else {
                              filteredOrders.forEach((order) => next.delete(order.id));
                            }
                            return next;
                          });
                        }}
                        aria-label='Selectionner les commandes visibles'
                      />
                    </TableHead>
                    <TableHead>Commande</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Produits</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Preparation</TableHead>
                    <TableHead>Livraison</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className='align-top'>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrderIds.has(order.id)}
                          onCheckedChange={(checked) => {
                            setSelectedOrderIds((current) => {
                              const next = new Set(current);
                              if (checked) {
                                next.add(order.id);
                              } else {
                                next.delete(order.id);
                              }
                              return next;
                            });
                          }}
                          aria-label={`Selectionner ${order.ref}`}
                        />
                      </TableCell>
                      <TableCell className='min-w-40'>
                        <button
                          type='button'
                          className='font-mono text-sm font-semibold hover:text-blue-700'
                          onClick={() => setSelectedOrder(order)}
                        >
                          {order.ref}
                        </button>
                        <p className='text-muted-foreground mt-1 text-xs'>{getOrderDate(order)}</p>
                      </TableCell>
                      <TableCell className='min-w-56'>
                        <p className='font-medium'>{getOrderCustomer(order)}</p>
                        <p className='text-muted-foreground text-xs'>
                          {order.portalUser?.email ?? `thirdparty ${order.socid ?? order.fk_soc}`}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {order.portalUser?.mobile ?? order.portalUser?.phone ?? ''}
                        </p>
                      </TableCell>
                      <TableCell className='min-w-72'>
                        <div className='space-y-1'>
                          {(order.lines ?? []).slice(0, 3).map((line) => (
                            <div
                              className='grid grid-cols-[42px_1fr_auto] gap-2 text-xs'
                              key={line.id}
                            >
                              <span className='font-medium'>x{line.qty}</span>
                              <span className='truncate'>{line.product_label}</span>
                              <button
                                type='button'
                                className='text-blue-700 hover:underline disabled:text-muted-foreground'
                                disabled={!canEditLines(order)}
                                onClick={() => setLineEditor({ order, line })}
                              >
                                Modifier
                              </button>
                            </div>
                          ))}
                          {(order.lines ?? []).length > 3 && (
                            <p className='text-muted-foreground text-xs'>
                              +{(order.lines ?? []).length - 3} ligne(s)
                            </p>
                          )}
                          {(order.lines ?? []).length === 0 && (
                            <p className='text-muted-foreground text-xs'>
                              Detail produits non fourni par la liste Dolibarr.
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className='min-w-28'>
                        <PriceDisplay amount={Number(order.total_ttc)} className='font-semibold' />
                        <p className='text-muted-foreground text-xs'>TTC</p>
                      </TableCell>
                      <TableCell className='min-w-48'>
                        <PaymentSummaryCell order={order} />
                      </TableCell>
                      <TableCell className='min-w-36'>
                        <div className='flex flex-wrap gap-2'>
                          <StatusBadge type='order' status={order.statut} />
                          {isBilled(order) && <Badge className='bg-green-700 text-white'>Facturee</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className='min-w-44'>
                        <select
                          className='border-input bg-background h-8 w-full rounded-md border px-2 text-xs'
                          value={getOrderWorkflow(order).preparationStatus}
                          disabled={actionMutation.isPending}
                          onChange={(event) => {
                            const workflow = getOrderWorkflow(order);
                            actionMutation.mutate({
                              orderId: order.id,
                              payload: {
                                action: 'updateWorkflow',
                                driver: workflow.driver ?? '',
                                deliveryDate: getWorkflowDateInputValue(getOrderWorkflow(order)),
                                deliveryNote: workflow.deliveryNote ?? '',
                                preparationStatus: event.target.value as PreparationStatus
                              }
                            });
                          }}
                        >
                          {Object.entries(preparationLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className='min-w-48'>
                        <button
                          type='button'
                          className='text-left text-sm hover:text-blue-700'
                          onClick={() => setDeliveryEditor(order)}
                        >
                          {getOrderWorkflow(order).driver || 'Assigner'}
                        </button>
                        <p className='text-muted-foreground text-xs'>
                          {getWorkflowDateInputValue(getOrderWorkflow(order)) || 'Date a definir'}
                        </p>
                      </TableCell>
                      <TableCell className='min-w-72'>
                        <div className='flex flex-wrap gap-2'>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            disabled={Number(order.statut) !== 0 || actionMutation.isPending}
                            onClick={() =>
                              actionMutation.mutate({
                                orderId: order.id,
                                payload: { action: 'validate' }
                              })
                            }
                          >
                            Valider
                          </Button>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            disabled={Number(order.statut) < 1 || isBilled(order) || actionMutation.isPending}
                            onClick={() =>
                              actionMutation.mutate({
                                orderId: order.id,
                                payload: { action: 'invoice' }
                              })
                            }
                          >
                            Facturer
                          </Button>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            disabled={Number(order.statut) <= 0 || isBilled(order) || actionMutation.isPending}
                            onClick={() =>
                              actionMutation.mutate({
                                orderId: order.id,
                                payload: { action: 'draft' }
                              })
                            }
                          >
                            Brouillon
                          </Button>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            disabled={Number(order.statut) < 1 || actionMutation.isPending}
                            onClick={() =>
                              actionMutation.mutate({
                                orderId: order.id,
                                payload: { action: 'close' }
                              })
                            }
                          >
                            Livree
                          </Button>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            disabled={!canEditLines(order)}
                            onClick={() => setLineEditor({ order })}
                          >
                            Produit
                          </Button>
                          <Button
                            type='button'
                            size='sm'
                            variant='destructive'
                            disabled={Number(order.statut) > 0 || actionMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Supprimer la commande ${order.ref} ?`)) {
                                actionMutation.mutate({
                                  orderId: order.id,
                                  payload: { action: 'deleteOrder' }
                                });
                              }
                            }}
                          >
                            Annuler
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

      <OrderDetailDialog order={selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)} />
      <DeliveryDialog
        order={deliveryEditor}
        workflow={deliveryEditor ? getOrderWorkflow(deliveryEditor) : getDefaultWorkflow()}
        onOpenChange={(open) => !open && setDeliveryEditor(null)}
        onSave={(orderId, workflow) => {
          actionMutation.mutate({
            orderId,
            payload: {
              action: 'updateWorkflow',
              preparationStatus: workflow.preparationStatus,
              driver: workflow.driver ?? '',
              deliveryDate: getWorkflowDateInputValue(workflow),
              deliveryNote: workflow.deliveryNote ?? ''
            }
          });
        }}
      />
      <LineEditorDialog
        editor={lineEditor}
        isPending={actionMutation.isPending}
        onOpenChange={(open) => !open && setLineEditor(null)}
        onSubmit={(order, payload) =>
          actionMutation.mutate({
            orderId: order.id,
            payload
          })
        }
      />
      <BulkWorkflowDialog
        open={bulkEditorOpen}
        count={selectedOrders.length}
        isPending={bulkWorkflowMutation.isPending}
        onOpenChange={setBulkEditorOpen}
        onSubmit={(workflow) =>
          bulkWorkflowMutation.mutate({
            orderIds: selectedOrders.map((order) => order.id),
            workflow
          })
        }
      />
    </div>
  );
}

function WorkflowCard({
  title,
  description,
  status
}: {
  title: string;
  description: string;
  status: string;
}) {
  return (
    <Card>
      <CardContent className='p-4'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <p className='text-sm font-semibold'>{title}</p>
            <p className='text-muted-foreground mt-1 text-xs'>{description}</p>
          </div>
          <Badge className='bg-green-600 text-white'>{status}</Badge>
        </div>
      </CardContent>
    </Card>
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

function PaymentSummaryCell({ order }: { order: AdminOrder }) {
  const summary = order.accountingSummary;
  const risk = getPaymentRisk(order);

  if (!summary || summary.invoiceCount === 0) {
    return (
      <div className='space-y-1'>
        <Badge variant='outline'>Non facture</Badge>
        <p className='text-muted-foreground text-xs'>Aucun versement detecte</p>
      </div>
    );
  }

  return (
    <div className='space-y-1'>
      <div className='flex flex-wrap gap-1'>
        {risk === 'paid' && <Badge className='bg-green-600 text-white'>Solde</Badge>}
        {risk === 'open' && <Badge className='bg-amber-500 text-white'>Partiel</Badge>}
        {risk === 'overdue' && <Badge className='bg-red-600 text-white'>Retard</Badge>}
      </div>
      <p className='text-xs'>
        Verse <PriceDisplay amount={summary.totalPaid} className='font-medium' />
      </p>
      <p className='text-muted-foreground text-xs'>
        Reste <PriceDisplay amount={summary.remainingDue} /> sur{' '}
        <PriceDisplay amount={summary.totalInvoiced} />
      </p>
      {summary.openInvoiceCount > 0 && (
        <p className='text-muted-foreground text-xs'>
          {summary.openInvoiceCount} facture(s) ouverte(s)
        </p>
      )}
    </div>
  );
}

function OrderDetailDialog({
  order,
  onOpenChange
}: {
  order: AdminOrder | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[88vh] overflow-y-auto sm:max-w-4xl'>
        {order && (
          <>
            <DialogHeader>
              <DialogTitle>Commande {order.ref}</DialogTitle>
              <DialogDescription>
                {getOrderCustomer(order)} - {getOrderDate(order)}
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-3 md:grid-cols-3'>
              <InfoBlock label='Client' value={getOrderCustomer(order)} />
              <InfoBlock label='Email' value={order.portalUser?.email ?? '-'} />
              <InfoBlock label='Telephone' value={order.portalUser?.mobile ?? order.portalUser?.phone ?? '-'} />
            </div>
            <div className='overflow-x-auto rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Qte</TableHead>
                    <TableHead>PU HT</TableHead>
                    <TableHead>Total TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(order.lines ?? []).map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className='font-mono'>{line.product_ref}</TableCell>
                      <TableCell>{line.product_label}</TableCell>
                      <TableCell>{line.qty}</TableCell>
                      <TableCell>
                        <PriceDisplay amount={Number(line.subprice)} />
                      </TableCell>
                      <TableCell>
                        <PriceDisplay amount={Number(line.total_ttc)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-md border bg-muted/30 p-3'>
      <p className='text-muted-foreground text-xs'>{label}</p>
      <p className='mt-1 truncate text-sm font-medium'>{value}</p>
    </div>
  );
}

function DeliveryDialog({
  order,
  workflow,
  onOpenChange,
  onSave
}: {
  order: AdminOrder | null;
  workflow: OrderWorkflow;
  onOpenChange: (open: boolean) => void;
  onSave: (orderId: string, workflow: OrderWorkflow) => void;
}) {
  const [driver, setDriver] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');

  useEffect(() => {
    setDriver(workflow.driver ?? '');
    setDeliveryDate(getWorkflowDateInputValue(workflow));
    setDeliveryNote(workflow.deliveryNote ?? '');
  }, [workflow, order]);

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent>
        {order && (
          <>
            <DialogHeader>
              <DialogTitle>Assigner une livraison</DialogTitle>
              <DialogDescription>
                Commande {order.ref} - {getOrderCustomer(order)}
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-3'>
              <label className='block text-sm font-medium' htmlFor='admin-delivery-driver'>
                Livreur ou transporteur
                <Input
                  id='admin-delivery-driver'
                  className='mt-1'
                  value={driver}
                  onChange={(event) => setDriver(event.target.value)}
                  placeholder='Nom du livreur'
                />
              </label>
              <label className='block text-sm font-medium' htmlFor='admin-delivery-date'>
                Date de livraison
                <Input
                  id='admin-delivery-date'
                  className='mt-1'
                  type='date'
                  value={deliveryDate}
                  onChange={(event) => setDeliveryDate(event.target.value)}
                />
              </label>
              <label className='block text-sm font-medium' htmlFor='admin-delivery-note'>
                Note livraison
                <Input
                  id='admin-delivery-note'
                  className='mt-1'
                  value={deliveryNote}
                  onChange={(event) => setDeliveryNote(event.target.value)}
                  placeholder='Tournee, consigne, incident...'
                />
              </label>
            </div>
            <DialogFooter>
              <Button
                type='button'
                onClick={() =>
                  onSave(order.id, {
                    ...workflow,
                    driver: driver.trim(),
                    deliveryDate,
                    deliveryNote: deliveryNote.trim()
                  })
                }
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BulkWorkflowDialog({
  open,
  count,
  isPending,
  onOpenChange,
  onSubmit
}: {
  open: boolean;
  count: number;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (workflow: OrderWorkflow) => void;
}) {
  const [preparationStatus, setPreparationStatus] = useState<PreparationStatus>('preparing');
  const [driver, setDriver] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setPreparationStatus('preparing');
    setDriver('');
    setDeliveryDate('');
    setDeliveryNote('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Action groupee preparation</DialogTitle>
          <DialogDescription>
            Mettre a jour le statut et la livraison de {count} commande(s) selectionnee(s).
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-3'>
          <label className='block text-sm font-medium' htmlFor='admin-bulk-preparation-status'>
            Statut preparation
            <select
              id='admin-bulk-preparation-status'
              className='border-input bg-background mt-1 h-9 w-full rounded-md border px-3 text-sm'
              value={preparationStatus}
              onChange={(event) => setPreparationStatus(event.target.value as PreparationStatus)}
            >
              {Object.entries(preparationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className='block text-sm font-medium' htmlFor='admin-bulk-driver'>
            Livreur ou transporteur
            <Input
              id='admin-bulk-driver'
              className='mt-1'
              value={driver}
              onChange={(event) => setDriver(event.target.value)}
              placeholder='Nom du livreur'
            />
          </label>
          <label className='block text-sm font-medium' htmlFor='admin-bulk-delivery-date'>
            Date de livraison
            <Input
              id='admin-bulk-delivery-date'
              className='mt-1'
              type='date'
              value={deliveryDate}
              onChange={(event) => setDeliveryDate(event.target.value)}
            />
          </label>
          <label className='block text-sm font-medium' htmlFor='admin-bulk-delivery-note'>
            Note livraison
            <Input
              id='admin-bulk-delivery-note'
              className='mt-1'
              value={deliveryNote}
              onChange={(event) => setDeliveryNote(event.target.value)}
              placeholder='Tournee, consigne, incident...'
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
            disabled={count === 0}
            onClick={() =>
              onSubmit({
                preparationStatus,
                driver: driver.trim(),
                deliveryDate,
                deliveryNote: deliveryNote.trim()
              })
            }
          >
            Appliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LineEditorDialog({
  editor,
  isPending,
  onOpenChange,
  onSubmit
}: {
  editor: { order: AdminOrder; line?: DolibarrOrderLine } | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (order: AdminOrder, payload: OrderAction) => void;
}) {
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [priceHt, setPriceHt] = useState('0');

  const line = editor?.line;
  const order = editor?.order;

  useEffect(() => {
    setProductId(line?.fk_product ? String(line.fk_product) : '');
    setQty(line?.qty ? String(line.qty) : '1');
    setPriceHt(line?.subprice ? String(line.subprice) : '0');
  }, [line, editor]);

  return (
    <Dialog open={Boolean(editor)} onOpenChange={onOpenChange}>
      <DialogContent>
        {order && (
          <>
            <DialogHeader>
              <DialogTitle>{line ? 'Modifier la ligne' : 'Ajouter un produit'}</DialogTitle>
              <DialogDescription>
                Commande {order.ref}. Les lignes sont modifiables avant validation/facturation.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-3'>
              <label className='block text-sm font-medium' htmlFor='admin-order-product-id'>
                ID produit Dolibarr
                <Input
                  id='admin-order-product-id'
                  className='mt-1'
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  placeholder='Ex: 42'
                />
              </label>
              <div className='grid gap-3 sm:grid-cols-2'>
                <label className='block text-sm font-medium' htmlFor='admin-order-qty'>
                  Quantite
                  <Input
                    id='admin-order-qty'
                    className='mt-1'
                    type='number'
                    min='0.01'
                    step='0.01'
                    value={qty}
                    onChange={(event) => setQty(event.target.value)}
                  />
                </label>
                <label className='block text-sm font-medium' htmlFor='admin-order-price-ht'>
                  Prix HT
                  <Input
                    id='admin-order-price-ht'
                    className='mt-1'
                    type='number'
                    min='0'
                    step='0.01'
                    value={priceHt}
                    onChange={(event) => setPriceHt(event.target.value)}
                  />
                </label>
              </div>
            </div>
            <DialogFooter>
              {line && (
                <Button
                  type='button'
                  variant='destructive'
                  disabled={isPending}
                  onClick={() => onSubmit(order, { action: 'deleteLine', lineId: line.id })}
                >
                  Supprimer ligne
                </Button>
              )}
              <Button
                type='button'
                disabled={isPending || !productId.trim()}
                onClick={() =>
                  onSubmit(
                    order,
                    line
                      ? {
                          action: 'updateLine',
                          lineId: line.id,
                          productId: productId.trim(),
                          qty: Number(qty),
                          priceHt: Number(priceHt)
                        }
                      : {
                          action: 'addLine',
                          productId: productId.trim(),
                          qty: Number(qty),
                          priceHt: Number(priceHt)
                        }
                  )
                }
              >
                {line ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
