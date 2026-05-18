'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

export interface PortalAccount {
  id: string;
  email: string;
  name: string;
  companyName?: string | null;
  thirdpartyId: number;
}

async function fetchAccount(): Promise<PortalAccount> {
  const response = await fetch('/api/account');
  const payload = (await response.json().catch(() => null)) as
    | PortalAccount
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error ?? 'Compte indisponible');
  }

  return payload as PortalAccount;
}

export function useAccount(enabled = true) {
  const { data: session, status } = useSession();
  const query = useQuery({
    queryKey: ['account', session?.user?.id ?? 'anonymous'],
    queryFn: fetchAccount,
    enabled: enabled && status === 'authenticated',
    staleTime: 60_000
  });

  return {
    account: query.data,
    displayName: query.data?.companyName?.trim() || query.data?.name?.trim() || null,
    isLoading: query.isLoading,
    isError: query.isError
  };
}
