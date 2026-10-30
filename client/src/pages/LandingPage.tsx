import { Link } from 'react-router-dom';
import { Banknote, Camera, CheckCircle2, HardHat, Lock, MapPin, Search, ShieldCheck, Smartphone, Tags, Users } from 'lucide-react';
import ForgotForm from '../components/ForgotForm';

const features = [
  { icon: Banknote, title: 'Fund allocation', text: 'Give each worker an initial amount and top it up whenever needed. Every payment stays in the history.' },
  { icon: Camera, title: 'Bills & payment screenshots', text: 'Workers upload a photo of the bill or UPI screenshot with each expense, straight from their phone.' },
  { icon: CheckCircle2, title: 'Approve or reject', text: 'Review each expense with its receipt, add a note, and approve or reject. Nothing is deducted until you approve.' },
  { icon: Users, title: 'Worker-wise balances', text: 'See what each worker was given, what is pending, what was spent, and what is left.' },
  { icon: MapPin, title: 'Construction sites', text: 'Create sites and record which site every expense belongs to.' },
  { icon: Tags, title: 'Expense categories', text: 'Cement, steel, labour, transport – keep your own list of categories.' },
  { icon: Search, title: 'Search & filters', text: 'Filter expenses by status, worker, site, category and date, or search by description.' },
  { icon: ShieldCheck, title: 'Separate access for each role', text: 'Workers see only their own money and expenses. Only the owner or admins can manage funds and approvals.' },
  { icon: Lock, title: 'Private receipts', text: 'Receipt images are not public. They open only through short-lived secure links.' },
];
const steps = [
  ['1', 'Owner gives funds', 'Add the amount you handed to a worker.'],
  ['2', 'Worker adds the expense', 'Amount, site, category and a photo of the bill.'],
  ['3', 'Owner approves', 'The approved amount is deducted from that worker’s balance automatically.'],
];

export default function LandingPage() {
  return <div className="min-h-screen bg-white text-slate-900">
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold"><HardHat className="h-6 w-6 text-blue-600" /><span className="hidden sm:inline">Construction Manager</span></Link>
        <nav className="flex items-center gap-2"><Link to="/login" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Log in</Link>
          <Link to="/signup" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Sign up</Link></nav></div></header>

    <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-16 text-center sm:py-24">
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"><Smartphone className="h-3 w-3" />Works on phone, tablet and computer</span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Keep every rupee of your construction business in one place</h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600 sm:text-lg">No more scrolling through WhatsApp for slips. Give money to your workers, let them upload their bills, approve with one tap, and see exactly who has how much left.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/signup" className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700">Get started</Link>
          <Link to="/login" className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium hover:bg-slate-50">Log in</Link></div></div></section>

    <section id="features" className="mx-auto max-w-6xl px-4 py-14">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">Everything you need</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">Built around how a contractor actually works with workers on several sites.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(f => <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="inline-flex rounded-lg bg-blue-50 p-2 text-blue-600"><f.icon className="h-5 w-5" /></span><h3 className="mt-3 font-semibold">{f.title}</h3><p className="mt-1 text-sm text-slate-600">{f.text}</p></div>)}</div></section>

    <section className="bg-slate-50 px-4 py-14"><div className="mx-auto max-w-6xl"><h2 className="text-center text-2xl font-bold sm:text-3xl">How it works</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">{steps.map(([n, t, d]) => <div key={n} className="rounded-xl border bg-white p-5 text-center shadow-sm">
        <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">{n}</span><h3 className="mt-3 font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p></div>)}</div></div></section>

    <section id="account" className="mx-auto max-w-6xl px-4 py-14"><div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-slate-200 p-6 shadow-sm"><h2 className="text-xl font-bold">New here?</h2>
        <p className="mt-2 text-sm text-slate-600">Create an account and the owner will approve it. Already approved? Log in with your phone number and password.</p>
        <div className="mt-4 flex gap-3"><Link to="/signup" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Sign up</Link><Link to="/login" className="rounded-lg border px-4 py-2 text-sm font-medium">Log in</Link></div></div>
      <div className="rounded-xl border border-slate-200 p-6 shadow-sm"><h2 className="text-xl font-bold">Forgot your password?</h2>
        <p className="mb-4 mt-2 text-sm text-slate-600">Enter your phone number to get a reset link by email. The owner can also set a new password for you.</p><ForgotForm /></div></div></section>

    <footer className="border-t px-4 py-6 text-center text-sm text-slate-500">© {new Date().getFullYear()} Construction Manager</footer></div>;
}
