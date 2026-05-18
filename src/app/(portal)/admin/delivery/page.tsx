import { AdminModulePage } from '@/components/admin/admin-module-page';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { Truck } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin livreurs | Portail Client',
  robots: { index: false, follow: false }
};

export default async function AdminDeliveryPage() {
  await requireAdminAuth('/admin/delivery');

  return (
    <AdminModulePage
      title='Espace livreur'
      description='Base future pour affecter les tournees, suivre les livraisons et confirmer les receptions.'
      icon={Truck}
      metrics={[
        { label: 'Tournees', value: '-', detail: 'Planification future' },
        { label: 'A livrer', value: '-', detail: 'Commandes assignees' },
        { label: 'Livreurs', value: '-', detail: 'Comptes transport' },
        { label: 'Preuves', value: '-', detail: 'Signature ou photo' }
      ]}
      actions={[
        { label: 'Affecter une commande a un livreur', status: 'Planifie' },
        { label: 'Suivre une tournee', status: 'Planifie' },
        { label: 'Confirmer une livraison', status: 'Planifie' },
        { label: 'Declarer un incident', status: 'Planifie' }
      ]}
    />
  );
}
