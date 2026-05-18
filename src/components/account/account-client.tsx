'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export interface AccountValues {
  id: string;
  email: string;
  name: string;
  companyName?: string;
  siret?: string;
  address?: string;
  phone?: string;
  mobile?: string;
  billingAddress?: string;
  shippingAddress?: string;
  billingEmail?: string;
  vatNumber?: string;
  thirdpartyId: number;
}

export interface AccountResponse extends Omit<
  AccountValues,
  | 'companyName'
  | 'siret'
  | 'address'
  | 'phone'
  | 'mobile'
  | 'billingAddress'
  | 'shippingAddress'
  | 'billingEmail'
  | 'vatNumber'
> {
  companyName?: string | null;
  siret?: string | null;
  address?: string | null;
  phone?: string | null;
  mobile?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  billingEmail?: string | null;
  vatNumber?: string | null;
}

export function normalizeAccount(account: AccountResponse): AccountValues {
  return {
    ...account,
    companyName: account.companyName ?? '',
    siret: account.siret ?? '',
    address: account.address ?? '',
    phone: account.phone ?? '',
    mobile: account.mobile ?? '',
    billingAddress: account.billingAddress ?? '',
    shippingAddress: account.shippingAddress ?? '',
    billingEmail: account.billingEmail ?? '',
    vatNumber: account.vatNumber ?? ''
  };
}

async function fetchAccount(): Promise<AccountValues> {
  const response = await fetch('/api/account');
  const payload = (await response.json().catch(() => null)) as
    | AccountResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error ?? 'Compte indisponible');
  }

  return normalizeAccount(payload as AccountResponse);
}

async function updateAccount(values: AccountValues): Promise<AccountValues> {
  const response = await fetch('/api/account', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values)
  });
  const payload = (await response.json().catch(() => null)) as
    | AccountResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error ?? 'Mise a jour impossible');
  }

  return normalizeAccount(payload as AccountResponse);
}

async function linkClientCode(clientCode: string): Promise<AccountValues> {
  const response = await fetch('/api/account/link-client', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientCode })
  });
  const payload = (await response.json().catch(() => null)) as
    | AccountResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error ?? 'Rattachement impossible');
  }

  return normalizeAccount(payload as AccountResponse);
}

export function AccountClient({ initialAccount }: { initialAccount: AccountResponse }) {
  const queryClient = useQueryClient();
  const [clientCode, setClientCode] = useState('');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['account'],
    queryFn: fetchAccount,
    initialData: normalizeAccount(initialAccount),
    staleTime: 60_000
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty }
  } = useForm<AccountValues>();
  const mutation = useMutation({
    mutationFn: updateAccount,
    onSuccess: async (account) => {
      reset(account);
      await queryClient.invalidateQueries({ queryKey: ['account'] });
      toast.success('Compte et fiche Dolibarr mis a jour');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Mise a jour impossible');
    }
  });
  const linkMutation = useMutation({
    mutationFn: linkClientCode,
    onSuccess: async (account) => {
      setClientCode('');
      reset(account);
      queryClient.setQueryData(['account'], account);
      await queryClient.invalidateQueries({ queryKey: ['account'] });
      toast.success('Compte rattache a votre fiche client Dolibarr');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Rattachement impossible');
    }
  });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  if (isError) {
    return (
      <EmptyState
        icon={Building2}
        title='Compte indisponible'
        description='Impossible de charger les informations du compte.'
      />
    );
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Mon compte'
        description='Completez vos informations commerciales, de facturation et de livraison.'
      />

      {data && data.thirdpartyId <= 0 && (
        <Card className='border-amber-200 bg-amber-50 text-amber-950'>
          <CardHeader>
            <CardTitle className='text-base'>Rattacher mon compte client</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end'>
            <div className='space-y-2'>
              <Label htmlFor='clientCode'>Code client Dolibarr</Label>
              <Input
                id='clientCode'
                value={clientCode}
                onChange={(event) => setClientCode(event.target.value)}
                placeholder='Ex: CU2605-00001'
                disabled={linkMutation.isPending}
              />
              <p className='text-xs text-amber-800'>
                Saisissez le code client communique par email pour activer vos commandes et
                factures.
              </p>
            </div>
            <Button
              type='button'
              className='h-10 bg-blue-600 hover:bg-blue-700'
              disabled={!clientCode.trim()}
              isLoading={linkMutation.isPending}
              onClick={() => linkMutation.mutate(clientCode)}
            >
              Rattacher
            </Button>
          </CardContent>
        </Card>
      )}

      <form className='space-y-6' onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Identite commerciale</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='name'>Contact principal</Label>
              <Input id='name' disabled={isLoading} {...register('name', { required: true })} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email de connexion</Label>
              <Input id='email' disabled readOnly {...register('email')} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='companyName'>Nom commercial</Label>
              <Input id='companyName' disabled={isLoading} {...register('companyName')} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='siret'>SIRET</Label>
              <Input id='siret' disabled={isLoading} inputMode='numeric' {...register('siret')} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='phone'>Telephone</Label>
              <Input id='phone' disabled={isLoading} type='tel' {...register('phone')} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='mobile'>Mobile</Label>
              <Input id='mobile' disabled={isLoading} type='tel' {...register('mobile')} />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='address'>Adresse principale</Label>
              <Textarea id='address' disabled={isLoading} rows={3} {...register('address')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Facturation et livraison</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='billingEmail'>Email de facturation</Label>
              <Input
                id='billingEmail'
                disabled={isLoading}
                type='email'
                {...register('billingEmail')}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='vatNumber'>Numero TVA</Label>
              <Input id='vatNumber' disabled={isLoading} {...register('vatNumber')} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='billingAddress'>Adresse de facturation</Label>
              <Textarea
                id='billingAddress'
                disabled={isLoading}
                rows={4}
                {...register('billingAddress')}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='shippingAddress'>Adresse de livraison</Label>
              <Textarea
                id='shippingAddress'
                disabled={isLoading}
                rows={4}
                {...register('shippingAddress')}
              />
            </div>
          </CardContent>
        </Card>

        <div className='sticky bottom-3 z-10 flex justify-end sm:static'>
          <Button
            type='submit'
            className='h-11 w-full bg-blue-600 hover:bg-blue-700 sm:w-auto'
            disabled={!isDirty}
            isLoading={mutation.isPending}
          >
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}
