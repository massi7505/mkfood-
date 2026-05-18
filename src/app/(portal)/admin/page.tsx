import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminNav } from '@/config/admin-nav';
import { prisma } from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Administration | Portail Client',
  robots: { index: false, follow: false }
};

export default async function AdminPage() {
  await requireAdminAuth('/admin');
  const [usersCount, linkedUsersCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { thirdpartyId: { gt: 0 } } })
  ]);

  const metrics = [
    {
      label: 'Utilisateurs',
      value: usersCount,
      detail: 'Comptes portail crees'
    },
    {
      label: 'Comptes rattaches',
      value: linkedUsersCount,
      detail: 'Clients lies a Dolibarr'
    },
    {
      label: 'Modules',
      value: adminNav.length - 1,
      detail: 'Espaces de pilotage'
    },
    {
      label: 'Mode',
      value: 'Admin',
      detail: 'Acces reserve'
    }
  ];

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Administration'
        description='Centre de pilotage pour les commandes, factures, produits, utilisateurs et livreurs.'
      />

      <section className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{metric.value}</div>
              <p className='text-muted-foreground mt-1 text-sm'>{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
        {adminNav
          .filter((item) => item.href !== '/admin')
          .map((item) => (
            <Link
              className='group rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50'
              href={item.href}
              key={item.href}
            >
              <div className='flex items-start gap-3'>
                <span className='flex size-10 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white'>
                  <item.icon className='size-5' />
                </span>
                <div>
                  <h2 className='font-semibold group-hover:text-blue-700'>{item.label}</h2>
                  <p className='text-muted-foreground mt-1 text-sm'>
                    Outils et workflows du module {item.label.toLowerCase()}.
                  </p>
                </div>
              </div>
            </Link>
          ))}
      </section>
    </div>
  );
}
