import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { E, errMsg, http } from '../api';
import { Field, input } from '../components/ui';

export default function ResetPasswordPage() {
  const token = useSearchParams()[0].get('token') ?? '';
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [done, setDone] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    if (pw.length < 6) return setError('Password must be at least 6 characters');
    if (pw !== pw2) return setError('Passwords do not match');
    setBusy(true); setError('');
    try { await http.post(E.reset, { token, password: pw }); setDone(true); } catch (x) { setError(errMsg(x)); } finally { setBusy(false); }
  };
  if (!token) return <AuthShell title="Invalid link"><p className="text-center text-sm">This reset link is incomplete. <Link to="/forgot-password" className="text-blue-600 underline">Request a new one</Link>.</p></AuthShell>;
  if (done) return <AuthShell title="Password updated"><p className="mb-3 text-center text-sm text-slate-600">You can now log in with your new password.</p><Link to="/login" className="block rounded-lg bg-blue-600 py-2 text-center text-sm font-medium text-white">Go to login</Link></AuthShell>;
  return <AuthShell title="Set a new password">
    <form onSubmit={submit} noValidate className="space-y-3">
      <Field label="New password"><input className={input} type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></Field>
      <Field label="Confirm new password"><input className={input} type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} /></Field>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Saving…' : 'Update password'}</button></form></AuthShell>;
}
