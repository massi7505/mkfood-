import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { prisma } from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin utilisateurs | Portail Client',
  robots: { index: false, follow: false }
};

export default async function AdminUsersPage() {
  await requireAdminAuth('/admin/users');
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      email: true,
      name: true,
      companyName: true,
      thirdpartyId: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  const linkedUsers = users.filter((user) => user.thirdpartyId > 0).length;

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Administration utilisateurs'
        description='Controle des comptes portail, roles et rattachements client Dolibarr.'
      />

      <section className='grid gap-3 sm:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>Comptes visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-semibold'>{users.length}</div>
            <p className='text-muted-foreground mt-1 text-sm'>Derniers comptes crees</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>Rattaches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-semibold'>{linkedUsers}</div>
            <p className='text-muted-foreground mt-1 text-sm'>Avec thirdpartyId Dolibarr</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>A traiter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-semibold'>{users.length - linkedUsers}</div>
            <p className='text-muted-foreground mt-1 text-sm'>Comptes non rattaches</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Utilisateurs recents</CardTitle>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Compte</TableHead>
                <TableHead>Societe</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Rattachement</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className='font-medium'>{user.name}</p>
                    <p className='text-muted-foreground text-xs'>{user.email}</p>
                  </TableCell>
                  <TableCell>{user.companyName ?? '-'}</TableCell>
                  <TableCell>
                    <Badge className='bg-zinc-700 text-white'>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.thirdpartyId > 0 ? (
                      <Badge className='bg-green-600 text-white'>
                        Dolibarr #{user.thirdpartyId}
                      </Badge>
                    ) : (
                      <Badge className='bg-amber-500 text-white'>A rattacher</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={user.isActive ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                      {user.isActive ? 'Actif' : 'Bloque'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
