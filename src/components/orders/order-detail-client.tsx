'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { OrderTracking } from '@/components/orders/order-tracking';
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
import { useCreateInvoiceFromOrder, useOrder } from '@/hooks/useOrders';
import { formatExpectedDeliveryDate } from '@/lib/orders/format';
import { format } from 'date-fns';
import { FileText } from 'lucide-react';
import Link from 'next/link';

export function OrderDetailClient({ id }: { id: string }) {
  const { data: order, isLoading } = useOrder(id);
  const createInvoice = useCreateInvoiceFromOrder(id);

  if (isLoading) {
    return <p className='text-muted-foreground text-sm'>Chargement de la commande...</p>;
  }

  if (!order) {
    return (
      <div className='space-y-4'>
        <PageHeader title='Commande introuvable' />
        <Button asChild variant='outline'>
          <Link href='/orders'>Retour aux commandes</Link>
        </Button>
      </div>
    );
  }

  const canInvoice = Number(order.statut) >= 1 && Number(order.billed ?? 0) !== 1;
  const isBilled = Number(order.billed ?? 0) === 1;

  return (
    <div className='space-y-6'>
      <PageHeader
        title={`Commande ${order.ref}`}
        description={format(new Date(order.date_commande * 1000), 'dd/MM/yyyy')}
        actions={
          <div className='grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center'>
            <StatusBadge type='order' status={order.statut} />
            {canInvoice && (
              <Button
                type='button'
                className='w-full gap-2 bg-blue-600 hover:bg-blue-700 sm:w-auto'
                isLoading={createInvoice.isPending}
                onClick={() => createInvoice.mutate()}
              >
                <FileText className='size-4' />
                Generer facture
              </Button>
            )}
            {isBilled && (
              <Button asChild variant='outline' className='w-full gap-2 sm:w-auto'>
                <Link href='/invoices'>
                  <FileText className='size-4' />
                  Voir factures
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <section className='rounded-lg border bg-card p-4'>
        <div className='mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-sm font-semibold'>Suivi de commande</h2>
            <p className='text-muted-foreground text-sm'>
              Progression calculee depuis le statut Dolibarr et la facturation.
            </p>
          </div>
          <StatusBadge type='order' status={order.statut} />
        </div>
        <div className='mb-4 rounded-md bg-muted/50 p-3 text-sm'>
          <p className='text-muted-foreground text-xs'>Date prevue de livraison</p>
          <p className='font-medium'>
            {order.portalWorkflow?.deliveryDate
              ? format(new Date(order.portalWorkflow.deliveryDate), 'dd/MM/yyyy')
              : formatExpectedDeliveryDate(order)}
          </p>
          {order.portalWorkflow?.driver && (
            <p className='text-muted-foreground mt-1 text-xs'>
              Livreur: {order.portalWorkflow.driver}
            </p>
          )}
          {order.portalWorkflow?.deliveryNote && (
            <p className='text-muted-foreground mt-1 text-xs'>
              Note: {order.portalWorkflow.deliveryNote}
            </p>
          )}
        </div>
        <OrderTracking order={order} />
      </section>

      <div className='space-y-3 md:hidden'>
        {order.lines.map((line) => (
          <div className='rounded-lg border bg-card p-3' key={line.id}>
            <p className='font-mono text-sm font-semibold'>{line.product_ref}</p>
            <p className='mt-1 text-sm'>{line.product_label}</p>
            <div className='mt-3 grid grid-cols-2 gap-2 text-sm'>
              <div className='rounded-md bg-muted/50 p-2'>
                <p className='text-muted-foreground text-xs'>Qte</p>
                <p className='font-medium'>{line.qty}</p>
              </div>
              <div className='rounded-md bg-muted/50 p-2'>
                <p className='text-muted-foreground text-xs'>Prix unit HT</p>
                <PriceDisplay amount={Number(line.subprice)} className='font-medium' />
              </div>
              <div className='rounded-md bg-muted/50 p-2'>
                <p className='text-muted-foreground text-xs'>Total HT</p>
                <PriceDisplay amount={Number(line.total_ht)} className='font-medium' />
              </div>
              <div className='rounded-md bg-muted/50 p-2'>
                <p className='text-muted-foreground text-xs'>Total TTC</p>
                <PriceDisplay amount={Number(line.total_ttc)} className='font-medium' />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className='hidden overflow-x-auto rounded-lg border md:block'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Qte</TableHead>
              <TableHead>Prix unit HT</TableHead>
              <TableHead>Total HT</TableHead>
              <TableHead>Total TTC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell className='font-mono'>{line.product_ref}</TableCell>
                <TableCell>{line.product_label}</TableCell>
                <TableCell>{line.qty}</TableCell>
                <TableCell>
                  <PriceDisplay amount={Number(line.subprice)} />
                </TableCell>
                <TableCell>
                  <PriceDisplay amount={Number(line.total_ht)} />
                </TableCell>
                <TableCell>
                  <PriceDisplay amount={Number(line.total_ttc)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className='grid grid-cols-2 gap-3 rounded-lg border bg-card p-4 sm:flex sm:justify-end sm:gap-4'>
        <div className='text-right'>
          <p className='text-muted-foreground text-sm'>Total HT</p>
          <PriceDisplay amount={Number(order.total_ht)} className='text-lg font-semibold' />
        </div>
        <div className='text-right'>
          <p className='text-muted-foreground text-sm'>Total TTC</p>
          <PriceDisplay amount={Number(order.total_ttc)} className='text-lg font-semibold' />
        </div>
      </div>
    </div>
  );
}
