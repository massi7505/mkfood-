import {
  BadgeEuro,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  Truck,
  Users,
  type LucideIcon
} from 'lucide-react';

export interface AdminNavItem {
  icon: LucideIcon;
  href: string;
  label: string;
}

export const adminNav: AdminNavItem[] = [
  {
    icon: LayoutDashboard,
    href: '/admin',
    label: 'Admin'
  },
  {
    icon: ClipboardList,
    href: '/admin/orders',
    label: 'Commandes'
  },
  {
    icon: FileText,
    href: '/admin/invoices',
    label: 'Facturation'
  },
  {
    icon: Package,
    href: '/admin/products',
    label: 'Produits'
  },
  {
    icon: BadgeEuro,
    href: '/admin/accounting',
    label: 'Comptabilite'
  },
  {
    icon: Users,
    href: '/admin/users',
    label: 'Utilisateurs'
  },
  {
    icon: Truck,
    href: '/admin/delivery',
    label: 'Livreurs'
  }
];
