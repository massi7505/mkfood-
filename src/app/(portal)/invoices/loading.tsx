import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

export default function InvoicesLoading() {
  return (
    <div className='space-y-6'>
      <div className='grid gap-3 md:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, index) => (
          <LoadingSkeleton key={index} />
        ))}
      </div>
      <div className='rounded-lg border'>
        {Array.from({ length: 8 }).map((_, index) => (
          <LoadingSkeleton variant='table-row' key={index} />
        ))}
      </div>
    </div>
  );
}
