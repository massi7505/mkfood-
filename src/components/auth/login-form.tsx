'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
  password: z.string().min(8, '8 caracteres minimum')
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<LoginValues>({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    const parsed = loginSchema.safeParse(values);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'email' || field === 'password') {
          setError(field, { message: issue.message });
        }
      }
      return;
    }

    const result = await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false
    });

    if (!result?.ok) {
      setFormError(
        result?.error === 'CredentialsSignin'
          ? 'Identifiants incorrects'
          : 'Connexion indisponible. Verifiez la base de donnees et la configuration.'
      );
      return;
    }

    router.push(searchParams.get('callbackUrl') ?? '/dashboard');
    router.refresh();
  }

  return (
    <Card className='w-full border-zinc-800 bg-zinc-900/80 text-zinc-50 shadow-2xl'>
      <CardHeader className='space-y-3'>
        <div className='flex items-center gap-3'>
          <div className='flex size-10 items-center justify-center rounded-md bg-blue-600 font-semibold text-white'>
            B2B
          </div>
          <div>
            <CardTitle className='text-xl'>Portail Client</CardTitle>
            <CardDescription className='text-zinc-400'>
              Connexion a votre espace professionnel
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form className='space-y-4' onSubmit={handleSubmit(onSubmit)}>
          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              type='email'
              autoComplete='email'
              className='border-zinc-700 bg-zinc-950'
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && <p className='text-sm text-red-400'>{errors.email.message}</p>}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='password'>Mot de passe</Label>
            <Input
              id='password'
              type='password'
              autoComplete='current-password'
              className='border-zinc-700 bg-zinc-950'
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && <p className='text-sm text-red-400'>{errors.password.message}</p>}
          </div>

          {formError && <p className='text-sm text-red-400'>{formError}</p>}

          <Button
            type='submit'
            className='w-full bg-blue-600 hover:bg-blue-700'
            isLoading={isSubmitting}
          >
            Se connecter
          </Button>

          <div className='flex items-center justify-between text-sm'>
            <span className='text-zinc-500'>Mot de passe oublie</span>
            <Link className='text-blue-400 hover:text-blue-300' href='/register'>
              Creer un compte
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
