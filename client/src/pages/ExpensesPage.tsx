import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Receipt,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Wallet,
  Users,
  Building2,
  CalendarDays,
  RefreshCw,
  Filter,
  ArrowUpRight,
  FileText,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

import { E, errMsg, list, send } from '../api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';

import {
  Async,
  Badge,
  Button,
  Confirm,
  ReceiptButton,
  Table,
  Td,
  input,
} from '../components/ui';

import { fmtDate, inr } from '../lib/format';

import type {
  Expense,
  ExpenseCategory,
  Site,
  Worker,
} from '../types';

export default function ExpensesPage() {
  const toast = useToast();
  const [sp] = useSearchParams();

  const s0 = sp.get('status') ?? '';

  const [f, setF] = useState({
    q: '',
    status: ['PENDING', 'APPROVED', 'REJECTED'].includes(s0) ? s0 : '',
    workerId: '',
    siteId: '',
    category: '',
    from: '',
    to: '',
  });

  const set = (k: string) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

  const clearFilters = () => {
    setF({
      q: '',
      status: '',
      workerId: '',
      siteId: '',
      category: '',
      from: '',
      to: '',
    });
  };

  // Load dropdown options
  const opts = useApi(async () => {
    const [w, s, c] = await Promise.all([
      list<Worker>(E.workers),
      list<Site>(E.sites),
      list<ExpenseCategory>(E.categories),
    ]);

    return {
      w: w.items,
      s: s.items,
      c: c.items,
    };
  });

  // Load expenses using existing filters
  const ex = useApi(
    () =>
      list<Expense>(
        E.expenses,
        Object.fromEntries(
          Object.entries(f).filter(([, v]) => v)
        )
      ),
    [JSON.stringify(f)]
  );

  // Review state
  const [rv, setRv] = useState<{
    e: Expense;
    action: 'APPROVED' | 'REJECTED';
  } | null>(null);

  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Review expense
  const done = async () => {
    if (!rv || busy) return;

    setBusy(true);

    try {
      await send(
        'patch',
        E.review(rv.e.id),
        {
          status: rv.action,
          reviewNote: note.trim() || undefined,
        }
      );

      toast(`Expense ${rv.action.toLowerCase()}`);

      setRv(null);
      setNote('');

      ex.reload();

    } catch (x) {
      toast(errMsg(x), 'err');
    } finally {
      setBusy(false);
    }
  };

  // Dropdown helper
  const sel = (
    k: string,
    label: string,
    items: { id: string; name: string }[],
    val = 'id'
  ) => (
    <select
      aria-label={label}
      className={input}
      value={f[k as keyof typeof f]}
      onChange={set(k)}
    >
      <option value="">{label}</option>

      {items.map(i => (
        <option
          key={i.id}
          value={val === 'name' ? i.name : i.id}
        >
          {i.name}
        </option>
      ))}
    </select>
  );

  // Current result statistics
  const expenses = ex.data?.items ?? [];

  const stats = useMemo(() => {
    const total = expenses.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );

    const pending = expenses.filter(
      e => e.status === 'PENDING'
    );

    const approved = expenses.filter(
      e => e.status === 'APPROVED'
    );

    const rejected = expenses.filter(
      e => e.status === 'REJECTED'
    );

    return {
      total,
      count: expenses.length,
      pendingCount: pending.length,
      pendingAmount: pending.reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0
      ),
      approvedCount: approved.length,
      approvedAmount: approved.reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0
      ),
      rejectedCount: rejected.length,
      rejectedAmount: rejected.reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0
      ),
    };
  }, [expenses]);

  const activeFilters = Object.values(f).filter(Boolean).length;

  const statCards = [
    {
      title: 'Total Expenses',
      value: inr(stats.total),
      description: `${stats.count} expense records`,
      icon: Wallet,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Pending Expenses',
      value: stats.pendingCount,
      description: `${inr(stats.pendingAmount)} awaiting review`,
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'Approved Expenses',
      value: inr(stats.approvedAmount),
      description: `${stats.approvedCount} approved records`,
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Rejected Expenses',
      value: stats.rejectedCount,
      description: `${inr(stats.rejectedAmount)} rejected`,
      icon: XCircle,
      color: 'bg-red-50 text-red-600',
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-10">

      {/* HEADER */}

      <section className="relative overflow-hidden rounded-2xl bg-slate-950 p-7 text-white">

        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[40px] border-white/5" />

        <div className="absolute bottom-[-100px] right-[25%] h-60 w-60 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

          <div>

            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-300">

              <Receipt size={15} />

              FINANCIAL MANAGEMENT

            </div>

            <h1 className="text-3xl font-bold tracking-tight">

              Expense Management<span className="text-blue-400">.</span>

            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">

              Monitor worker expenses, review submitted bills and manage
              approvals from one centralized dashboard.

            </p>

          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">

            <p className="text-xs text-slate-400">
              Total Expenses
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              {inr(stats.total)}
            </h2>

            <div className="mt-2 flex items-center gap-2 text-xs text-blue-300">

              <TrendingUpIcon />

              Expense Overview

            </div>

          </div>

        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-5 border-t border-white/10 pt-4 text-xs text-slate-400">

          <div className="flex items-center gap-2">
            <Receipt size={14} />
            {stats.count} Expense Records
          </div>

          <div className="flex items-center gap-2">
            <Clock size={14} />
            {stats.pendingCount} Pending
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} />
            {stats.approvedCount} Approved
          </div>

        </div>

      </section>


      {/* STATISTICS */}

      <section>

        <div className="mb-4 flex items-center justify-between">

          <div>

            <h2 className="text-lg font-bold text-slate-900">
              Expense Summary
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Financial breakdown of the currently loaded expenses.
            </p>

          </div>

          <button
            onClick={ex.reload}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >

            <RefreshCw size={14} />

            Refresh

          </button>

        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {statCards.map(item => {

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
                      {ex.loading ? '—' : item.value}
                    </h3>

                  </div>

                  <div className={`rounded-xl p-3 ${item.color}`}>
                    <Icon size={22} />
                  </div>

                </div>

                <p className="mt-3 text-xs text-slate-400">
                  {item.description}
                </p>

              </div>

            );

          })}

        </div>

      </section>


      {/* FILTERS */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Filter size={20} />
            </div>

            <div>

              <h2 className="font-bold text-slate-900">
                Search & Filters
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Find expenses using different criteria.
              </p>

            </div>

          </div>

          {activeFilters > 0 && (

            <button
              onClick={clearFilters}
              className="flex items-center gap-2 text-xs font-semibold text-red-600 hover:text-red-700"
            >

              <RotateCcw size={14} />

              Clear all filters ({activeFilters})

            </button>

          )}

        </div>


        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">

          {/* SEARCH */}

          <div className="relative">

            <Search
              size={17}
              className="absolute left-3 top-3 text-slate-400"
            />

            <input
              aria-label="Search description"
              placeholder="Search description..."
              className={`${input} pl-10`}
              value={f.q}
              onChange={set('q')}
            />

          </div>


          {/* STATUS */}

          <select
            aria-label="Status"
            className={input}
            value={f.status}
            onChange={set('status')}
          >

            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>

          </select>


          {/* WORKER */}

          {sel(
            'workerId',
            'All workers',
            opts.data?.w ?? []
          )}


          {/* SITE */}

          {sel(
            'siteId',
            'All sites',
            opts.data?.s ?? []
          )}


          {/* CATEGORY */}

          {sel(
            'category',
            'All categories',
            opts.data?.c ?? [],
            'name'
          )}


          {/* FROM DATE */}

          <div>

            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              From Date
            </label>

            <input
              aria-label="From date"
              type="date"
              className={input}
              value={f.from}
              onChange={set('from')}
            />

          </div>


          {/* TO DATE */}

          <div>

            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              To Date
            </label>

            <input
              aria-label="To date"
              type="date"
              className={input}
              value={f.to}
              onChange={set('to')}
            />

          </div>


          {/* CLEAR */}

          <button
            onClick={clearFilters}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >

            <RotateCcw size={15} />

            Reset Filters

          </button>

        </div>

      </section>


      {/* EXPENSE TABLE */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center">

          <div>

            <h2 className="text-lg font-bold text-slate-900">
              Expense Records
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Review submitted expenses and manage their approval status.
            </p>

          </div>

          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">

            <FileText size={15} />

            {expenses.length} Records

          </div>

        </div>


        <Async
          loading={ex.loading}
          error={ex.error}
          onRetry={ex.reload}
          empty={
            ex.data &&
            ex.data.items.length === 0 &&
            'No expenses match your filters.'
          }
        >

          <div className="hidden lg:block">

            <Table
              head={[
                'Date',
                'Worker',
                'Site',
                'Category',
                'Description',
                'Amount',
                'Status',
                'Receipt',
                'Actions',
              ]}
            >

              {expenses.map(e => (

                <tr
                  key={e.id}
                  className="transition hover:bg-slate-50"
                >

                  <Td>

                    <div className="flex items-center gap-2 whitespace-nowrap">

                      <CalendarDays
                        size={14}
                        className="text-slate-400"
                      />

                      {fmtDate(e.createdAt)}

                    </div>

                  </Td>


                  <Td>

                    <div className="flex items-center gap-2">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-bold text-blue-700">

                        {(e.workerName || '?')
                          .charAt(0)
                          .toUpperCase()}

                      </div>

                      <span className="font-semibold text-slate-800">
                        {e.workerName}
                      </span>

                    </div>

                  </Td>


                  <Td>
                    {e.siteName || '—'}
                  </Td>


                  <Td>

                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                      {e.category}
                    </span>

                  </Td>


                  <Td className="max-w-[200px]">

                    <div className="max-w-[200px] truncate text-sm text-slate-700">
                      {e.description || '—'}
                    </div>

                    {e.reviewNote && (

                      <div className="mt-1 max-w-[200px] truncate text-xs text-slate-400">
                        Note: {e.reviewNote}
                      </div>

                    )}

                  </Td>


                  <Td>

                    <span className="whitespace-nowrap font-bold text-slate-900">
                      {inr(e.amount)}
                    </span>

                  </Td>


                  <Td>
                    <Badge status={e.status} />
                  </Td>


                  <Td>
                    <ReceiptButton url={e.receiptUrl} />
                  </Td>


                  <Td>

                    {e.status === 'PENDING' ? (

                      <div className="flex items-center gap-2">

                        <Button
                          variant="success"
                          className="!px-2 !py-1 text-xs"
                          onClick={() =>
                            setRv({
                              e,
                              action: 'APPROVED',
                            })
                          }
                        >
                          Approve
                        </Button>

                        <Button
                          variant="danger"
                          className="!px-2 !py-1 text-xs"
                          onClick={() =>
                            setRv({
                              e,
                              action: 'REJECTED',
                            })
                          }
                        >
                          Reject
                        </Button>

                      </div>

                    ) : (

                      <span className="text-xs text-slate-400">
                        Reviewed
                      </span>

                    )}

                  </Td>

                </tr>

              ))}

            </Table>

          </div>


          {/* MOBILE / TABLET CARDS */}

          <div className="space-y-3 p-4 lg:hidden">

            {expenses.map(e => (

              <div
                key={e.id}
                className="rounded-xl border border-slate-200 p-4"
              >

                <div className="flex items-start justify-between gap-3">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">

                      {(e.workerName || '?')
                        .charAt(0)
                        .toUpperCase()}

                    </div>

                    <div>

                      <p className="text-sm font-bold text-slate-800">
                        {e.workerName}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {fmtDate(e.createdAt)}
                      </p>

                    </div>

                  </div>

                  <Badge status={e.status} />

                </div>


                <div className="mt-4 grid grid-cols-2 gap-3">

                  <div className="rounded-lg bg-slate-50 p-3">

                    <p className="text-xs text-slate-500">
                      Amount
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {inr(e.amount)}
                    </p>

                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">

                    <p className="text-xs text-slate-500">
                      Category
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {e.category}
                    </p>

                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">

                    <p className="text-xs text-slate-500">
                      Site
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {e.siteName || '—'}
                    </p>

                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">

                    <p className="text-xs text-slate-500">
                      Receipt
                    </p>

                    <div className="mt-1">
                      <ReceiptButton url={e.receiptUrl} />
                    </div>

                  </div>

                </div>


                {e.description && (

                  <p className="mt-3 text-sm text-slate-600">
                    {e.description}
                  </p>

                )}


                {e.reviewNote && (

                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                    Review note: {e.reviewNote}
                  </div>

                )}


                {e.status === 'PENDING' && (

                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">

                    <Button
                      variant="success"
                      className="flex-1"
                      onClick={() =>
                        setRv({
                          e,
                          action: 'APPROVED',
                        })
                      }
                    >
                      Approve
                    </Button>

                    <Button
                      variant="danger"
                      className="flex-1"
                      onClick={() =>
                        setRv({
                          e,
                          action: 'REJECTED',
                        })
                      }
                    >
                      Reject
                    </Button>

                  </div>

                )}

              </div>

            ))}

          </div>

        </Async>


        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500">

          Showing {expenses.length} expense records

        </div>

      </section>


      {/* APPROVE / REJECT CONFIRMATION */}

      {rv && (

        <Confirm
          title={
            rv.action === 'APPROVED'
              ? 'Approve expense?'
              : 'Reject expense?'
          }

          variant={
            rv.action === 'APPROVED'
              ? 'success'
              : 'danger'
          }

          confirmText={
            rv.action === 'APPROVED'
              ? 'Approve'
              : 'Reject'
          }

          busy={busy}

          message={`${
            inr(rv.e.amount)
          } by ${
            rv.e.workerName
          } (${
            rv.e.category
          }). ${
            rv.action === 'APPROVED'
              ? 'This will reduce the worker’s balance.'
              : 'This action cannot be undone.'
          }`}

          onConfirm={done}

          onCancel={() => {
            setRv(null);
            setNote('');
          }}
        >

          <label className="block text-sm">

            <span className="mb-2 block font-semibold text-slate-700">
              Review Note (Optional)
            </span>

            <textarea
              className={input}
              rows={3}
              placeholder="Add a note about this decision..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />

          </label>

        </Confirm>

      )}

    </div>
  );
}

function TrendingUpIcon() {
  return <ArrowUpRight size={14} />;
}