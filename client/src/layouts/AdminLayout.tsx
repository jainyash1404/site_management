import { Banknote, FolderTree, Home, MapPin, Receipt, Users } from 'lucide-react';
import Shell from '../components/Shell';
export default function AdminLayout() {
  return <Shell links={[
    { to: '/admin', label: 'Dashboard', icon: Home, end: true }, { to: '/admin/workers', label: 'Workers', icon: Users },
    { to: '/admin/sites', label: 'Sites', icon: MapPin }, { to: '/admin/funds', label: 'Funds', icon: Banknote },
    { to: '/admin/expenses', label: 'Expenses', icon: Receipt }, { to: '/admin/categories', label: 'Categories', icon: FolderTree }]} />;
}
