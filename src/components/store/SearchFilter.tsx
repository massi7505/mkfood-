'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useEffect, useState } from 'react';

interface SearchFilterProps {
  search: string;
  category: string;
  priceSort: string;
  stockFilter: string;
  viewMode: 'grid' | 'list';
  categories: string[];
  resultsCount: number;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onPriceSortChange: (value: string) => void;
  onStockFilterChange: (value: string) => void;
  onViewModeChange: (value: 'grid' | 'list') => void;
}

export function SearchFilter({
  search,
  category,
  priceSort,
  stockFilter,
  viewMode,
  categories,
  resultsCount,
  onSearchChange,
  onCategoryChange,
  onPriceSortChange,
  onStockFilterChange,
  onViewModeChange
}: SearchFilterProps) {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const timeout = window.setTimeout(() => onSearchChange(localSearch), 300);
    return () => window.clearTimeout(timeout);
  }, [localSearch, onSearchChange]);

  return (
    <div className='rounded-lg border bg-white p-3 shadow-xs sm:p-4'>
      <div className='flex flex-col gap-3 md:flex-row md:items-center'>
        <div className='relative md:max-w-sm md:flex-1'>
          <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
          <Input
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder='Reference, produit, description'
            className='h-10 pl-9'
          />
        </div>
        <div className='grid flex-1 grid-cols-1 gap-2 min-[420px]:grid-cols-3'>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger className='h-10'>
              <SelectValue placeholder='Categorie' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Toutes categories</SelectItem>
              {categories.map((item) => (
                <SelectItem value={item} key={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priceSort} onValueChange={onPriceSortChange}>
            <SelectTrigger className='h-10'>
              <SelectValue placeholder='Prix' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='none'>Prix</SelectItem>
              <SelectItem value='asc'>Prix croissant</SelectItem>
              <SelectItem value='desc'>Prix decroissant</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={onStockFilterChange}>
            <SelectTrigger className='h-10'>
              <SelectValue placeholder='Stock' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Tous stocks</SelectItem>
              <SelectItem value='available'>En stock</SelectItem>
              <SelectItem value='empty'>Rupture</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='hidden rounded-md border p-1 md:flex'>
          <Button
            type='button'
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size='icon'
            onClick={() => onViewModeChange('grid')}
            aria-label='Vue grille'
          >
            <Icons.grid className='size-4' />
          </Button>
          <Button
            type='button'
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size='icon'
            onClick={() => onViewModeChange('list')}
            aria-label='Vue liste'
          >
            <Icons.list className='size-4' />
          </Button>
        </div>
      </div>
      <div className='mt-3 flex flex-wrap items-center justify-between gap-2'>
        <p className='text-muted-foreground text-xs sm:text-sm'>{resultsCount} produits trouves</p>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-8 px-2 text-xs'
          onClick={() => {
            setLocalSearch('');
            onSearchChange('');
            onCategoryChange('all');
            onPriceSortChange('none');
            onStockFilterChange('all');
          }}
        >
          Reinitialiser
        </Button>
      </div>
    </div>
  );
}
