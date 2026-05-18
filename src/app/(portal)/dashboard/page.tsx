import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { requirePortalAuth } from '@/lib/require-portal-auth';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Tableau de bord | Portail Client',
  robots: { index: false, follow: false }
};

export default async function DashboardPage() {
  await requirePortalAuth('/dashboard');

  return (
    <Suspense
      fallback={
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <LoadingSkeleton key={index} />
          ))}
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
