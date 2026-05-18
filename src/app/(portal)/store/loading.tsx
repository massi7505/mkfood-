import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

export default function StoreLoading() {
  return (
    <div className='grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
      {Array.from({ length: 10 }).map((_, index) => (
        <LoadingSkeleton variant='product-card' key={index} />
      ))}
    </div>
  );
}
