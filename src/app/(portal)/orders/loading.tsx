import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

export default function OrdersLoading() {
  return (
    <div className='rounded-lg border'>
      {Array.from({ length: 8 }).map((_, index) => (
        <LoadingSkeleton variant='table-row' key={index} />
      ))}
    </div>
  );
}
