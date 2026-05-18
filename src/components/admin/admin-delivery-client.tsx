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
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { DolibarrOrder } from '@/lib/dolibarr/types';
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

type AdminOrder = DolibarrOrder & {
  portalWorkflow?: OrderWorkflow | null;
  portalUser: PortalUserSummary | null;
};

interface AdminOrdersResponse {
  orders: AdminOrder[];
}

interface ApiErrorPayload {
  error?: string;
}

type DeliveryView = 'assign' | 'route' | 'confirm' | 'incident';

type OrderAction =
  | {
      action: 'updateWorkflow';
      preparationStatus: PreparationStatus;
      driver?: string;
      deliveryDate?: string;
      deliveryNote?: string;
    }
  | { action: 'close' };

const preparationLabels: Record<PreparationStatus, string> = {
  to_prepare: 'A preparer',
  validated: 'Validee',
  preparing: 'En preparation',
  ready: 'Pret',
  shipped: 'En livraison',
  delivered: 'Livree',
  blocked: 'Incident'
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
  return timestamp > 0 ? format(new Date(timestamp * 1000), 'dd/MM/yyyy') : '-';
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

function getWorkflowDateInputValue(workflow: OrderWorkflow) {
  return workflow.deliveryDate ? workflow.deliveryDate.slice(0, 10) : '';
}

function isDeliveryCandidate(order: AdminOrder) {
  const status = getOrderWorkflow(order).preparationStatus;
  return ['ready', 'shipped', 'blocked', 'delivered'].includes(status) || Number(order.statut) >= 1;
}

function getRouteKey(order: AdminOrder) {
  const workflow = getOrderWorkflow(order);
  return `${workflow.driver || 'Non assigne'}|${getWorkflowDateInputValue(workflow) || 'Sans date'}`;
}

export function AdminDeliveryClient() {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<DeliveryView>('assign');
  const [search, setSearch] = useState('');
  const [driverFilter, setDriverFilter] = useState('all');
  const [editor, setEditor] = useState<{ order: AdminOrder; mode: DeliveryView } | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => fetchJson<AdminOrdersResponse>('/api/admin/orders?limit=300'),
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
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setEditor(null);
      toast.success(variables.payload.action === 'close' ? 'Livraison confirmee' : 'Livraison mise a jour');
    },
    onError: (mutationError) => {
      toast.error(mutationError instanceof Error ? mutationError.message : 'Action impossible');
    }
  });

  const orders = useMemo(() => data?.orders ?? [], [data?.orders]);
  const deliveryOrders = useMemo(() => orders.filter(isDeliveryCandidate), [orders]);
  const drivers = useMemo(
    () =>
      Array.from(
        new Set(
          deliveryOrders
            .map((order) => getOrderWorkflow(order).driver?.trim())
            .filter((driver): driver is string => Boolean(driver))
        )
      ).toSorted(),
    [deliveryOrders]
  );
  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return deliveryOrders.filter((order) => {
      const workflow = getOrderWorkflow(order);
      const haystack = [
        order.ref,
        getOrderCustomer(order),
        order.portalUser?.email,
        order.portalUser?.mobile,
        workflow.driver,
        workflow.deliveryNote
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      const matchesDriver = driverFilter === 'all' || workflow.driver === driverFilter;

      return matchesSearch && matchesDriver;
    });
  }, [deliveryOrders, driverFilter, search]);

  const assignedCount = deliveryOrders.filter((order) => getOrderWorkflow(order).driver).length;
  const shippedCount = deliveryOrders.filter(
    (order) => getOrderWorkflow(order).preparationStatus === 'shipped'
  ).length;
  const deliveredCount = deliveryOrders.filter(
    (order) => getOrderWorkflow(order).preparationStatus === 'delivered'
  ).length;
  const incidentCount = deliveryOrders.filter(
    (order) => getOrderWorkflow(order).preparationStatus === 'blocked'
  ).length;
  const routeGroups = useMemo(() => {
    const groups = new Map<string, AdminOrder[]>();
    for (const order of filteredOrders) {
      const key = getRouteKey(order);
      groups.set(key, [...(groups.get(key) ?? []), order]);
    }
    return Array.from(groups.entries());
  }, [filteredOrders]);

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 border-b pb-5 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <p className='text-muted-foreground text-sm'>Administration</p>
          <h1 className='text-2xl font-semibold tracking-normal md:text-3xl'>
            Livraison et tournees
          </h1>
          <p className='text-muted-foreground mt-2 text-sm'>
            Affecter les commandes, suivre les tournees, confirmer les receptions et declarer les incidents.
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })}
        >
          <Icons.refreshCw className='size-4' />
          Actualiser Dolibarr
        </Button>
      </div>

      <section className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard label='A livrer' value={deliveryOrders.length} detail='Commandes candidates' />
        <MetricCard label='Assignees' value={assignedCount} detail='Livreur renseigne' />
        <MetricCard label='En tournee' value={shippedCount} detail='Statut en livraison' />
        <MetricCard label='Incidents' value={incidentCount} detail='Commandes bloquees' />
      </section>

      <Card>
        <CardHeader className='gap-3'>
          <CardTitle className='text-base'>Fonctions du module</CardTitle>
          <div className='grid gap-2 md:grid-cols-[1fr_220px]'>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Rechercher commande, client, livreur ou note'
            />
            <select
              className='border-input bg-background h-9 rounded-md border px-3 text-sm'
              value={driverFilter}
              onChange={(event) => setDriverFilter(event.target.value)}
            >
              <option value='all'>Tous les livreurs</option>
              {drivers.map((driver) => (
                <option key={driver} value={driver}>
                  {driver}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
          <ModuleActionCard
            active={activeView === 'assign'}
            label='Affecter une commande a un livreur'
            detail={`${deliveryOrders.length - assignedCount} non assignee(s)`}
            onOpen={() => setActiveView('assign')}
          />
          <ModuleActionCard
            active={activeView === 'route'}
            label='Suivre une tournee'
            detail={`${routeGroups.length} tournee(s)`}
            onOpen={() => setActiveView('route')}
          />
          <ModuleActionCard
            active={activeView === 'confirm'}
            label='Confirmer une livraison'
            detail={`${shippedCount} en livraison`}
            onOpen={() => setActiveView('confirm')}
          />
          <ModuleActionCard
            active={activeView === 'incident'}
            label='Declarer un incident'
            detail={`${incidentCount} incident(s) ouvert(s)`}
            onOpen={() => setActiveView('incident')}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className='p-6 text-sm text-muted-foreground'>Chargement des livraisons...</CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className='p-6 text-sm text-red-600'>
            {error instanceof Error ? error.message : 'Impossible de charger les livraisons.'}
          </CardContent>
        </Card>
      ) : activeView === 'route' ? (
        <RoutePanel groups={routeGroups} onEdit={(order, mode) => setEditor({ order, mode })} />
      ) : (
        <DeliveryTable
          orders={filteredOrders}
          view={activeView}
          deliveredCount={deliveredCount}
          onEdit={(order, mode) => setEditor({ order, mode })}
        />
      )}

      <DeliveryActionDialog
        editor={editor}
        isPending={actionMutation.isPending}
        onOpenChange={(open) => !open && setEditor(null)}
        onSubmit={(orderId, payload) => actionMutation.mutate({ orderId, payload })}
      />
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

function DeliveryTable({
  orders,
  view,
  deliveredCount,
  onEdit
}: {
  orders: AdminOrder[];
  view: Exclude<DeliveryView, 'route'>;
  deliveredCount: number;
  onEdit: (order: AdminOrder, mode: DeliveryView) => void;
}) {
  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className='p-6 text-sm text-muted-foreground'>
          Aucune commande dans cette vue.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle className='text-base'>Commandes livraison</CardTitle>
          <div className='min-w-56'>
            <p className='text-muted-foreground mb-1 text-xs'>Livraisons confirmees</p>
            <Progress value={orders.length > 0 ? (deliveredCount / orders.length) * 100 : 0} className='h-2' />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className='overflow-x-auto rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commande</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Livreur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const workflow = getOrderWorkflow(order);
                return (
                  <TableRow key={order.id} className='align-top'>
                    <TableCell className='min-w-40'>
                      <p className='font-mono text-sm font-semibold'>{order.ref}</p>
                      <p className='text-muted-foreground text-xs'>{getOrderDate(order)}</p>
                    </TableCell>
                    <TableCell className='min-w-56'>
                      <p className='font-medium'>{getOrderCustomer(order)}</p>
                      <p className='text-muted-foreground text-xs'>
                        {order.portalUser?.mobile ?? order.portalUser?.phone ?? order.portalUser?.email ?? ''}
                      </p>
                    </TableCell>
                    <TableCell className='min-w-28'>
                      <PriceDisplay amount={Number(order.total_ttc ?? 0)} />
                    </TableCell>
                    <TableCell className='min-w-44'>
                      <p>{workflow.driver || 'Non assigne'}</p>
                      <p className='text-muted-foreground text-xs'>
                        {getWorkflowDateInputValue(workflow) || 'Date a definir'}
                      </p>
                    </TableCell>
                    <TableCell className='min-w-36'>
                      <DeliveryStatusBadge status={workflow.preparationStatus} />
                    </TableCell>
                    <TableCell className='min-w-56'>
                      <p className='text-muted-foreground line-clamp-2 text-xs'>
                        {workflow.deliveryNote || 'Aucune note'}
                      </p>
                    </TableCell>
                    <TableCell className='min-w-44'>
                      <Button type='button' size='sm' variant='outline' onClick={() => onEdit(order, view)}>
                        {view === 'assign' && 'Affecter'}
                        {view === 'confirm' && 'Confirmer'}
                        {view === 'incident' && 'Incident'}
                      </Button>
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

function RoutePanel({
  groups,
  onEdit
}: {
  groups: Array<[string, AdminOrder[]]>;
  onEdit: (order: AdminOrder, mode: DeliveryView) => void;
}) {
  return (
    <div className='grid gap-3 xl:grid-cols-2'>
      {groups.map(([key, orders]) => {
        const [driver, date] = key.split('|');
        const delivered = orders.filter(
          (order) => getOrderWorkflow(order).preparationStatus === 'delivered'
        ).length;
        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className='text-base'>
                {driver} · {date}
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <Progress value={(delivered / orders.length) * 100} className='h-2' />
              {orders.map((order) => {
                const workflow = getOrderWorkflow(order);
                return (
                  <div
                    className='grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_auto] sm:items-center'
                    key={order.id}
                  >
                    <div className='min-w-0'>
                      <p className='font-mono text-sm font-semibold'>{order.ref}</p>
                      <p className='truncate text-sm'>{getOrderCustomer(order)}</p>
                      <p className='text-muted-foreground text-xs'>{workflow.deliveryNote || 'Aucune note'}</p>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <DeliveryStatusBadge status={workflow.preparationStatus} />
                      <Button type='button' size='sm' variant='outline' onClick={() => onEdit(order, 'confirm')}>
                        Confirmer
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DeliveryActionDialog({
  editor,
  isPending,
  onOpenChange,
  onSubmit
}: {
  editor: { order: AdminOrder; mode: DeliveryView } | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (orderId: string, payload: OrderAction) => void;
}) {
  const [driver, setDriver] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');

  useEffect(() => {
    if (!editor) return;
    const workflow = getOrderWorkflow(editor.order);
    setDriver(workflow.driver ?? '');
    setDeliveryDate(getWorkflowDateInputValue(workflow));
    setDeliveryNote(workflow.deliveryNote ?? '');
  }, [editor]);

  if (!editor) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }

  const workflow = getOrderWorkflow(editor.order);
  const titleByMode: Record<DeliveryView, string> = {
    assign: 'Affecter a un livreur',
    route: 'Suivre une tournee',
    confirm: 'Confirmer la livraison',
    incident: 'Declarer un incident'
  };

  return (
    <Dialog open={Boolean(editor)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titleByMode[editor.mode]}</DialogTitle>
          <DialogDescription>
            Commande {editor.order.ref} - {getOrderCustomer(editor.order)}
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-3'>
          <label className='block text-sm font-medium' htmlFor='delivery-driver'>
            Livreur ou transporteur
            <Input
              id='delivery-driver'
              className='mt-1'
              value={driver}
              onChange={(event) => setDriver(event.target.value)}
              placeholder='Nom du livreur'
            />
          </label>
          <label className='block text-sm font-medium' htmlFor='delivery-date'>
            Date de livraison
            <Input
              id='delivery-date'
              className='mt-1'
              type='date'
              value={deliveryDate}
              onChange={(event) => setDeliveryDate(event.target.value)}
            />
          </label>
          <label className='block text-sm font-medium' htmlFor='delivery-note'>
            Note livreur
            <Textarea
              id='delivery-note'
              className='mt-1 min-h-24'
              value={deliveryNote}
              onChange={(event) => setDeliveryNote(event.target.value)}
              placeholder='Tournee, consigne, preuve, incident...'
            />
          </label>
        </div>
        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          {editor.mode === 'confirm' ? (
            <Button type='button' isLoading={isPending} onClick={() => onSubmit(editor.order.id, { action: 'close' })}>
              Confirmer livree
            </Button>
          ) : (
            <Button
              type='button'
              isLoading={isPending}
              onClick={() =>
                onSubmit(editor.order.id, {
                  action: 'updateWorkflow',
                  preparationStatus:
                    editor.mode === 'incident'
                      ? 'blocked'
                      : editor.mode === 'assign'
                        ? 'ready'
                        : workflow.preparationStatus,
                  driver: driver.trim(),
                  deliveryDate,
                  deliveryNote: deliveryNote.trim()
                })
              }
            >
              Enregistrer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryStatusBadge({ status }: { status: PreparationStatus }) {
  const className =
    status === 'delivered'
      ? 'bg-green-600 text-white'
      : status === 'blocked'
        ? 'bg-red-600 text-white'
        : status === 'shipped'
          ? 'bg-blue-600 text-white'
          : status === 'ready'
            ? 'bg-amber-500 text-white'
            : 'bg-zinc-600 text-white';

  return <Badge className={className}>{preparationLabels[status]}</Badge>;
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
