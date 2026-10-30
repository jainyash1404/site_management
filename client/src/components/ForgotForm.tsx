import { useState, type FormEvent } from 'react';
import { E, errMsg, http } from '../api';
import { Field, input } from './ui';

export default function ForgotForm() {
  const [phone, setPhone] = useState(''); const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(''); const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    if (!/^\d{10}$/.test(phone)) return setError('Enter your 10-digit phone number');
    setBusy(true); setError(''); setMsg('');
    try { setMsg((await http.post(E.forgot, { phone })).data.message); } catch (x) { setError(errMsg(x)); } finally { setBusy(false); }
  };
  return <form onSubmit={submit} noValidate className="space-y-3 text-left">
    <Field label="Registered phone number"><input className={input} type="tel" inputMode="numeric" autoComplete="username" value={phone} onChange={e => setPhone(e.target.value)} /></Field>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {msg && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}
    <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Sending…' : 'Send reset link'}</button></form>;
}
