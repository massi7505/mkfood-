'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { OrderTracking } from '@/components/orders/order-tracking';
import { PageHeader } from '@/components/shared/PageHeader';
import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useOrders } from '@/hooks/useOrders';
import { formatExpectedDeliveryDate } from '@/lib/orders/format';
import { format } from 'date-fns';
import { Package } from 'lucide-react';
import Link from 'next/link';

export function OrdersClient() {
  const { orders, isLoading } = useOrders();

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Mes commandes'
        description='Suivi des commandes creees dans Dolibarr.'
        actions={
          <Button asChild className='bg-blue-600 hover:bg-blue-700'>
            <Link href='/store'>Nouvelle commande</Link>
          </Button>
        }
      />

      {!isLoading && orders.length === 0 && (
        <EmptyState
          icon={Package}
          title='Aucune commande'
          description='Vos commandes apparaitront ici apres validation.'
          action={{ label: 'Commander', href: '/store' }}
        />
      )}

      {orders.length > 0 && (
        <>
          <div className='space-y-3 md:hidden'>
            {orders.map((order) => (
              <div className='rounded-lg border bg-card p-3' key={order.id}>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='truncate font-mono text-sm font-semibold'>{order.ref}</p>
                    <p className='text-muted-foreground text-xs'>
                      {format(new Date(order.date_commande * 1000), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <StatusBadge type='order' status={order.statut} />
                </div>
                <div className='mt-3 grid grid-cols-2 gap-2 text-sm'>
                  <div className='rounded-md bg-muted/50 p-2'>
                    <p className='text-muted-foreground text-xs'>Livraison prevue</p>
                    <p className='font-medium'>
                      {order.portalWorkflow?.deliveryDate
                        ? format(new Date(order.portalWorkflow.deliveryDate), 'dd/MM/yyyy')
                        : formatExpectedDeliveryDate(order)}
                    </p>
                  </div>
                  <div className='rounded-md bg-muted/50 p-2'>
                    <p className='text-muted-foreground text-xs'>Total HT</p>
                    <PriceDisplay amount={Number(order.total_ht)} className='font-medium' />
                  </div>
                  <div className='rounded-md bg-muted/50 p-2'>
                    <p className='text-muted-foreground text-xs'>Total TTC</p>
                    <PriceDisplay amount={Number(order.total_ttc)} className='font-medium' />
                  </div>
                </div>
                <div className='mt-3'>
                  <OrderTracking order={order} compact />
                </div>
                {order.portalWorkflow?.driver && (
                  <p className='text-muted-foreground mt-2 text-xs'>
                    Livreur: {order.portalWorkflow.driver}
                  </p>
                )}
                <Button asChild variant='outline' size='sm' className='mt-3 w-full'>
                  <Link href={`/orders/${order.id}`}>Detail</Link>
                </Button>
              </div>
            ))}
          </div>
          <div className='hidden overflow-x-auto rounded-lg border md:block'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Livraison prevue</TableHead>
                  <TableHead>Total HT</TableHead>
                  <TableHead>Total TTC</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Suivi</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className='font-mono'>{order.ref}</TableCell>
                    <TableCell>
                      {format(new Date(order.date_commande * 1000), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {order.portalWorkflow?.deliveryDate
                        ? format(new Date(order.portalWorkflow.deliveryDate), 'dd/MM/yyyy')
                        : formatExpectedDeliveryDate(order)}
                    </TableCell>
                    <TableCell>
                      <PriceDisplay amount={Number(order.total_ht)} />
                    </TableCell>
                    <TableCell>
                      <PriceDisplay amount={Number(order.total_ttc)} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge type='order' status={order.statut} />
                    </TableCell>
                    <TableCell>
                      <OrderTracking order={order} compact />
                      {order.portalWorkflow?.driver && (
                        <p className='text-muted-foreground mt-1 text-xs'>
                          {order.portalWorkflow.driver}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant='outline' size='sm'>
                        <Link href={`/orders/${order.id}`}>Detail</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
