'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function PortalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className='flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center'>
      <AlertTriangle className='mb-4 size-10 text-red-600' />
      <h1 className='text-xl font-semibold'>Une erreur est survenue</h1>
      <p className='text-muted-foreground mt-2 max-w-md text-sm'>
        Le portail n'a pas pu charger cette section.
      </p>
      <Button type='button' className='mt-6 bg-blue-600 hover:bg-blue-700' onClick={reset}>
        Reessayer
      </Button>
    </div>
  );
}
