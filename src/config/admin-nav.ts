import { Icons, type Icon } from '@/components/icons';

export interface AdminNavItem {
  icon: Icon;
  href: string;
  label: string;
}

export const adminNav: AdminNavItem[] = [
  {
    icon: Icons.dashboard,
    href: '/admin',
    label: 'Admin'
  },
  {
    icon: Icons.forms,
    href: '/admin/orders',
    label: 'Commandes'
  },
  {
    icon: Icons.post,
    href: '/admin/invoices',
    label: 'Facturation'
  },
  {
    icon: Icons.product,
    href: '/admin/products',
    label: 'Produits'
  },
  {
    icon: Icons.billing,
    href: '/admin/accounting',
    label: 'Comptabilite'
  },
  {
    icon: Icons.teams,
    href: '/admin/users',
    label: 'Utilisateurs'
  },
  {
    icon: Icons.truckDelivery,
    href: '/admin/delivery',
    label: 'Livreurs'
  },
  {
    icon: Icons.homeCog,
    href: '/admin/settings',
    label: 'Parametres'
  }
];
