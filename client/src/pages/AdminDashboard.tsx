import { Link } from 'react-router-dom';

import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  FolderTree,
  MapPin,
  Receipt,
  Users,
  XCircle,
  TrendingUp,
  RefreshCw,
  Wallet,
  Building2,
  ShieldCheck,
  Activity,
  CalendarDays,
  AlertCircle,
} from 'lucide-react';

import { E, list } from '../api';
import { useApi } from '../hooks/useApi';

import {
  Async,
  Badge,
  Table,
  Td,
} from '../components/ui';

import {
  fmtDate,
  inr,
  num,
} from '../lib/format';

import type {
  Expense,
  Fund,
  Site,
  Worker,
} from '../types';

export default function AdminDashboard() {

  const {
    data,
    error,
    loading,
    reload,
  } = useApi(async () => {

    const [w, s, f, x] = await Promise.all([
      list<Worker>(E.workers),
      list<Site>(E.sites),
      list<Fund>(E.funds),
      list<Expense>(E.expenses, {
        limit: 5,
        sort: '-createdAt',
      }),
    ]);

    return { w, s, f, x };

  });

  const sm = data?.x.summary ?? {};

  const workers = data?.w.items ?? [];
  const sites = data?.s.items ?? [];
  const expenses = data?.x.items ?? [];

  const activeWorkers = workers.filter(w => w.isActive);
  const activeSites = sites.filter(s => s.isActive);

  const pendingWorkers = workers.filter(
    w => w.pendingApproval
  );

  const totalAllocated =
    data?.f.summary.totalAllocated ?? 0;

  const pendingCount = num(sm.pendingCount);
  const approvedAmount = num(sm.approvedAmount);
  const rejectedCount = num(sm.rejectedCount);

  const stats = [
    {
      title: 'Total Workers',
      value: num(workers.length),
      description: `${activeWorkers.length} currently active`,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Active Sites',
      value: num(activeSites.length),
      description: 'Currently operational',
      icon: MapPin,
      color: 'bg-violet-50 text-violet-600',
    },
    {
      title: 'Total Funds Allocated',
      value: inr(totalAllocated),
      description: 'Total distributed funds',
      icon: Wallet,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Total Expenses',
      value: inr(sm.totalAmount),
      description: 'All submitted expenses',
      icon: Receipt,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      title: 'Pending Expenses',
      value: num(sm.pendingCount),
      description: 'Awaiting your approval',
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'Approved Expenses',
      value: inr(sm.approvedAmount),
      description: 'Successfully approved',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Rejected Expenses',
      value: num(sm.rejectedCount),
      description: 'Rejected submissions',
      icon: XCircle,
      color: 'bg-red-50 text-red-600',
    },
  ];

  const quickActions = [
    {
      to: '/admin/workers',
      label: 'Workers',
      description: 'Manage workforce',
      icon: Users,
    },
    {
      to: '/admin/sites',
      label: 'Sites',
      description: 'Manage projects',
      icon: Building2,
    },
    {
      to: '/admin/funds',
      label: 'Funds',
      description: 'Allocate money',
      icon: Wallet,
    },
    {
      to: '/admin/expenses',
      label: 'Expenses',
      description: 'Review expenses',
      icon: Receipt,
    },
    {
      to: '/admin/categories',
      label: 'Categories',
      description: 'Manage categories',
      icon: FolderTree,
    },
  ];

  return (

    <div className="mx-auto max-w-[1500px] space-y-7 pb-10">

      <Async
        loading={loading}
        error={error}
        onRetry={reload}
      >

        {data && <>

          {/* WELCOME HEADER */}

          <section className="relative overflow-hidden rounded-2xl bg-slate-950 p-7 text-white">

            <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[40px] border-white/5" />

            <div className="absolute bottom-[-100px] right-[25%] h-60 w-60 rounded-full bg-blue-600/10 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">

              <div>

                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-300">

                  <ShieldCheck size={15} />

                  ADMIN CONTROL CENTER

                </div>

                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">

                  Dashboard<span className="text-blue-400">.</span>

                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">

                  Welcome back! Manage your construction operations,
                  monitor finances and keep track of your entire workforce.

                </p>

              </div>

              <div className="flex flex-wrap items-center gap-3">

                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">

                  <p className="text-xs text-slate-400">
                    Active Workforce
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {activeWorkers.length}
                  </p>

                </div>

                <button
                  onClick={reload}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                >

                  <RefreshCw size={16} />

                  Refresh

                </button>

              </div>

            </div>

            <div className="relative mt-7 flex flex-wrap items-center gap-5 border-t border-white/10 pt-5 text-xs text-slate-400">

              <div className="flex items-center gap-2">

                <Building2 size={14} />

                {activeSites.length} Active Sites

              </div>

              <div className="flex items-center gap-2">

                <Users size={14} />

                {workers.length} Registered Workers

              </div>

              <div className="flex items-center gap-2">

                <Activity size={14} />

                {expenses.length} Recent Expenses Loaded

              </div>

            </div>

          </section>


          {/* ALERTS */}

          {(pendingWorkers.length > 0 || pendingCount > 0) && (

            <section className="space-y-3">

              {pendingWorkers.length > 0 && (

                <Link
                  to="/admin/workers"
                  className="flex items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 transition hover:bg-blue-100"
                >

                  <div className="flex items-center gap-3">

                    <div className="rounded-lg bg-blue-100 p-2 text-blue-700">

                      <Users size={19} />

                    </div>

                    <div>

                      <p className="text-sm font-bold text-blue-900">

                        {pendingWorkers.length} New Worker Request(s)

                      </p>

                      <p className="mt-1 text-xs text-blue-700">

                        New registrations are waiting for your approval.

                      </p>

                    </div>

                  </div>

                  <ArrowRight size={19} className="shrink-0 text-blue-700" />

                </Link>

              )}


              {pendingCount > 0 && (

                <Link
                  to="/admin/expenses?status=PENDING"
                  className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100"
                >

                  <div className="flex items-center gap-3">

                    <div className="rounded-lg bg-amber-100 p-2 text-amber-700">

                      <AlertCircle size={19} />

                    </div>

                    <div>

                      <p className="text-sm font-bold text-amber-900">

                        {pendingCount} Expenses Awaiting Approval

                      </p>

                      <p className="mt-1 text-xs text-amber-700">

                        {typeof sm.pendingAmount === 'number'
                          ? `${inr(sm.pendingAmount)} awaiting your review.`
                          : 'Review submitted worker expenses.'}

                      </p>

                    </div>

                  </div>

                  <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-amber-800">

                    Review

                    <ArrowRight size={16} />

                  </span>

                </Link>

              )}

            </section>

          )}


          {/* STATISTICS */}

          <section>

            <div className="mb-4 flex items-center justify-between">

              <div>

                <h2 className="text-lg font-bold text-slate-900">

                  Business Overview

                </h2>

                <p className="mt-1 text-sm text-slate-500">

                  Your construction business at a glance.

                </p>

              </div>

            </div>


            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {stats.map(item => {

                const Icon = item.icon;

                return (

                  <div
                    key={item.title}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >

                    <div className="flex items-start justify-between">

                      <div>

                        <p className="text-sm font-medium text-slate-500">

                          {item.title}

                        </p>

                        <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">

                          {loading ? '—' : item.value}

                        </h3>

                      </div>

                      <div className={`rounded-xl p-3 ${item.color}`}>

                        <Icon size={22} />

                      </div>

                    </div>

                    <p className="mt-4 text-xs text-slate-400">

                      {item.description}

                    </p>

                  </div>

                );

              })}

            </div>

          </section>


          {/* QUICK ACTIONS */}

          <section>

            <div className="mb-4">

              <h2 className="text-lg font-bold text-slate-900">

                Quick Actions

              </h2>

              <p className="mt-1 text-sm text-slate-500">

                Quickly access your management sections.

              </p>

            </div>


            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">

              {quickActions.map(action => {

                const Icon = action.icon;

                return (

                  <Link
                    key={action.to}
                    to={action.to}
                    className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                  >

                    <div className="rounded-xl bg-blue-50 p-3 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">

                      <Icon size={21} />

                    </div>

                    <div className="min-w-0">

                      <p className="text-sm font-bold text-slate-800">

                        {action.label}

                      </p>

                      <p className="mt-1 text-xs text-slate-400">

                        {action.description}

                      </p>

                    </div>

                  </Link>

                );

              })}

            </div>

          </section>


          {/* FINANCIAL SUMMARY */}

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">

                  <Wallet size={22} />

                </div>

                <div>

                  <h2 className="font-bold text-slate-900">

                    Financial Snapshot

                  </h2>

                  <p className="mt-1 text-xs text-slate-500">

                    Funds and expenses overview.

                  </p>

                </div>

              </div>


              <div className="mt-6 space-y-5">

                <div>

                  <div className="mb-2 flex justify-between text-sm">

                    <span className="font-medium text-slate-600">

                      Funds Allocated

                    </span>

                    <span className="font-bold text-slate-900">

                      {inr(totalAllocated)}

                    </span>

                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                    <div className="h-full w-full rounded-full bg-blue-600" />

                  </div>

                </div>


                <div>

                  <div className="mb-2 flex justify-between text-sm">

                    <span className="font-medium text-slate-600">

                      Approved Expenses

                    </span>

                    <span className="font-bold text-emerald-700">

                      {inr(approvedAmount)}

                    </span>

                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${
                          totalAllocated > 0
                            ? Math.min(
                                100,
                                (approvedAmount / totalAllocated) * 100
                              )
                            : 0
                        }%`,
                      }}
                    />

                  </div>

                </div>


                <div>

                  <div className="mb-2 flex justify-between text-sm">

                    <span className="font-medium text-slate-600">

                      Pending Expenses

                    </span>

                    <span className="font-bold text-amber-700">

                      {num(sm.pendingCount)}

                    </span>

                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{
                        width: `${
                          num(sm.totalCount) > 0
                            ? Math.min(
                                100,
                                (pendingCount / num(sm.totalCount)) * 100
                              )
                            : 0
                        }%`,
                      }}
                    />

                  </div>

                </div>

              </div>

            </div>


            {/* OPERATIONAL SUMMARY */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-violet-50 p-3 text-violet-600">

                  <Activity size={22} />

                </div>

                <div>

                  <h2 className="font-bold text-slate-900">

                    Operational Summary

                  </h2>

                  <p className="mt-1 text-xs text-slate-500">

                    Current management activity.

                  </p>

                </div>

              </div>


              <div className="mt-6 space-y-4">

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                  <div className="flex items-center gap-3">

                    <Users className="text-blue-600" size={20} />

                    <span className="text-sm font-medium text-slate-700">

                      Active Workers

                    </span>

                  </div>

                  <span className="text-lg font-bold text-slate-900">

                    {activeWorkers.length}

                  </span>

                </div>


                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                  <div className="flex items-center gap-3">

                    <Building2 className="text-violet-600" size={20} />

                    <span className="text-sm font-medium text-slate-700">

                      Active Sites

                    </span>

                  </div>

                  <span className="text-lg font-bold text-slate-900">

                    {activeSites.length}

                  </span>

                </div>


                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                  <div className="flex items-center gap-3">

                    <Clock className="text-amber-600" size={20} />

                    <span className="text-sm font-medium text-slate-700">

                      Pending Approvals

                    </span>

                  </div>

                  <span className="text-lg font-bold text-amber-700">

                    {pendingCount + pendingWorkers.length}

                  </span>

                </div>


                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                  <div className="flex items-center gap-3">

                    <XCircle className="text-red-600" size={20} />

                    <span className="text-sm font-medium text-slate-700">

                      Rejected Expenses

                    </span>

                  </div>

                  <span className="text-lg font-bold text-red-700">

                    {rejectedCount}

                  </span>

                </div>

              </div>

            </div>

          </section>


          {/* RECENT EXPENSES */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center">

              <div>

                <h2 className="text-lg font-bold text-slate-900">

                  Recent Expenses

                </h2>

                <p className="mt-1 text-sm text-slate-500">

                  Latest expense submissions from your workers.

                </p>

              </div>

              <Link
                to="/admin/expenses"
                className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
              >

                View All Expenses

                <ArrowRight size={16} />

              </Link>

            </div>


            {expenses.length === 0 ? (

              <div className="p-14 text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">

                  <Receipt size={30} />

                </div>

                <h3 className="mt-4 font-bold text-slate-800">

                  No expenses yet

                </h3>

                <p className="mt-2 text-sm text-slate-500">

                  Worker expense submissions will appear here.

                </p>

              </div>

            ) : (

              <Table head={[
                'Date',
                'Worker',
                'Site',
                'Category',
                'Amount',
                'Status',
              ]}>

                {expenses.slice(0, 5).map(e => (

                  <tr
                    key={e.id}
                    className="transition hover:bg-slate-50"
                  >

                    <Td>

                      <div className="flex items-center gap-2">

                        <CalendarDays size={14} className="text-slate-400" />

                        {fmtDate(e.createdAt)}

                      </div>

                    </Td>

                    <Td>

                      <span className="font-semibold text-slate-800">

                        {e.workerName}

                      </span>

                    </Td>

                    <Td>{e.siteName || '—'}</Td>

                    <Td>{e.category}</Td>

                    <Td>

                      <span className="font-bold text-slate-900">

                        {inr(e.amount)}

                      </span>

                    </Td>

                    <Td>

                      <Badge status={e.status} />

                    </Td>

                  </tr>

                ))}

              </Table>

            )}

          </section>


          {/* FOOTER */}

          <div className="flex flex-col justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row">

            <p>

              Construction Manager · Admin Dashboard

            </p>

            <p className="flex items-center gap-2">

              <ShieldCheck size={14} />

              Management Control Panel

            </p>

          </div>

        </>}

      </Async>

    </div>

  );

}