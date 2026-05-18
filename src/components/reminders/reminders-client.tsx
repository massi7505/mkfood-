'use client';

import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useInvoices } from '@/hooks/useInvoices';
import type { DolibarrInvoice } from '@/lib/dolibarr/types';
import { formatInvoiceDate } from '@/lib/invoices/format';
import { getInvoiceDelay, isInvoiceMoreThan30DaysLate } from '@/lib/invoices/reminders';
import { AlertTriangle, Mail } from 'lucide-react';

function ReminderActions({ invoice }: { invoice: DolibarrInvoice }) {
  const email = process.env.NEXT_PUBLIC_ACCOUNTING_EMAIL ?? 'compta@example.com';

  return (
    <div className='flex flex-col gap-2 sm:flex-row'>
      <Button type='button' variant='outline' size='sm' asChild>
        <a href={`mailto:${email}?subject=Reglement facture ${encodeURIComponent(invoice.ref)}`}>
          <Mail className='size-4' />
          Contacter le service compta
        </a>
      </Button>
    </div>
  );
}

function urgencyClass(daysLate: number) {
  if (daysLate > 30) return 'text-red-600';
  if (daysLate > 15) return 'text-orange-500';
  return 'text-yellow-600';
}

function sortInvoicesByDelay(invoices: DolibarrInvoice[]) {
  return invoices.reduce<DolibarrInvoice[]>((sorted, invoice) => {
    const delay = getInvoiceDelay(invoice);
    const insertAt = sorted.findIndex((item) => getInvoiceDelay(item) < delay);

    if (insertAt === -1) return [...sorted, invoice];

    return [...sorted.slice(0, insertAt), invoice, ...sorted.slice(insertAt)];
  }, []);
}

export function RemindersClient() {
  const { invoices, isLoading, isError } = useInvoices('unpaid');
  const sortedInvoices = sortInvoicesByDelay(invoices);
  const totalUnpaid = invoices.reduce((sum, invoice) => sum + Number(invoice.remaintopay || 0), 0);
  const lateInvoices = invoices.filter((invoice) => getInvoiceDelay(invoice) > 0);
  const severeLateCount = invoices.filter((invoice) => isInvoiceMoreThan30DaysLate(invoice)).length;
  const averageLate = lateInvoices.length
    ? Math.round(
        lateInvoices.reduce((sum, invoice) => sum + getInvoiceDelay(invoice), 0) /
          lateInvoices.length
      )
    : 0;

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Relances'
        description='Suivi des factures ouvertes et retards de paiement.'
      />

      {isLoading && <p className='text-muted-foreground text-sm'>Chargement des relances...</p>}

      {isError && (
        <EmptyState
          icon={AlertTriangle}
          title='Relances indisponibles'
          description="Impossible de charger les factures ouvertes pour l'instant."
        />
      )}

      {!isLoading && !isError && invoices.length === 0 && (
        <EmptyState
          icon={Mail}
          title='Aucune relance'
          description='Aucune facture ouverte ne necessite de relance.'
        />
      )}

      {!isLoading && !isError && invoices.length > 0 && (
        <>
          {severeLateCount > 0 && (
            <div className='sticky top-16 z-10 flex items-start gap-3 rounded-lg border border-red-700 bg-red-600 p-4 text-white shadow-sm'>
              <AlertTriangle className='mt-0.5 size-5 shrink-0' />
              <p className='text-sm font-medium'>
                Vous avez {severeLateCount} facture(s) en retard de plus de 30 jours. Veuillez
                regulariser votre situation.
              </p>
            </div>
          )}

          <div className='grid gap-3 md:grid-cols-3'>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm'>Total impaye</CardTitle>
              </CardHeader>
              <CardContent>
                <PriceDisplay amount={totalUnpaid} className='text-xl font-semibold' />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm'>Factures en attente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-xl font-semibold'>{invoices.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm'>Retard moyen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-xl font-semibold'>{averageLate} jours</p>
              </CardContent>
            </Card>
          </div>

          <div className='space-y-3'>
            {sortedInvoices.map((invoice) => {
              const daysLate = getInvoiceDelay(invoice);
              const progress = (Math.min(Math.max(daysLate, 0), 45) / 45) * 100;
              return (
                <Card key={invoice.id} className='rounded-lg'>
                  <CardContent className='space-y-4'>
                    <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                      <div>
                        <p className='font-mono text-sm font-semibold'>{invoice.ref}</p>
                        <p className='text-muted-foreground text-sm'>
                          Echeance: {formatInvoiceDate(invoice.date_lim_reglement)}
                        </p>
                        <p className={`mt-2 text-sm font-medium ${urgencyClass(daysLate)}`}>
                          {daysLate > 0
                            ? `En retard de ${daysLate} jours`
                            : `Echeance dans ${Math.abs(daysLate)} jours`}
                        </p>
                      </div>
                      <div className='text-left md:text-right'>
                        <p className='text-muted-foreground text-sm'>Montant</p>
                        <PriceDisplay
                          amount={Number(invoice.remaintopay)}
                          className='text-lg font-semibold'
                        />
                      </div>
                    </div>
                    <Progress value={progress} className='h-2' />
                    <ReminderActions invoice={invoice} />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Button type='button' className='bg-blue-600 hover:bg-blue-700' asChild>
            <a href={`mailto:${process.env.NEXT_PUBLIC_ACCOUNTING_EMAIL ?? 'compta@example.com'}`}>
              Contacter notre service comptabilite
            </a>
          </Button>
        </>
      )}
    </div>
  );
}
