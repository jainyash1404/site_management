import { Link } from 'react-router-dom';
import {
  Banknote,
  Camera,
  CheckCircle2,
  HardHat,
  Lock,
  MapPin,
  Search,
  ShieldCheck,
  Smartphone,
  Tags,
  Users,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  Clock3,
  Building2,
  Receipt,
  IndianRupee,
  Zap,
  ChevronRight,
  FileText,
  CircleCheck,
  ChartPie,
  Activity,
} from 'lucide-react';

import ForgotForm from '../components/ForgotForm';

const features = [
  {
    icon: Banknote,
    title: 'Smart Fund Allocation',
    text: 'Allocate money to workers, add funds whenever needed, and maintain a complete payment history.',
    color: 'blue',
  },
  {
    icon: Camera,
    title: 'Digital Bill Collection',
    text: 'Workers upload bills and payment screenshots directly from their phones. No more WhatsApp chaos.',
    color: 'green',
  },
  {
    icon: CheckCircle2,
    title: 'One-Tap Approvals',
    text: 'Review expenses, verify receipts, add notes and approve or reject requests with complete control.',
    color: 'violet',
  },
  {
    icon: Users,
    title: 'Worker-Wise Tracking',
    text: 'Know exactly how much each worker received, spent, has pending, and has left.',
    color: 'orange',
  },
  {
    icon: MapPin,
    title: 'Multiple Site Management',
    text: 'Manage different construction sites and track every expense against its respective location.',
    color: 'pink',
  },
  {
    icon: Tags,
    title: 'Organised Expenses',
    text: 'Categorise expenses like cement, steel, labour and transport with subcategories.',
    color: 'cyan',
  },
  {
    icon: Search,
    title: 'Powerful Search & Filters',
    text: 'Find transactions by worker, site, category, status or date without digging through records.',
    color: 'indigo',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    text: 'Owners, admins and workers get separate access to the information they are allowed to manage.',
    color: 'teal',
  },
  {
    icon: Lock,
    title: 'Secure Receipts',
    text: 'Keep receipts private with secure, temporary access links instead of public image URLs.',
    color: 'amber',
  },
];

