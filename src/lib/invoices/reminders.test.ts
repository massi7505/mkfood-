import { getInvoiceDelay, isInvoiceMoreThan30DaysLate, isInvoiceOverdue } from './reminders';
import { describe, expect, it } from 'vitest';

describe('invoice reminder calculations', () => {
  it('returns positive days when invoice is late', () => {
    const now = new Date('2026-05-15T00:00:00Z');
    const dueDate = Date.parse('2026-04-10T00:00:00Z') / 1000;

    expect(getInvoiceDelay({ date_lim_reglement: dueDate }, now)).toBe(35);
    expect(isInvoiceOverdue({ date_lim_reglement: dueDate }, now)).toBe(true);
    expect(isInvoiceMoreThan30DaysLate({ date_lim_reglement: dueDate }, now)).toBe(true);
  });

  it('returns negative days when invoice is not due yet', () => {
    const now = new Date('2026-05-15T00:00:00Z');
    const dueDate = Date.parse('2026-05-20T00:00:00Z') / 1000;

    expect(getInvoiceDelay({ date_lim_reglement: dueDate }, now)).toBe(-5);
    expect(isInvoiceOverdue({ date_lim_reglement: dueDate }, now)).toBe(false);
  });
});
