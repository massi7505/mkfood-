import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function requirePortalAuth(callbackUrl = '/dashboard') {
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return session;
}
