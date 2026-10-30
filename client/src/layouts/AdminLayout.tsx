import {
  Banknote,
  FolderTree,
  Home,
  MapPin,
  Receipt,
  Users,
  ShieldCheck,
} from 'lucide-react';

import Shell from '../components/Shell';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const { hasPermission, isSuperAdmin } = useAuth();

  const links = [
    ...(hasPermission('dashboard.view')
      ? [{ to: '/admin', label: 'Dashboard', icon: Home, end: true }]
      : []),

    ...(hasPermission('workers.view')
      ? [{ to: '/admin/workers', label: 'Workers', icon: Users }]
      : []),

    ...(hasPermission('sites.view')
      ? [{ to: '/admin/sites', label: 'Sites', icon: MapPin }]
      : []),

    ...(hasPermission('funds.view')
      ? [{ to: '/admin/funds', label: 'Funds', icon: Banknote }]
      : []),

    ...(hasPermission('expenses.view')
      ? [{ to: '/admin/expenses', label: 'Expenses', icon: Receipt }]
      : []),

    ...(hasPermission('categories.view')
      ? [{ to: '/admin/categories', label: 'Categories', icon: FolderTree }]
      : []),

    ...(isSuperAdmin
      ? [{ to: '/admin/admins', label: 'Admin Management', icon: ShieldCheck }]
      : []),
  ];

  return <Shell links={links} />;
}