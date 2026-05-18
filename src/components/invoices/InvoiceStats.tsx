'use client';

import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DolibarrInvoice } from '@/lib/dolibarr/types';
import { getInvoiceDate } from '@/lib/invoices/format';
import { getInvoiceStatus } from './InvoiceBadge';

export function InvoiceStats({ invoices }: { invoices: DolibarrInvoice[] }) {
  const totalDue = invoices.reduce((sum, invoice) => sum + Number(invoice.remaintopay || 0), 0);
  const overdue = invoices.filter((invoice) => getInvoiceStatus(invoice) === 'overdue');
  const paidThisMonth = invoices
    .filter((invoice) => {
      const date = getInvoiceDate(invoice.date);
      const now = new Date();
      return (
        date &&
        Number(invoice.statut) === 2 &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, invoice) => sum + Number(invoice.total_ttc || 0), 0);

  return (
    <div className='grid gap-3 md:grid-cols-3'>
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium'>Total du</CardTitle>
        </CardHeader>
        <CardContent>
          <PriceDisplay amount={totalDue} className='text-xl font-semibold' />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium'>En retard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-xl font-semibold'>{overdue.length}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium'>Paye ce mois</CardTitle>
        </CardHeader>
        <CardContent>
          <PriceDisplay amount={paidThisMonth} className='text-xl font-semibold' />
        </CardContent>
      </Card>
    </div>
  );
}
