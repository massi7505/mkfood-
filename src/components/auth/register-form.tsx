'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Nom requis'),
    companyName: z.string().min(2, 'Nom commercial requis'),
    siret: z.string().regex(/^\d{14}$/, 'Le SIRET doit contenir 14 chiffres'),
    address: z.string().min(5, 'Adresse requise'),
    phone: z.string().min(8, 'Telephone requis'),
    mobile: z.string().optional(),
    email: z.string().email('Email invalide'),
    password: z.string().min(8, '8 caracteres minimum'),
    confirmPassword: z.string().min(8, '8 caracteres minimum'),
    clientCode: z.string().optional()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword']
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<RegisterValues>({
    defaultValues: {
      name: '',
      companyName: '',
      siret: '',
      address: '',
      phone: '',
      mobile: '',
      email: '',
      password: '',
      confirmPassword: '',
      clientCode: ''
    }
  });

  async function onSubmit(values: RegisterValues) {
    setMessage(null);
    setFormError(null);
    const parsed = registerSchema.safeParse(values);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          field === 'name' ||
          field === 'companyName' ||
          field === 'siret' ||
          field === 'address' ||
          field === 'phone' ||
          field === 'mobile' ||
          field === 'email' ||
          field === 'password' ||
          field === 'confirmPassword' ||
          field === 'clientCode'
        ) {
          setError(field, { message: issue.message });
        }
      }
      return;
    }

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data)
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setFormError(payload?.error ?? 'Inscription impossible');
      return;
    }

    const payload = (await response.json().catch(() => null)) as { linked?: boolean } | null;
    setMessage(
      payload?.linked
        ? 'Compte cree et rattache a votre fiche client. Vous pouvez vous connecter.'
        : 'Compte cree. Il sera rattache automatiquement apres validation dans Dolibarr.'
    );
    setTimeout(() => router.push('/login'), 900);
  }

  return (
    <Card className='w-full border-zinc-800 bg-zinc-900/80 text-zinc-50 shadow-2xl'>
      <CardHeader className='space-y-3'>
        <div className='flex items-center gap-3'>
          <div className='flex size-10 items-center justify-center rounded-md bg-blue-600 font-semibold text-white'>
            B2B
          </div>
          <div>
            <CardTitle className='text-xl'>Creer un compte</CardTitle>
            <CardDescription className='text-zinc-400'>
              Votre compte sera rattache automatiquement a votre fiche client Dolibarr
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form className='space-y-4' onSubmit={handleSubmit(onSubmit)}>
          <div className='space-y-2'>
            <Label htmlFor='name'>Nom</Label>
            <Input id='name' className='border-zinc-700 bg-zinc-950' {...register('name')} />
            {errors.name && <p className='text-sm text-red-400'>{errors.name.message}</p>}
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='companyName'>Nom commercial</Label>
              <Input
                id='companyName'
                className='border-zinc-700 bg-zinc-950'
                {...register('companyName')}
              />
              {errors.companyName && (
                <p className='text-sm text-red-400'>{errors.companyName.message}</p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='siret'>Numero SIRET</Label>
              <Input
                id='siret'
                inputMode='numeric'
                className='border-zinc-700 bg-zinc-950'
                {...register('siret')}
              />
              {errors.siret && <p className='text-sm text-red-400'>{errors.siret.message}</p>}
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='address'>Adresse</Label>
            <Input id='address' className='border-zinc-700 bg-zinc-950' {...register('address')} />
            {errors.address && <p className='text-sm text-red-400'>{errors.address.message}</p>}
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='phone'>Telephone</Label>
              <Input
                id='phone'
                type='tel'
                className='border-zinc-700 bg-zinc-950'
                {...register('phone')}
              />
              {errors.phone && <p className='text-sm text-red-400'>{errors.phone.message}</p>}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='mobile'>Mobile</Label>
              <Input
                id='mobile'
                type='tel'
                className='border-zinc-700 bg-zinc-950'
                placeholder='Optionnel'
                {...register('mobile')}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              type='email'
              className='border-zinc-700 bg-zinc-950'
              {...register('email')}
            />
            {errors.email && <p className='text-sm text-red-400'>{errors.email.message}</p>}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='clientCode'>Code client</Label>
            <Input
              id='clientCode'
              className='border-zinc-700 bg-zinc-950'
              placeholder='Optionnel'
              {...register('clientCode')}
            />
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='password'>Mot de passe</Label>
              <Input
                id='password'
                type='password'
                className='border-zinc-700 bg-zinc-950'
                {...register('password')}
              />
              {errors.password && <p className='text-sm text-red-400'>{errors.password.message}</p>}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='confirmPassword'>Confirmation</Label>
              <Input
                id='confirmPassword'
                type='password'
                className='border-zinc-700 bg-zinc-950'
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className='text-sm text-red-400'>{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {formError && <p className='text-sm text-red-400'>{formError}</p>}
          {message && <p className='text-sm text-green-400'>{message}</p>}

          <Button
            type='submit'
            className='w-full bg-blue-600 hover:bg-blue-700'
            isLoading={isSubmitting}
          >
            S'inscrire
          </Button>

          <div className='text-center text-sm text-zinc-400'>
            Deja un compte ?{' '}
            <Link className='text-blue-400 hover:text-blue-300' href='/login'>
              Connexion
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
