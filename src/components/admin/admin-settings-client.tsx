'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AppSettingsPayload {
  companyName: string;
  logoUrl?: string;
  faviconUrl?: string;
}

async function fetchSettings() {
  const response = await fetch('/api/admin/settings');
  if (!response.ok) throw new Error('Chargement impossible');
  return (await response.json()) as { settings: AppSettingsPayload };
}

async function saveSettings(settings: AppSettingsPayload) {
  const response = await fetch('/api/admin/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!response.ok) throw new Error('Enregistrement impossible');
  return (await response.json()) as { settings: AppSettingsPayload };
}

export function AdminSettingsClient() {
  const [companyName, setCompanyName] = useState('Portail Client');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const settingsQuery = useQuery({
    queryKey: ['admin-settings'],
    queryFn: fetchSettings
  });
  const mutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: ({ settings }) => {
      setCompanyName(settings.companyName);
      setLogoUrl(settings.logoUrl ?? '');
      setFaviconUrl(settings.faviconUrl ?? '');
      toast.success('Parametres enregistres');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Enregistrement impossible');
    }
  });

  useEffect(() => {
    const settings = settingsQuery.data?.settings;
    if (!settings) return;
    setCompanyName(settings.companyName);
    setLogoUrl(settings.logoUrl ?? '');
    setFaviconUrl(settings.faviconUrl ?? '');
  }, [settingsQuery.data?.settings]);

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 border-b pb-5 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <p className='text-muted-foreground text-sm'>Administration</p>
          <h1 className='text-2xl font-semibold tracking-normal md:text-3xl'>Parametres</h1>
          <p className='text-muted-foreground mt-2 max-w-3xl text-sm'>
            Configurez l'identite visible dans l'interface: nom de l'entreprise, logo et favicon.
          </p>
        </div>
        <Button
          type='button'
          isLoading={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              companyName: companyName.trim(),
              logoUrl: logoUrl.trim(),
              faviconUrl: faviconUrl.trim()
            })
          }
        >
          <Icons.check className='size-4' />
          Enregistrer
        </Button>
      </div>

      <div className='grid gap-4 xl:grid-cols-[1fr_360px]'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Identite entreprise</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <label className='block text-sm font-medium' htmlFor='company-name'>
              Nom de l'entreprise
              <Input
                id='company-name'
                className='mt-1'
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder='Nom commercial'
              />
            </label>
            <label className='block text-sm font-medium' htmlFor='company-logo'>
              URL du logo
              <Input
                id='company-logo'
                className='mt-1'
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder='https://.../logo.png'
              />
            </label>
            <label className='block text-sm font-medium' htmlFor='company-favicon'>
              URL du favicon
              <Input
                id='company-favicon'
                className='mt-1'
                value={faviconUrl}
                onChange={(event) => setFaviconUrl(event.target.value)}
                placeholder='https://.../favicon.ico'
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Apercu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='rounded-lg border bg-zinc-950 p-4 text-white'>
              <div className='flex items-center gap-3'>
                <span className='flex size-12 items-center justify-center overflow-hidden rounded-md bg-white text-xs font-bold text-zinc-950'>
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt={companyName}
                      width={48}
                      height={48}
                      className='size-12 object-contain'
                      unoptimized
                    />
                  ) : (
                    'ADM'
                  )}
                </span>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-semibold'>{companyName || 'Portail Client'}</p>
                  <p className='text-xs text-zinc-400'>Pilotage interne</p>
                </div>
              </div>
            </div>
            <p className='text-muted-foreground mt-3 text-xs'>
              Le titre et le favicon sont pris en compte au prochain chargement complet de la page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
