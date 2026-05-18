import { AccountClient } from '@/components/account/account-client';
import { prisma } from '@/lib/prisma';
import { requirePortalAuth } from '@/lib/require-portal-auth';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Mon compte | Portail Client',
  robots: { index: false, follow: false }
};

export default async function AccountPage() {
  const session = await requirePortalAuth('/account');
  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      companyName: true,
      siret: true,
      address: true,
      phone: true,
      mobile: true,
      billingAddress: true,
      shippingAddress: true,
      billingEmail: true,
      vatNumber: true,
      thirdpartyId: true
    }
  });

  if (!account) notFound();

  return <AccountClient initialAccount={account} />;
}
