import { AdminUsersClient } from '@/components/admin/admin-users-client';
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
      isActive: true
    }
  });

  const linkedUsers = users.filter((user) => user.thirdpartyId > 0).length;

  return <AdminUsersClient users={users} linkedUsers={linkedUsers} />;
}
