import { format, fromUnixTime } from 'date-fns';

type UnixDateValue = number | string | null | undefined;

export function getInvoiceUnixSeconds(value: UnixDateValue): number | null {
  if (value === null || value === undefined || value === '') return null;

  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export function getInvoiceDate(value: UnixDateValue): Date | null {
  const seconds = getInvoiceUnixSeconds(value);
  return seconds ? fromUnixTime(seconds) : null;
}

export function formatInvoiceDate(value: UnixDateValue, fallback = '-'): string {
  const date = getInvoiceDate(value);
  return date ? format(date, 'dd/MM/yyyy') : fallback;
}

export function invoiceDateIso(value: UnixDateValue): string {
  return getInvoiceDate(value)?.toISOString() ?? '';
}
