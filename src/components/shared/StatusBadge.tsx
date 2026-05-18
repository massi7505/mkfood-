import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string | number;
  type: 'order' | 'invoice';
}

const orderStatuses: Record<string, { label: string; className: string }> = {
  '-1': { label: 'Annulee', className: 'bg-zinc-600 text-white' },
  '0': { label: 'Brouillon', className: 'bg-zinc-500 text-white' },
  '1': { label: 'Validee', className: 'bg-blue-600 text-white' },
  '2': { label: 'Expediee', className: 'bg-indigo-600 text-white' },
  '3': { label: 'Livree', className: 'bg-green-600 text-white' }
};

const invoiceStatuses: Record<string, { label: string; className: string }> = {
  '0': { label: 'Brouillon', className: 'bg-zinc-500 text-white' },
  '1': { label: 'En attente', className: 'bg-orange-500 text-white' },
  '2': { label: 'Payee', className: 'bg-green-600 text-white' },
  '3': { label: 'Abandonnee', className: 'bg-zinc-600 text-white' },
  overdue: { label: 'En retard', className: 'bg-red-600 text-white animate-pulse' }
};

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const value = String(status);
  const map = type === 'order' ? orderStatuses : invoiceStatuses;
  const config = map[value] ?? { label: value, className: 'bg-zinc-500 text-white' };

  return <Badge className={cn('rounded-md', config.className)}>{config.label}</Badge>;
}
