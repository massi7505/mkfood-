import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

export default function RemindersLoading() {
  return (
    <div className='space-y-4'>
      {Array.from({ length: 5 }).map((_, index) => (
        <LoadingSkeleton key={index} />
      ))}
    </div>
  );
}
