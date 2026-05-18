'use client';

import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useInvoicePDF, useInvoices } from '@/hooks/useInvoices';
import { useOrders } from '@/hooks/useOrders';
import type { DolibarrInvoice } from '@/lib/dolibarr/types';
import { isInvoiceOverdue } from '@/lib/invoices/reminders';
import { isInvoicePaid } from '@/lib/invoices/status';
import { fadeUp, staggerContainer } from '@/variants';
import { format } from 'date-fns';
import { ClipboardList, FileText, ShoppingCart, Timer } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

function DownloadInvoiceButton({ invoice }: { invoice: DolibarrInvoice }) {
  const isPaid = isInvoicePaid(invoice);
  const { downloadPDF, isDownloading } = useInvoicePDF(invoice.id, invoice);
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={!isPaid}
      isLoading={isDownloading}
      onClick={downloadPDF}
      title={isPaid ? 'Telecharger la facture' : 'PDF disponible apres paiement'}
    >
      PDF
    </Button>
  );
}

export function DashboardClient() {
  const { data: session } = useSession();
  const { orders } = useOrders();
  const { invoices } = useInvoices('unpaid');
  const now = new Date();
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Client';
  const currentMonthOrders = orders.filter((order) => {
    const date = new Date(order.date_commande * 1000);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const unpaidTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.remaintopay || 0), 0);
  const overdueInvoices = invoices.filter((invoice) => isInvoiceOverdue(invoice));
  const lastOrder = orders[0];

  const kpis = [
    {
      label: 'Commandes ce mois',
      value: currentMonthOrders.length,
      icon: ShoppingCart
    },
    {
      label: 'Factures en attente',
      value: invoices.length,
      detail: <PriceDisplay amount={unpaidTotal} />,
      icon: FileText
    },
    {
      label: 'Retards de paiement',
      value: overdueInvoices.length,
      icon: Timer
    },
    {
      label: 'Dernier achat',
      value: lastOrder ? format(new Date(lastOrder.date_commande * 1000), 'dd/MM/yyyy') : '-',
      detail: lastOrder ? <PriceDisplay amount={Number(lastOrder.total_ttc)} /> : null,
      icon: ClipboardList
    }
  ];

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='font-display text-xl font-semibold sm:text-2xl md:text-3xl'>
          Bonjour {firstName}
        </h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          Voici un resume de votre activite - {format(now, 'dd/MM/yyyy')}
        </p>
      </div>

      <motion.div
        variants={staggerContainer}
        initial='hidden'
        animate='show'
        className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'
      >
        {kpis.map((kpi) => (
          <motion.div variants={fadeUp} key={kpi.label}>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium'>{kpi.label}</CardTitle>
                <kpi.icon className='text-muted-foreground size-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-semibold'>{kpi.value}</div>
                {kpi.detail && (
                  <div className='text-muted-foreground mt-1 text-sm'>{kpi.detail}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className='grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:gap-6'>
        <Card>
          <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <CardTitle className='text-base'>Commandes recentes</CardTitle>
            <Button asChild variant='outline' size='sm' className='w-full sm:w-auto'>
              <Link href='/orders'>Voir toutes les commandes</Link>
            </Button>
          </CardHeader>
          <CardContent className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant TTC</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(0, 5).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className='font-mono'>{order.ref}</TableCell>
                    <TableCell>
                      {format(new Date(order.date_commande * 1000), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <PriceDisplay amount={Number(order.total_ttc)} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge type='order' status={order.statut} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <CardTitle className='text-base'>Factures en attente</CardTitle>
            <Button asChild variant='outline' size='sm' className='w-full sm:w-auto'>
              <Link href='/invoices'>Voir mes factures</Link>
            </Button>
          </CardHeader>
          <CardContent className='space-y-3'>
            {invoices.slice(0, 5).map((invoice) => {
              const total = Number(invoice.total_ttc || 0);
              const remaining = Number(invoice.remaintopay || 0);
              const paidPercent = total > 0 ? ((total - remaining) / total) * 100 : 0;
              return (
                <div className='space-y-2 rounded-lg border p-3' key={invoice.id}>
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <p className='font-mono text-sm font-medium'>{invoice.ref}</p>
                      <p className='text-muted-foreground text-xs'>
                        Restant du: <PriceDisplay amount={remaining} />
                      </p>
                    </div>
                    <DownloadInvoiceButton invoice={invoice} />
                  </div>
                  <Progress value={paidPercent} className='h-2' />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-3 sm:grid-cols-2'>
        <Button asChild className='h-12 bg-blue-600 hover:bg-blue-700'>
          <Link href='/store'>Passer une commande</Link>
        </Button>
        <Button asChild variant='outline' className='h-12'>
          <Link href='/invoices'>Voir mes factures</Link>
        </Button>
      </div>
    </div>
  );
}
