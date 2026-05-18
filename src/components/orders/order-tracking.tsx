import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { DolibarrOrder } from '@/lib/dolibarr/types';

interface OrderTrackingProps {
  order: Pick<DolibarrOrder, 'statut' | 'billed' | 'portalWorkflow'>;
  compact?: boolean;
}

const steps = [
  { key: 'created', label: 'Creee' },
  { key: 'validated', label: 'Validee' },
  { key: 'preparing', label: 'Preparation' },
  { key: 'ready', label: 'Prete' },
  { key: 'shipped', label: 'Livraison' },
  { key: 'billed', label: 'Facturee' }
] as const;

function getTrackingIndex(order: Pick<DolibarrOrder, 'statut' | 'billed' | 'portalWorkflow'>) {
  const status = Number(order.statut);
  const workflowStatus = order.portalWorkflow?.preparationStatus;

  if (Number(order.billed ?? 0) === 1) return 5;
  if (workflowStatus === 'delivered' || status >= 3) return 5;
  if (workflowStatus === 'shipped' || status >= 2) return 4;
  if (workflowStatus === 'ready') return 3;
  if (workflowStatus === 'preparing') return 2;
  if (workflowStatus === 'validated') return 1;
  if (status >= 1) return 1;
  return 0;
}

export function OrderTracking({ order, compact = false }: OrderTrackingProps) {
  const currentIndex = getTrackingIndex(order);

  return (
    <div className={cn('w-full', compact ? 'max-w-72' : 'space-y-2')}>
      <div className='grid grid-cols-6 gap-1'>
        {steps.map((step, index) => {
          const isDone = index <= currentIndex;
          return (
            <div key={step.key} className='min-w-0'>
              <div className={cn('h-1.5 rounded-full', isDone ? 'bg-blue-600' : 'bg-muted')} />
              {!compact && (
                <div className='mt-2 flex items-center gap-1.5'>
                  {isDone ? (
                    <Icons.circleCheck className='size-4 shrink-0 text-blue-600' />
                  ) : (
                    <Icons.circle className='text-muted-foreground size-4 shrink-0' />
                  )}
                  <span
                    className={cn(
                      'truncate text-xs font-medium',
                      isDone ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {compact && (
        <p className='text-muted-foreground mt-1 truncate text-xs'>
          {order.portalWorkflow?.customerMessage ?? steps[currentIndex]?.label ?? 'Creee'}
        </p>
      )}
      {!compact && order.portalWorkflow?.customerMessage && (
        <p className='text-muted-foreground text-sm'>{order.portalWorkflow.customerMessage}</p>
      )}
    </div>
  );
}
