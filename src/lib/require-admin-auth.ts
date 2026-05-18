import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function requireAdminAuth(callbackUrl = '/admin') {
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return session;
}
