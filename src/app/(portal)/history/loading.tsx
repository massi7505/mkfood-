import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

export default function HistoryLoading() {
  return (
    <div className='space-y-6'>
      <LoadingSkeleton />
      <div className='rounded-lg border'>
        {Array.from({ length: 6 }).map((_, index) => (
          <LoadingSkeleton variant='table-row' key={index} />
        ))}
      </div>
    </div>
  );
}
