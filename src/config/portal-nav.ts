import {
  AlertTriangle,
  FileText,
  History,
  Home,
  Package,
  User,
  ShoppingBag,
  type LucideIcon
} from 'lucide-react';

export interface PortalNavItem {
  badge?: () => number;
  icon: LucideIcon;
  href: string;
  label: string;
}

export const portalNav: PortalNavItem[] = [
  {
    icon: Home,
    href: '/dashboard',
    label: 'Tableau de bord'
  },
  {
    icon: ShoppingBag,
    href: '/store',
    label: 'Catalogue'
  },
  {
    icon: User,
    href: '/account',
    label: 'Mon compte'
  },
  {
    icon: Package,
    href: '/orders',
    label: 'Mes commandes'
  },
  {
    icon: FileText,
    href: '/invoices',
    label: 'Mes factures'
  },
  {
    icon: AlertTriangle,
    href: '/reminders',
    label: 'Relances',
    badge: () => 0
  },
  {
    icon: History,
    href: '/history',
    label: 'Historique'
  }
];
