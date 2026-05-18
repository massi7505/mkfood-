import { Badge } from '@/components/ui/badge';
import type { DolibarrInvoice } from '@/lib/dolibarr/types';
import { getInvoiceStatus } from '@/lib/invoices/status';
import { cn } from '@/lib/utils';

export { getInvoiceStatus };

export function InvoiceBadge({ invoice }: { invoice: DolibarrInvoice }) {
  const status = getInvoiceStatus(invoice);
  const config = {
    paid: { label: 'Payee', className: 'bg-green-600 text-white' },
    pending: { label: 'En attente', className: 'bg-orange-500 text-white' },
    overdue: { label: 'En retard', className: 'bg-red-600 text-white animate-pulse' },
    draft: { label: 'Brouillon', className: 'bg-zinc-500 text-white' }
  }[status];

  return <Badge className={cn('rounded-md', config.className)}>{config.label}</Badge>;
}