const steps = [
  {
    number: '01',
    icon: Wallet,
    title: 'Allocate Funds',
    description:
      'The owner adds money to a worker’s account and records the payment.',
  },
  {
    number: '02',
    icon: FileText,
    title: 'Submit Expenses',
    description:
      'Workers enter the amount, select a site and category, and upload bill photos.',
  },
  {
    number: '03',
    icon: CheckCircle2,
    title: 'Review & Approve',
    description:
      'The owner verifies the bill and approves or rejects the expense.',
  },
];

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600',
  green: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600',
  violet: 'bg-violet-50 text-violet-600 group-hover:bg-violet-600',
  orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-600',
  pink: 'bg-pink-50 text-pink-600 group-hover:bg-pink-600',
  cyan: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600',
  indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600',
  teal: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600',
  amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-900">

      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-blue-100/40 blur-[100px]" />
        <div className="absolute -right-40 top-40 h-96 w-96 rounded-full bg-slate-200/50 blur-[100px]" />
      </div>

      {/* NAVBAR */}
      <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/80 bg-white/75 px-5 py-3 shadow-[0_8px_35px_rgba(15,23,42,0.07)] backdrop-blur-2xl sm:px-7">

          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <HardHat size={23} />
            </div>

            <div>
              <p className="text-lg font-extrabold tracking-tight">
                Construction<span className="text-blue-600">Manager</span>
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[2px] text-slate-400">
                Built for better management
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
            <a href="#features" className="transition hover:text-blue-600">
              Features
            </a>
            <a href="#how-it-works" className="transition hover:text-blue-600">
              How it works
            </a>
            <a href="#account" className="transition hover:text-blue-600">
              Get started
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Log in
            </Link>

            <Link
              to="/signup"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/15 transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Get Started
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative px-5 pb-16 pt-36 lg:pb-20 lg:pt-40">

        <div className="pointer-events-none absolute left-0 top-20 -z-10 h-[500px] w-[500px] rounded-full bg-blue-50/70 blur-[100px]" />
        <div className="pointer-events-none absolute right-0 top-32 -z-10 h-[500px] w-[500px] rounded-full bg-slate-100 blur-[110px]" />

        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">

          {/* HERO TEXT */}
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Built for modern construction businesses
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-[62px]">
              Every rupee.
              <br />
              Every worker.
              <br />
              <span className="text-blue-600">Under control.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-slate-500 sm:text-lg">
              Manage construction expenses, allocate worker funds, collect
              digital bills and approve payments — all from one simple platform.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/signup"
                className="group flex items-center gap-3 rounded-xl bg-blue-600 px-7 py-4 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-1 hover:bg-blue-700"
              >
                Get Started
                <ArrowUpRight
                  size={19}
                  className="transition group-hover:translate-x-1 group-hover:-translate-y-1"
                />
              </Link>

              <Link
                to="/login"
                className="rounded-xl border border-slate-200 bg-white px-7 py-4 font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-slate-50"
              >
                Log in
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-4 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <CircleCheck size={18} className="text-blue-600" />
                Simple to use
              </span>

              <span className="flex items-center gap-2">
                <CircleCheck size={18} className="text-blue-600" />
                Secure records
              </span>

              <span className="flex items-center gap-2">
                <Smartphone size={17} className="text-blue-600" />
                Works everywhere
              </span>
            </div>
          </div>

          {/* DASHBOARD PREVIEW */}
          <div className="relative mx-auto w-full max-w-3xl">

            <div className="absolute -inset-5 -z-10 rounded-[35px] bg-blue-100/50 blur-3xl" />

            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_25px_80px_rgba(15,23,42,0.10)] sm:p-5">

              {/* WINDOW BAR */}
              <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

                <div className="ml-auto rounded-lg border border-slate-100 px-3 py-1.5 text-[10px] font-medium text-slate-500">
                  Dashboard Preview
                </div>
              </div>

              <div className="flex gap-4">

                {/* SIDEBAR */}
                <div className="hidden w-32 shrink-0 border-r border-slate-100 pr-3 sm:block">
                  <div className="mb-6 flex items-center gap-2">
                    <div className="rounded-lg bg-blue-600 p-1.5 text-white">
                      <HardHat size={15} />
                    </div>
                    <span className="text-[9px] font-extrabold">
                      Construction
                    </span>
                  </div>

                  {[
                    { icon: Building2, name: 'Dashboard', active: true },
                    { icon: Users, name: 'Workers' },
                    { icon: MapPin, name: 'Sites' },
                    { icon: Wallet, name: 'Expenses' },
                    { icon: ShieldCheck, name: 'Approvals' },
                    { icon: Tags, name: 'Categories' },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className={`mb-2 flex items-center gap-2 rounded-lg px-2 py-2 text-[10px] font-medium ${
                        item.active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-500'
                      }`}
                    >
                      <item.icon size={13} />
                      {item.name}
                    </div>
                  ))}
                </div>

                {/* DASHBOARD CONTENT */}
                <div className="min-w-0 flex-1">

                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold">Dashboard</h3>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Your construction business at a glance
                      </p>
                    </div>

                    <span className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] text-slate-500">
                      Last 30 days
                    </span>
                  </div>

                  {/* STAT CARDS */}
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">

                    {[
                      {
                        icon: Wallet,
                        title: 'Total Allocated',
                        value: '₹2,50,000',
                        change: '12%',
                        color: 'blue',
                      },
                      {
                        icon: IndianRupee,
                        title: 'Approved Expenses',
                        value: '₹84,500',
                        change: '8%',
                        color: 'green',
                      },
                      {
                        icon: Clock3,
                        title: 'Pending Review',
                        value: '₹18,200',
                        change: '5 expenses',
                        color: 'orange',
                      },
                      {
                        icon: ChartPie,
                        title: 'Remaining Balance',
                        value: '₹1,47,300',
                        change: 'Available',
                        color: 'violet',
                      },
                    ].map((stat) => (
                      <div
                        key={stat.title}
                        className="rounded-xl border border-slate-100 bg-white p-3 transition hover:shadow-md"
                      >
                        <div
                          className={`mb-3 inline-flex rounded-lg p-2 ${
                            stat.color === 'blue'
                              ? 'bg-blue-50 text-blue-600'
                              : stat.color === 'green'
                                ? 'bg-emerald-50 text-emerald-600'
                                : stat.color === 'orange'
                                  ? 'bg-orange-50 text-orange-600'
                                  : 'bg-violet-50 text-violet-600'
                          }`}
                        >
                          <stat.icon size={17} />
                        </div>

                        <p className="text-[9px] font-medium text-slate-400">
                          {stat.title}
                        </p>

                        <h4 className="mt-1 text-sm font-extrabold text-slate-900 sm:text-base">
                          {stat.value}
                        </h4>

                        <p className="mt-2 text-[9px] text-slate-400">
                          {stat.change}
                        </p>
                      </div>
                    ))}

                  </div>

                  {/* ACTIVITY + CHART */}
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">

                    <div className="rounded-xl border border-slate-100 p-3">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="text-xs font-bold">Recent Activity</h4>
                        <span className="text-[10px] font-semibold text-blue-600">
                          View all →
                        </span>
                      </div>

                      {[
                        {
                          name: 'Rahul Sharma',
                          task: 'Cement purchase',
                          amount: '₹8,500',
                          status: 'Pending',
                          initial: 'R',
                        },
                        {
                          name: 'Amit Kumar',
                          task: 'Steel material',
                          amount: '₹12,000',
                          status: 'Approved',
                          initial: 'A',
                        },
                        {
                          name: 'Vikas Singh',
                          task: 'Transportation',
                          amount: '₹2,500',
                          status: 'Approved',
                          initial: 'V',
                        },
                      ].map((person) => (
                        <div
                          key={person.name}
                          className="flex items-center justify-between border-t border-slate-100 py-3 first:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                              {person.initial}
                            </div>

                            <div>
                              <p className="text-[10px] font-bold">
                                {person.name}
                              </p>
                              <p className="mt-1 text-[9px] text-slate-400">
                                {person.task}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] font-bold">
                              {person.amount}
                            </p>

                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-1 text-[8px] font-semibold ${
                                person.status === 'Pending'
                                  ? 'bg-orange-50 text-orange-600'
                                  : 'bg-emerald-50 text-emerald-600'
                              }`}
                            >
                              {person.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* EXPENSE CHART */}
                    <div className="rounded-xl border border-slate-100 p-3">
                      <h4 className="text-xs font-bold">Expense Status</h4>

                      <div className="mt-5 flex items-center justify-center gap-4">

                        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#10b981_0deg_158deg,#f59e0b_158deg_250deg,#f87171_250deg_310deg,#ddd6fe_310deg_360deg)]">
                          <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-white">
                            <span className="text-lg font-extrabold">156</span>
                            <span className="text-[9px] text-slate-400">
                              Total
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {[
                            { name: 'Approved', count: '68 (44%)', color: 'bg-emerald-500' },
                            { name: 'Pending', count: '42 (27%)', color: 'bg-amber-400' },
                            { name: 'Rejected', count: '21 (13%)', color: 'bg-red-400' },
                            { name: 'Others', count: '25 (16%)', color: 'bg-violet-300' },
                          ].map((item) => (
                            <div
                              key={item.name}
                              className="flex items-center gap-2 text-[9px]"
                            >
                              <span className={`h-2 w-2 rounded-full ${item.color}`} />
                              <span className="text-slate-500">{item.name}</span>
                              <span className="font-semibold text-slate-700">
                                {item.count}
                              </span>
                            </div>
                          ))}
                        </div>

                      </div>
                    </div>

                  </div>

                </div>
              </div>
            </div>

            {/* FLOATING BADGE */}
            <div className="absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl sm:flex">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <CheckCircle2 size={22} />
              </div>

              <div>
                <p className="text-xs font-bold">Payment Approved</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Expense verified successfully
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-slate-100 bg-white/80 px-5 py-6">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">

          {[
            { icon: Users, title: 'Worker Management', sub: 'Track every worker', color: 'blue' },
            { icon: Wallet, title: 'Fund Tracking', sub: 'Complete transparency', color: 'green' },
            { icon: FileText, title: 'Digital Receipts', sub: 'No paper confusion', color: 'violet' },
            { icon: Building2, title: 'Multiple Sites', sub: 'Manage all locations', color: 'orange' },
            { icon: ShieldCheck, title: 'Secure Platform', sub: 'Controlled access', color: 'pink' },
            { icon: Activity, title: 'Real-time Updates', sub: 'Always in sync', color: 'cyan' },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <div
                className={`rounded-xl p-3 ${
                  item.color === 'blue'
                    ? 'bg-blue-50 text-blue-600'
                    : item.color === 'green'
                      ? 'bg-emerald-50 text-emerald-600'
                      : item.color === 'violet'
                        ? 'bg-violet-50 text-violet-600'
                        : item.color === 'orange'
                          ? 'bg-orange-50 text-orange-600'
                          : item.color === 'pink'
                            ? 'bg-pink-50 text-pink-600'
                            : 'bg-cyan-50 text-cyan-600'
                }`}
              >
                <item.icon size={21} />
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-800">
                  {item.title}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">{item.sub}</p>
              </div>
            </div>
          ))}

        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-5 py-24">
        <div className="mx-auto max-w-7xl">

          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              Everything in one place
            </span>

            <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Built for the way
              <span className="text-blue-600"> construction works.</span>
            </h2>

            <p className="mt-5 leading-8 text-slate-500">
              From allocating funds to approving expenses, manage your entire
              worker payment workflow without paperwork and confusion.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-200/80 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_15px_40px_rgba(37,99,235,0.08)]"
              >
                <div
                  className={`inline-flex rounded-xl p-3 transition duration-300 group-hover:text-white ${colorClasses[feature.color]}`}
                >
                  <feature.icon size={23} />
                </div>

                <h3 className="mt-5 text-lg font-bold tracking-tight">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-500">
                  {feature.text}
                </p>

                <div className="mt-5 flex items-center gap-2 text-xs font-bold text-blue-600 opacity-0 transition group-hover:opacity-100">
                  Manage smarter
                  <ArrowUpRight size={15} />
                </div>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="relative overflow-hidden bg-slate-50 px-5 py-24"
      >
        <div className="pointer-events-none absolute left-0 top-20 h-48 w-48 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-60 w-60 rounded-full bg-slate-200/60 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">

          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full bg-blue-100 px-4 py-2 text-xs font-bold uppercase tracking-widest text-blue-700">
              Simple workflow
            </span>

            <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Three steps.
              <span className="text-blue-600"> Complete control.</span>
            </h2>

            <p className="mt-4 text-slate-500">
              A simple process that keeps owners and workers on the same page.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">

            {steps.map((step, index) => (
              <div
                key={step.number}
                className="relative rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                    <step.icon size={25} />
                  </div>

                  <span className="text-4xl font-black text-slate-100">
                    {step.number}
                  </span>
                </div>

                <h3 className="mt-8 text-xl font-bold">{step.title}</h3>

                <p className="mt-3 text-sm leading-7 text-slate-500">
                  {step.description}
                </p>

                {index !== 2 && (
                  <div className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-white p-2 text-blue-600 shadow-sm md:block">
                    <ChevronRight size={20} />
                  </div>
                )}
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[30px] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-slate-50 px-7 py-16 sm:px-12">

          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-slate-200/50 blur-3xl" />

          <div className="relative flex flex-col items-center justify-between gap-8 text-center lg:flex-row lg:text-left">

            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-semibold text-blue-600">
                <Zap size={14} />
                Take control of your construction business
              </span>

              <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Stop managing expenses manually.
              </h2>

              <p className="mt-4 leading-7 text-slate-500">
                Bring your workers, funds, bills and approvals together.
                Start managing your construction business smarter.
              </p>
            </div>

            <Link
              to="/signup"
              className="flex shrink-0 items-center gap-3 rounded-xl bg-blue-600 px-7 py-4 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-1 hover:bg-blue-700"
            >
              Create Your Account
              <ArrowUpRight size={18} />
            </Link>

          </div>
        </div>
      </section>

      {/* ACCOUNT SECTION */}
      <section id="account" className="border-t border-slate-100 bg-slate-50 px-5 py-20">
        <div className="mx-auto max-w-6xl">

          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Ready to get started?
            </h2>

            <p className="mt-3 text-slate-500">
              Create your account or access your existing workspace.
            </p>
          </div>

          <div className="grid gap-7 md:grid-cols-2">

            {/* SIGNUP */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Users size={24} />
              </div>

              <h3 className="mt-6 text-xl font-bold">
                New to Construction Manager?
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                Create an account and the owner will approve it. Once approved,
                you can access your workspace and start managing expenses.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Sign up
                  <ArrowUpRight size={16} />
                </Link>

                <Link
                  to="/login"
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Log in
                </Link>
              </div>
            </div>

            {/* FORGOT PASSWORD */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <Lock size={24} />
              </div>

              <h3 className="mt-6 text-xl font-bold">
                Forgot your password?
              </h3>

              <p className="mb-5 mt-3 text-sm leading-7 text-slate-500">
                Enter your phone number to get a reset link by email.
                The owner can also set a new password for you.
              </p>

              <ForgotForm />
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 px-5 py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">

          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <HardHat size={21} />
            </div>

            <span className="font-bold">
              Construction<span className="text-blue-400">Manager</span>
            </span>
          </Link>

          <p className="text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Construction Manager. All rights reserved.
          </p>

          <div className="flex gap-5 text-xs font-medium text-slate-400">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>
            <Link to="/login" className="transition hover:text-white">
              Login
            </Link>
          </div>

        </div>
      </footer>

    </div>
  );
}