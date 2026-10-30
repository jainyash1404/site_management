import { useState, type FormEvent, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { E, errMsg, list, send } from '../api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { ActiveBadge, Async, Button, Field, Modal, Table, Td, input } from './ui';

export interface FieldDef { key: string; label: string; type?: 'text' | 'email' | 'tel' | 'password' | 'textarea'; required?: boolean; requiredOnCreate?: boolean; editLabel?: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = { id: string; isActive: boolean; [k: string]: any };
interface Props { title: string; noun: string; path: string; fields: FieldDef[]; columns: { label: string; render: (r: Row) => ReactNode }[]; statusMode: 'endpoint' | 'patch'; extraActions?: (r: Row) => ReactNode }

export default function EntityPage({ title, noun, path, fields, columns, statusMode, extraActions }: Props) {
  const toast = useToast();
  const { data, error, loading, reload } = useApi(() => list<Row>(path), [path]);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');

  const open = (r: Row | 'new') => { setEditing(r); setErrs({}); setVals(r === 'new' ? {} : Object.fromEntries(fields.map(f => [f.key, String(r[f.key] ?? '')]))); };
  const visible = fields;

  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (saving) return;
    const er: Record<string, string> = {};
    for (const f of visible) {
      const v = (vals[f.key] ?? '').trim();
      if ((f.required || (f.requiredOnCreate && editing === 'new')) && !v) er[f.key] = `${f.label} is required`;
      else if (f.type === 'tel' && v && !/^\d{10}$/.test(v)) er[f.key] = 'Enter a 10-digit phone number';
      else if (f.type === 'email' && v && !/^\S+@\S+\.\S+$/.test(v)) er[f.key] = 'Enter a valid email';
      else if (f.type === 'password' && v && v.length < 6) er[f.key] = 'At least 6 characters';
    }
    setErrs(er); if (Object.keys(er).length) return;
    const body = Object.fromEntries(visible.map(f => [f.key, (vals[f.key] ?? '').trim()]).filter(([, v]) => v !== ''));
    setSaving(true);
    try {
      if (editing === 'new') await send('post', path, body); else await send('patch', `${path}/${(editing as Row).id}`, body);
      toast(`${noun} saved`); setEditing(null); reload();
    } catch (x) { toast(errMsg(x), 'err'); } finally { setSaving(false); }
  };

  const toggle = async (r: Row) => {
    if (busyId) return; setBusyId(r.id);
    try {
      await send('patch', statusMode === 'endpoint' ? E.status(path, r.id) : `${path}/${r.id}`, { isActive: !r.isActive });
      toast(`${noun} ${r.isActive ? 'deactivated' : 'activated'}`); reload();
    } catch (x) { toast(errMsg(x), 'err'); } finally { setBusyId(''); }
  };

  return <div className="space-y-4">
    <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">{title}</h1>
      <Button onClick={() => open('new')}><Plus className="h-4 w-4" />Add {noun}</Button></div>
    <Async loading={loading} error={error} onRetry={reload} empty={data && data.items.length === 0 && `No ${title.toLowerCase()} yet. Add the first one.`}>
      <Table head={[...columns.map(c => c.label), 'Status', 'Actions']}>
        {data?.items.map(r => <tr key={r.id}>{columns.map(c => <Td key={c.label}>{c.render(r)}</Td>)}
          <Td><ActiveBadge on={r.isActive} /></Td>
          <Td><div className="flex gap-2"><Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => open(r)}>Edit</Button>
            <Button variant="ghost" className="!px-2 !py-1 text-xs" loading={busyId === r.id} onClick={() => toggle(r)}>{r.isActive ? 'Deactivate' : 'Activate'}</Button>{extraActions?.(r)}</div></Td></tr>)}
      </Table></Async>
    {editing && <Modal title={editing === 'new' ? `Add ${noun}` : `Edit ${noun}`} onClose={() => !saving && setEditing(null)}>
      <form onSubmit={submit} noValidate className="space-y-3">
        {visible.map(f => <Field key={f.key} label={(editing !== 'new' && f.editLabel ? f.editLabel : f.label) + (f.required || (f.requiredOnCreate && editing === 'new') ? ' *' : '')} error={errs[f.key]}>
          {f.type === 'textarea' ? <textarea className={input} rows={3} value={vals[f.key] ?? ''} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} />
            : <input className={input} type={f.type ?? 'text'} value={vals[f.key] ?? ''} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} />}</Field>)}
        <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
          <button type="submit" disabled={saving} className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button></div>
      </form></Modal>}
  </div>;
}
