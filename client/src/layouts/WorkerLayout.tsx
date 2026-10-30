import { Home } from 'lucide-react';
import Shell from '../components/Shell';
export default function WorkerLayout() { return <Shell links={[{ to: '/worker', label: 'My Dashboard', icon: Home, end: true }]} />; }
