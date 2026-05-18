import { cn } from '@/lib/utils';

interface PriceDisplayProps {
  amount: number;
  currency?: string;
  showTva?: boolean;
  tvaRate?: number;
  className?: string;
}

const formatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR'
});

export function PriceDisplay({
  amount,
  currency = 'EUR',
  showTva = false,
  tvaRate = 20,
  className
}: PriceDisplayProps) {
  const format = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(value);

  if (showTva) {
    return (
      <span className={cn('font-mono tabular-nums', className)}>
        <span className='block'>{format(amount)} HT</span>
        <span className='text-muted-foreground block text-xs'>
          {format(amount * (1 + tvaRate / 100))} TTC
        </span>
      </span>
    );
  }

  return (
    <span className={cn('font-mono tabular-nums', className)}>{formatter.format(amount)}</span>
  );
}
