import { LoginForm } from '@/components/auth/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion | Portail Client',
  robots: { index: false, follow: false }
};

export default function LoginPage() {
  return <LoginForm />;
}
