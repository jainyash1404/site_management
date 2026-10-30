import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  HardHat,
  Phone,
  Lock,
  ArrowRight,
  ShieldCheck,
  Wallet,
  CheckCircle2,
  Building2,
  TrendingUp,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api';

export default function LoginPage() {
  const { user, login } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  if (user) {
    return (
      <Navigate
        to={user.role === 'ADMIN' ? '/admin' : '/worker'}
        replace
      />
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (busy) return;

    if (!/^\d{10}$/.test(phone)) {
      return setError('Enter a valid 10-digit phone number');
    }

    if (!password) {
      return setError('Enter your password');
    }

    setBusy(true);
    setError('');

    try {
      await login(phone, password);
    } catch (x) {
      setError(errMsg(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 sm:px-6">

      {/* BACKGROUND DECORATION */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-100/60 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-slate-200/70 blur-[100px]" />

      {/* MAIN CONTAINER */}
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.08)] lg:grid-cols-2">

        {/* LEFT BRANDING PANEL */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">

          <div className="absolute -right-32 -top-20 h-96 w-96 rounded-full bg-blue-500/20 blur-[100px]" />
          <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px]" />

          {/* BRAND */}
          <div className="relative">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30">
                <HardHat size={27} />
              </div>

              <div>
                <p className="text-lg font-extrabold tracking-tight">
                  Construction<span className="text-blue-400">Manager</span>
                </p>

                <p className="text-[9px] font-semibold uppercase tracking-[2px] text-blue-200/60">
                  Built for better management
                </p>
              </div>
            </Link>
          </div>

          {/* CONTENT */}
          <div className="relative my-12">

            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-blue-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Your business, better managed
            </span>

            <h1 className="mt-7 text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
              Manage your
              <br />
              construction business
              <br />
              <span className="text-blue-400">with confidence.</span>
            </h1>

            <p className="mt-6 max-w-md text-sm leading-7 text-blue-100/70">
              Keep track of worker funds, construction expenses,
              bills and approvals — all from one organised workspace.
            </p>

            {/* HIGHLIGHTS */}
            <div className="mt-10 space-y-5">

              {[
                {
                  icon: Wallet,
                  title: 'Complete fund tracking',
                  text: 'Know where every rupee goes.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Secure expense management',
                  text: 'Keep your financial records protected.',
                },
                {
                  icon: Building2,
                  title: 'Multiple site management',
                  text: 'Manage workers across different sites.',
                },
              ].map((item) => (
                <div key={item.title} className="flex items-center gap-4">
                  <div className="rounded-xl border border-white/10 bg-white/10 p-3 text-blue-300">
                    <item.icon size={21} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-blue-100/60">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}

            </div>
          </div>

          {/* FOOTER */}
          <div className="relative flex items-center gap-2 text-xs text-blue-100/50">
            <CheckCircle2 size={15} className="text-emerald-400" />
            Simple, secure and built for your workflow.
          </div>
        </div>

        {/* RIGHT LOGIN PANEL */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14">

          {/* MOBILE BRAND */}
          <div className="mb-8 text-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <HardHat size={27} />
              </div>

              <span className="text-lg font-extrabold tracking-tight">
                Construction<span className="text-blue-600">Manager</span>
              </span>
            </Link>
          </div>

          {/* FORM HEADING */}
          <div className="mb-8">

            <div className="mb-5 hidden h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 lg:flex">
              <Lock size={23} />
            </div>

            <span className="text-xs font-bold uppercase tracking-[2px] text-blue-600">
              Welcome Back
            </span>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
              Sign in to your account
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Enter your registered phone number and password
              to access your workspace.
            </p>
          </div>

          {/* LOGIN FORM */}
          <form onSubmit={submit} noValidate className="space-y-5">

            {/* PHONE */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Phone number
              </label>

              <div className="relative">
                <Phone
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="username"
                  autoFocus
                  placeholder="Enter your 10-digit number"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, ''));
                    setError('');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700">
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />

                <button
                  type="button"
                  aria-label={show ? 'Hide password' : 'Show password'}
                  onClick={() => setShow(!show)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-600"
                >
                  {show ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </div>
            )}

            {/* SIGN IN BUTTON */}
            <button
              type="submit"
              disabled={busy}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Signing in...' : 'Sign In'}

              {!busy && (
                <ArrowRight
                  size={18}
                  className="transition group-hover:translate-x-1"
                />
              )}
            </button>

          </form>

          {/* DIVIDER */}
          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              New here?
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          {/* SIGNUP */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-center">
            <p className="text-sm font-semibold text-slate-800">
              Don't have an account yet?
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Create an account to get started.
            </p>

            <Link
              to="/signup"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white py-3 text-sm font-semibold text-blue-600 transition hover:border-blue-500 hover:bg-blue-50"
            >
              Create an account
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* HOME LINK */}
          <Link
            to="/"
            className="mt-7 text-center text-xs font-medium text-slate-400 transition hover:text-blue-600"
          >
            ← Back to home
          </Link>

          {/* SECURITY */}
          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-400">
            <ShieldCheck size={14} />
            Your account and financial records are protected.
          </div>

        </div>
      </div>
    </div>
  );
}