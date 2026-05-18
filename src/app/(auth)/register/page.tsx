import { RegisterForm } from '@/components/auth/register-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inscription | Portail Client',
  robots: { index: false, follow: false }
};

export default function RegisterPage() {
  return <RegisterForm />;
}
