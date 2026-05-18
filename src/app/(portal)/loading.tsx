import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

export default function PortalLoading() {
  return (
    <div className='space-y-6'>
      <LoadingSkeleton />
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingSkeleton key={index} />
        ))}
      </div>
      <div className='rounded-lg border'>
        {Array.from({ length: 6 }).map((_, index) => (
          <LoadingSkeleton variant='table-row' key={index} />
        ))}
      </div>
    </div>
  );
}
