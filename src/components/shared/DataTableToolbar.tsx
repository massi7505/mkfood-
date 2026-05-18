import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ReactNode } from 'react';

interface DataTableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onReset?: () => void;
  onExport?: () => void;
  filters?: ReactNode;
  placeholder?: string;
}

export function DataTableToolbar({
  search,
  onSearchChange,
  onReset,
  onExport,
  filters,
  placeholder = 'Rechercher'
}: DataTableToolbarProps) {
  return (
    <div className='flex flex-col gap-3 rounded-lg border bg-card p-3 md:flex-row md:items-center'>
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={placeholder}
        className='md:max-w-xs'
      />
      {filters}
      <div className='grid grid-cols-2 gap-2 sm:flex sm:flex-1 sm:justify-end'>
        {onReset && (
          <Button type='button' variant='outline' className='w-full sm:w-auto' onClick={onReset}>
            Reinitialiser
          </Button>
        )}
        {onExport && (
          <Button type='button' variant='outline' className='w-full sm:w-auto' onClick={onExport}>
            Export CSV
          </Button>
        )}
      </div>
    </div>
  );
}
