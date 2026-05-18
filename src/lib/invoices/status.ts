import type { DolibarrInvoice } from '@/lib/dolibarr/types';
import { isInvoiceOverdue } from '@/lib/invoices/reminders';

export function isInvoicePaid(
  invoice: Pick<DolibarrInvoice, 'statut' | 'remaintopay' | 'total_ttc'>
) {
  const status = Number(invoice.statut);
  const remaining = Number(invoice.remaintopay ?? 0);
  const total = Number(invoice.total_ttc ?? 0);

  return status === 2 || (total > 0 && remaining <= 0);
}

export function getInvoiceStatus(invoice: DolibarrInvoice) {
  const status = Number(invoice.statut);

  if (isInvoicePaid(invoice)) return 'paid';
  if (status === 0) return 'draft';
  if (status === 1 && isInvoiceOverdue(invoice)) return 'overdue';
  if (status === 1) return 'pending';
  return 'draft';
}
