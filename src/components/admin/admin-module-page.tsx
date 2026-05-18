import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface AdminModuleAction {
  label: string;
  status: 'Disponible' | 'A brancher' | 'Planifie';
}

interface AdminModulePageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  metrics: Array<{
    label: string;
    value: string | number;
    detail: string;
  }>;
  actions: AdminModuleAction[];
}

const statusClassName: Record<AdminModuleAction['status'], string> = {
  Disponible: 'bg-green-600 text-white',
  'A brancher': 'bg-amber-500 text-white',
  Planifie: 'bg-zinc-600 text-white'
};

export function AdminModulePage({
  title,
  description,
  icon: Icon,
  metrics,
  actions
}: AdminModulePageProps) {
  return (
    <div className='space-y-6'>
      <PageHeader title={title} description={description} />

      <section className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>{metric.label}</CardTitle>
              <Icon className='text-muted-foreground size-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{metric.value}</div>
              <p className='text-muted-foreground mt-1 text-sm'>{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Fonctions du module</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {actions.map((action) => (
            <div
              className='grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center'
              key={action.label}
            >
              <p className='text-sm font-medium'>{action.label}</p>
              <Badge className={statusClassName[action.status]}>{action.status}</Badge>
              <Button type='button' variant='outline' size='sm' disabled={action.status !== 'Disponible'}>
                Ouvrir
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
