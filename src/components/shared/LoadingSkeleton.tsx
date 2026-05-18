import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingSkeletonProps {
  variant?: 'card' | 'table-row' | 'product-card';
}

export function LoadingSkeleton({ variant = 'card' }: LoadingSkeletonProps) {
  if (variant === 'table-row') {
    return (
      <div className='grid grid-cols-6 gap-4 border-b py-3'>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton className='h-5' key={index} />
        ))}
      </div>
    );
  }

  if (variant === 'product-card') {
    return (
      <Card className='rounded-lg'>
        <Skeleton className='mx-4 aspect-square rounded-md' />
        <CardContent className='space-y-3'>
          <Skeleton className='h-4 w-20' />
          <Skeleton className='h-5 w-full' />
          <Skeleton className='h-9 w-full' />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Skeleton className='h-5 w-32' />
      </CardHeader>
      <CardContent className='space-y-3'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-2/3' />
      </CardContent>
    </Card>
  );
}
