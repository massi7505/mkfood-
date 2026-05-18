import { format } from 'date-fns';

import type { DolibarrOrder } from '@/lib/dolibarr/types';

type DeliveryDateValue = number | string | null | undefined;

const DELIVERY_DATE_OPTION_KEYS = [
  'options_delivery_date',
  'options_date_delivery',
  'options_date_livraison',
  'options_date_livraison_prevue',
  'options_livraison_prevue'
] as const;

function getDateFromValue(value: DeliveryDateValue): Date | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    return new Date(value > 100000000000 ? value : value * 1000);
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const numericValue = Number(trimmedValue);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return new Date(numericValue > 100000000000 ? numericValue : numericValue * 1000);
  }

  const date = new Date(trimmedValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getExpectedDeliveryDate(order: DolibarrOrder): Date | null {
  const directDate =
    getDateFromValue(order.delivery_date) ??
    getDateFromValue(order.date_delivery) ??
    getDateFromValue(order.date_livraison) ??
    getDateFromValue(order.date_livraison_prevue);

  if (directDate) return directDate;

  for (const key of DELIVERY_DATE_OPTION_KEYS) {
    const date = getDateFromValue(order.array_options?.[key]);
    if (date) return date;
  }

  return null;
}

export function formatExpectedDeliveryDate(order: DolibarrOrder, fallback = 'A confirmer') {
  const date = getExpectedDeliveryDate(order);
  return date ? format(date, 'dd/MM/yyyy') : fallback;
}
