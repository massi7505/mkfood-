import { StoreClient } from '@/components/store/store-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Catalogue | Portail Client',
  robots: { index: false, follow: false }
};

export default function StorePage() {
  return <StoreClient />;
}
