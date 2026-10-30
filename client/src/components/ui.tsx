import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Loader2, X, type LucideIcon } from 'lucide-react';
import type { ExpenseStatus } from '../types';

export const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';
export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) =>
  <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;

type BP = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'success' | 'ghost'; loading?: boolean };
export function Button({ variant = 'primary', loading, children, disabled, className = '', ...p }: BP) {
  const v = { primary: 'bg-blue-600 text-white hover:bg-blue-700', danger: 'bg-red-600 text-white hover:bg-red-700', success: 'bg-emerald-600 text-white hover:bg-emerald-700', ghost: 'border border-slate-300 bg-white hover:bg-slate-50' }[variant];
  return <button type="button" {...p} disabled={disabled || loading} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${v} ${className}`}>
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}{children}</button>;
}
export const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) =>
  <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span>{children}
    {error && <span role="alert" className="mt-1 block text-xs text-red-600">{error}</span>}</label>;

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [onClose]);
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
      <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">{title}</h3>
        <button aria-label="Close" onClick={onClose}><X className="h-5 w-5" /></button></div>{children}</div></div>;
}

export function Confirm({ title, message, confirmText, variant = 'primary', busy, onConfirm, onCancel, children }:
  { title: string; message: string; confirmText: string; variant?: 'primary' | 'danger' | 'success'; busy: boolean; onConfirm: () => void; onCancel: () => void; children?: ReactNode }) {
  return <Modal title={title} onClose={onCancel}><p className="text-sm text-slate-600">{message}</p><div className="mt-3">{children}</div>
    <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
      <Button variant={variant} loading={busy} onClick={onConfirm}>{confirmText}</Button></div></Modal>;
}

const sc: Record<ExpenseStatus, string> = { PENDING: 'bg-amber-100 text-amber-800', APPROVED: 'bg-emerald-100 text-emerald-800', REJECTED: 'bg-red-100 text-red-800' };
export const Badge = ({ status }: { status: ExpenseStatus }) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sc[status]}`}>{status[0] + status.slice(1).toLowerCase()}</span>;
export const ActiveBadge = ({ on }: { on: boolean }) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${on ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{on ? 'Active' : 'Inactive'}</span>;

export function Async({ loading, error, onRetry, empty, children }: { loading: boolean; error: string; onRetry: () => void; empty?: string | false | null; children: ReactNode }) {
  if (loading) return <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Loading"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-slate-200" />)}</div><div className="h-48 rounded-xl bg-slate-200" /></div>;
  if (error) return <Card className="flex flex-col items-center gap-2 text-center"><AlertCircle className="h-6 w-6 text-red-600" /><p className="text-sm">{error}</p><Button variant="ghost" onClick={onRetry}>Retry</Button></Card>;
  if (empty) return <Card className="text-center text-sm text-slate-500">{empty}</Card>;
  return <>{children}</>;
}
export const Stat = ({ title, value, tone = '', icon: Icon }: { title: string; value: ReactNode; tone?: string; icon?: LucideIcon }) =>
  <Card className="flex items-start justify-between gap-2"><div><div className="text-xs text-slate-500">{title}</div><div className={`mt-1 text-xl font-semibold ${tone}`}>{value}</div></div>
    {Icon && <span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Icon className="h-4 w-4" /></span>}</Card>;
export const Table = ({ head, children }: { head: string[]; children: ReactNode }) =>
  <Card className="overflow-x-auto p-0"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{head.map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 [&_tr:hover]:bg-slate-50">{children}</tbody></table></Card>;
export const Td = ({ children, className = '' }: { children?: ReactNode; className?: string }) => <td className={`px-4 py-3 ${className}`}>{children}</td>;

export function ReceiptButton({ url }: { url?: string }) {
  const [open, setOpen] = useState(false);
  if (!url) return <span className="text-xs text-slate-400">No receipt</span>;
  return <><Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => setOpen(true)}>View Receipt</Button>
    {open && <Modal title="Receipt" onClose={() => setOpen(false)}><img src={url} alt="Receipt" className="w-full rounded-lg" />
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-blue-600 underline">Open in new tab</a></Modal>}</>;
}
