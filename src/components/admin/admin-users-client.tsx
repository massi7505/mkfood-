'use client';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type AdminUserRole = 'CLIENT' | 'ADMIN';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  companyName: string | null;
  thirdpartyId: number;
  role: AdminUserRole;
  isActive: boolean;
}

async function patchUser({
  id,
  role,
  isActive
}: {
  id: string;
  role?: AdminUserRole;
  isActive?: boolean;
}) {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, isActive })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Modification impossible');
  }

  return response.json();
}

export function AdminUsersClient({
  users,
  linkedUsers
}: {
  users: AdminUser[];
  linkedUsers: number;
}) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: patchUser,
    onSuccess: () => {
      toast.success('Utilisateur mis a jour');
      router.refresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Modification impossible');
    }
  });

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 border-b pb-5 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <p className='text-muted-foreground text-sm'>Administration</p>
          <h1 className='text-2xl font-semibold tracking-normal md:text-3xl'>
            Utilisateurs
          </h1>
          <p className='text-muted-foreground mt-2 max-w-3xl text-sm'>
            Controle des comptes portail, attribution des roles et rattachements client Dolibarr.
          </p>
        </div>
        <Button type='button' variant='outline' onClick={() => router.refresh()}>
          <Icons.refreshCw className='size-4' />
          Actualiser
        </Button>
      </div>

      <section className='grid gap-3 sm:grid-cols-3'>
        <MetricCard label='Comptes visibles' value={users.length} detail='Derniers comptes crees' />
        <MetricCard label='Rattaches' value={linkedUsers} detail='Avec thirdpartyId Dolibarr' />
        <MetricCard label='A traiter' value={users.length - linkedUsers} detail='Comptes non rattaches' />
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
                    <div className='flex min-w-48 items-center gap-2'>
                      <select
                        className='border-input bg-background h-9 rounded-md border px-3 text-sm'
                        value={user.role}
                        disabled={mutation.isPending}
                        onChange={(event) =>
                          mutation.mutate({
                            id: user.id,
                            role: event.target.value as AdminUserRole
                          })
                        }
                      >
                        <option value='CLIENT'>Client</option>
                        <option value='ADMIN'>Administrateur</option>
                      </select>
                      <Badge className={user.role === 'ADMIN' ? 'bg-blue-700 text-white' : 'bg-zinc-700 text-white'}>
                        {user.role}
                      </Badge>
                    </div>
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
                    <Button
                      type='button'
                      size='sm'
                      variant={user.isActive ? 'outline' : 'default'}
                      disabled={mutation.isPending}
                      onClick={() =>
                        mutation.mutate({
                          id: user.id,
                          isActive: !user.isActive
                        })
                      }
                    >
                      {user.isActive ? 'Actif' : 'Bloque'}
                    </Button>
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

function MetricCard({
  label,
  value,
  detail
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium'>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-semibold'>{value}</div>
        <p className='text-muted-foreground mt-1 text-sm'>{detail}</p>
      </CardContent>
    </Card>
  );
}
