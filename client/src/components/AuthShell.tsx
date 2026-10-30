import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { HardHat } from 'lucide-react';
import { Card } from './ui';
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><Card className="w-full max-w-sm">
    <div className="mb-5 text-center"><span className="inline-flex rounded-2xl bg-blue-600 p-3 text-white"><HardHat className="h-7 w-7" /></span>
      <h1 className="mt-3 text-xl font-semibold">{title}</h1>{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}</div>
    {children}</Card></div>;
}
