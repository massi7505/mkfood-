import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className='flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center'>
      <Icon className='text-muted-foreground mb-4 size-10' />
      <h2 className='text-lg font-semibold'>{title}</h2>
      <p className='text-muted-foreground mt-2 max-w-sm text-sm'>{description}</p>
      {action && (
        <Button asChild className='mt-6'>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
