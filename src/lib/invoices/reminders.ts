import type { DolibarrInvoice } from '@/lib/dolibarr/types';
import { differenceInDays } from 'date-fns';
import { getInvoiceDate } from './format';

export function getInvoiceDelay(
  invoice: Pick<DolibarrInvoice, 'date_lim_reglement'>,
  now = new Date()
) {
  const dueDate = getInvoiceDate(invoice.date_lim_reglement);

  if (!dueDate) return 0;

  return differenceInDays(now, dueDate);
}

export function isInvoiceOverdue(
  invoice: Pick<DolibarrInvoice, 'date_lim_reglement'>,
  now = new Date()
) {
  return getInvoiceDelay(invoice, now) > 0;
}

export function isInvoiceMoreThan30DaysLate(
  invoice: Pick<DolibarrInvoice, 'date_lim_reglement'>,
  now = new Date()
) {
  return getInvoiceDelay(invoice, now) > 30;
}
