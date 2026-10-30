import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { E, errMsg, http } from '../api';
import { Field, input } from '../components/ui';

export default function SignupPage() {
  const [v, setV] = useState({ name: '', phone: '', email: '', password: '', confirm: '' });
  const [errs, setErrs] = useState<Record<string, string>>({}); const [error, setError] = useState('');
  const [busy, setBusy] = useState(false); const [done, setDone] = useState('');
  const set = (k: string) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    const er: Record<string, string> = {};
    if (v.name.trim().length < 2) er.name = 'Enter your name';
    if (!/^\d{10}$/.test(v.phone)) er.phone = 'Enter a 10-digit phone number';
    if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) er.email = 'Enter a valid email';
    if (v.password.length < 6) er.password = 'At least 6 characters';
    if (v.password !== v.confirm) er.confirm = 'Passwords do not match';
    setErrs(er); setError(''); if (Object.keys(er).length) return;
    setBusy(true);
    try { setDone((await http.post(E.signup, { name: v.name.trim(), phone: v.phone, email: v.email.trim(), password: v.password })).data.message); } catch (x) { setError(errMsg(x)); } finally { setBusy(false); }
  };
  if (done) return <AuthShell title="Request sent"><p className="mb-4 rounded-lg bg-emerald-50 p-3 text-center text-sm text-emerald-800">{done}</p><Link to="/login" className="block rounded-lg bg-blue-600 py-2 text-center text-sm font-medium text-white">Go to login</Link></AuthShell>;
  return <AuthShell title="Create your account" subtitle="The owner must approve your account before you can log in.">
    <form onSubmit={submit} noValidate className="space-y-3">
      <Field label="Full name *" error={errs.name}><input className={input} autoComplete="name" value={v.name} onChange={set('name')} /></Field>
      <Field label="Phone number *" error={errs.phone}><input className={input} type="tel" inputMode="numeric" autoComplete="username" value={v.phone} onChange={set('phone')} /></Field>
      <Field label="Email (optional, for password reset)" error={errs.email}><input className={input} type="email" autoComplete="email" value={v.email} onChange={set('email')} /></Field>
      <Field label="Password *" error={errs.password}><input className={input} type="password" autoComplete="new-password" value={v.password} onChange={set('password')} /></Field>
      <Field label="Confirm password *" error={errs.confirm}><input className={input} type="password" autoComplete="new-password" value={v.confirm} onChange={set('confirm')} /></Field>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Creating…' : 'Sign up'}</button></form>
    <p className="mt-4 text-center text-sm text-slate-600">Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Log in</Link></p></AuthShell>;
}
