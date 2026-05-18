import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

export default function PortalNotFound() {
  return (
    <div className='flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center'>
      <FileQuestion className='text-muted-foreground mb-4 size-10' />
      <h1 className='text-xl font-semibold'>Page introuvable</h1>
      <p className='text-muted-foreground mt-2 max-w-md text-sm'>
        Cette page n'existe pas dans votre espace client.
      </p>
      <Button asChild className='mt-6 bg-blue-600 hover:bg-blue-700'>
        <Link href='/dashboard'>Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}
