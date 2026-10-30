import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  HardHat,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Wallet,
  Building2,
  Users,
  UserPlus,
} from 'lucide-react';

import { E, errMsg, http } from '../api';

export default function SignupPage() {
  const [v, setV] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirm: '',
  });

  const [errs, setErrs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (k: string) => (
    e: { target: { value: string } }
  ) => {
    setV((prev) => ({ ...prev, [k]: e.target.value }));
    setErrs((prev) => ({ ...prev, [k]: '' }));
    setError('');
  };

  const passwordStrength = (() => {
    if (!v.password) return 0;

    let score = 0;

    if (v.password.length >= 6) score++;
    if (v.password.length >= 8) score++;
    if (/[A-Z]/.test(v.password)) score++;
    if (/[0-9]/.test(v.password)) score++;
    if (/[^A-Za-z0-9]/.test(v.password)) score++;

    return Math.min(score, 4);
  })();

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (busy) return;

    const er: Record<string, string> = {};

    if (v.name.trim().length < 2) {
      er.name = 'Enter your full name';
    }

    if (!/^\d{10}$/.test(v.phone)) {
      er.phone = 'Enter a valid 10-digit phone number';
    }

    if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) {
      er.email = 'Enter a valid email address';
    }

    if (v.password.length < 6) {
      er.password = 'Password must be at least 6 characters';
    }

    if (v.password !== v.confirm) {
      er.confirm = 'Passwords do not match';
    }

    setErrs(er);
    setError('');

    if (Object.keys(er).length > 0) return;

    setBusy(true);

    try {
      const response = await http.post(E.signup, {
        name: v.name.trim(),
        phone: v.phone,
        email: v.email.trim(),
        password: v.password,
      });

      setDone(response.data.message);
    } catch (x) {
      setError(errMsg(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 sm:px-6">

      {/* BACKGROUND */}
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

          {/* BRAND CONTENT */}
          <div className="relative my-12">

            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-blue-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Start managing smarter
            </span>

            <h1 className="mt-7 text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
              One platform.
              <br />
              Complete control.
              <br />
              <span className="text-blue-400">
                Better construction.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-sm leading-7 text-blue-100/70">
              Create your account and bring your workers, funds,
              construction expenses and approvals together in one place.
            </p>

            {/* BENEFITS */}
            <div className="mt-10 space-y-5">

              {[
                {
                  icon: Wallet,
                  title: 'Complete fund tracking',
                  text: 'Keep track of every rupee allocated to workers.',
                },
                {
                  icon: Users,
                  title: 'Worker management',
                  text: 'Manage your workforce from one workspace.',
                },
                {
                  icon: Building2,
                  title: 'Multiple site management',
                  text: 'Organise expenses across different sites.',
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

          {/* PANEL FOOTER */}
          <div className="relative flex items-center gap-2 text-xs text-blue-100/50">
            <CheckCircle2 size={15} className="text-emerald-400" />
            Simple, secure and built for your workflow.
          </div>

        </div>

        {/* RIGHT FORM PANEL */}
        <div className="flex flex-col justify-center px-6 py-9 sm:px-12 lg:px-14">

          {/* MOBILE BRAND */}
          <div className="mb-7 text-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <HardHat size={27} />
              </div>

              <span className="text-lg font-extrabold tracking-tight">
                Construction<span className="text-blue-600">Manager</span>
              </span>
            </Link>
          </div>

          {/* FORM HEADER */}
          <div className="mb-6">

            <div className="mb-5 hidden h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 lg:flex">
              <UserPlus size={23} />
            </div>

            <span className="text-xs font-bold uppercase tracking-[2px] text-blue-600">
              Get Started
            </span>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
              Create your account
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Join Construction Manager and manage your work smarter.
            </p>
          </div>

          {/* APPROVAL NOTICE */}
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5">

            <ShieldCheck
              size={19}
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <p className="text-xs leading-5 text-slate-600">
              Your account will become active after the owner approves
              your registration request.
            </p>

          </div>

          {/* SUCCESS MESSAGE */}
          {done ? (
            <div className="py-5 text-center">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={42} />
              </div>

              <h2 className="mt-6 text-2xl font-extrabold text-slate-900">
                You're almost there!
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                {done}
              </p>

              <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  Approval pending
                </p>

                <p className="mt-2 text-xs leading-6 text-slate-600">
                  The owner must approve your account before you can log in.
                </p>
              </div>

              <Link
                to="/login"
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Go to Login
                <ArrowRight size={17} />
              </Link>

            </div>
          ) : (

            /* SIGNUP FORM */
            <form onSubmit={submit} noValidate className="space-y-4">

              {/* NAME */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full name *
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={v.name}
                    onChange={set('name')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {errs.name && (
                  <p className="mt-1 text-xs text-red-600">{errs.name}</p>
                )}
              </div>

              {/* PHONE */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Phone number *
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
                    autoComplete="tel"
                    placeholder="10-digit mobile number"
                    value={v.phone}
                    onChange={(e) => {
                      setV((prev) => ({
                        ...prev,
                        phone: e.target.value.replace(/\D/g, ''),
                      }));
                      setErrs((prev) => ({ ...prev, phone: '' }));
                      setError('');
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {errs.phone && (
                  <p className="mt-1 text-xs text-red-600">{errs.phone}</p>
                )}
              </div>

              {/* EMAIL */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email address (optional)
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={v.email}
                    onChange={set('email')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {errs.email && (
                  <p className="mt-1 text-xs text-red-600">{errs.email}</p>
                )}

                <p className="mt-1.5 text-[11px] text-slate-400">
                  Used for password recovery.
                </p>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password *
                </label>

                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    value={v.password}
                    onChange={set('password')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {v.password && (
                  <div className="mt-2">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition ${
                            passwordStrength >= level
                              ? passwordStrength === 1
                                ? 'bg-red-500'
                                : passwordStrength === 2
                                  ? 'bg-orange-500'
                                  : passwordStrength === 3
                                    ? 'bg-blue-500'
                                    : 'bg-emerald-500'
                              : 'bg-slate-100'
                          }`}
                        />
                      ))}
                    </div>

                    <p className="mt-1 text-right text-[10px] text-slate-400">
                      Password strength: {strengthLabels[passwordStrength]}
                    </p>
                  </div>
                )}

                {errs.password && (
                  <p className="mt-1 text-xs text-red-600">{errs.password}</p>
                )}
              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Confirm password *
                </label>

                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={v.confirm}
                    onChange={set('confirm')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-600"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {errs.confirm && (
                  <p className="mt-1 text-xs text-red-600">{errs.confirm}</p>
                )}

                {v.confirm && v.confirm === v.password && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <CheckCircle2 size={13} />
                    Passwords match
                  </p>
                )}
              </div>

              {/* API ERROR */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
                >
                  {error}
                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={busy}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Creating your account...' : 'Create Account'}

                {!busy && (
                  <ArrowRight
                    size={18}
                    className="transition group-hover:translate-x-1"
                  />
                )}
              </button>

            </form>
          )}

          {/* LOGIN LINK */}
          <div className="mt-7 border-t border-slate-100 pt-6 text-center">

            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
              >
                Log in
              </Link>
            </p>
            <Link
  to="/"
  className="mt-5 inline-block text-xs font-medium text-slate-400 transition hover:text-blue-600"
>
  ← Back to home
</Link>

            {!done && (
              <p className="mt-5 flex items-center justify-center gap-2 text-[10px] text-slate-400">
                <ShieldCheck size={14} />
                Your information is securely handled.
              </p>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}