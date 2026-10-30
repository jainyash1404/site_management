import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, HardHat } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api';
import { Button, Card, Field, input } from '../components/ui';

export default function LoginPage() {
  const { user, login } = useAuth();
  const [phone, setPhone] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [show, setShow] = useState(false);
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/worker'} replace />;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    if (!/^\d{10}$/.test(phone)) return setError('Enter a 10-digit phone number');
    if (!password) return setError('Enter your password');
    setBusy(true); setError('');
    try { await login(phone, password); } catch (x) { setError(errMsg(x)); } finally { setBusy(false); }
  };
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><Card className="w-full max-w-sm">
    <div className="mb-5 text-center"><span className="inline-flex rounded-2xl bg-blue-600 p-3 text-white"><HardHat className="h-7 w-7" /></span>
      <h1 className="mt-3 text-xl font-semibold">Construction Manager</h1><p className="text-sm text-slate-500">Sign in to manage funds and expenses</p></div>
    <form onSubmit={submit} noValidate className="space-y-3">
      <Field label="Phone number"><input className={input} type="tel" inputMode="numeric" autoComplete="username" autoFocus value={phone} onChange={e => setPhone(e.target.value)} /></Field>
      <Field label="Password"><div className="relative"><input className={input + ' pr-10'} type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <div className="mt-4 flex justify-between text-sm"><Link to="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</Link><Link to="/signup" className="text-blue-600 hover:underline">Create an account</Link></div>
    <Link to="/" className="mt-3 block text-center text-xs text-slate-500 hover:underline">← Back to home</Link></Card></div>;
}
