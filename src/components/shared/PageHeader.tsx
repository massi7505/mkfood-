import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, breadcrumb, actions }: PageHeaderProps) {
  return (
    <div className='flex flex-col gap-3 border-b pb-4 sm:gap-4 sm:pb-6 md:flex-row md:items-end md:justify-between'>
      <div className='min-w-0'>
        {breadcrumb && (
          <p className='text-muted-foreground mb-1 text-xs sm:mb-2 sm:text-sm'>{breadcrumb}</p>
        )}
        <h1 className='font-display text-xl font-semibold tracking-normal sm:text-2xl md:text-3xl'>
          {title}
        </h1>
        {description && (
          <p className='text-muted-foreground mt-1 text-xs sm:mt-2 sm:text-sm'>{description}</p>
        )}
      </div>
      {actions && <div className='flex w-full items-center gap-2 sm:w-auto'>{actions}</div>}
    </div>
  );
}
