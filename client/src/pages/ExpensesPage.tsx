import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Receipt,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  CalendarDays,
  RefreshCw,
  Filter,
  ArrowUpRight,
  FileText,
  RotateCcw,
  Plus,
  UserRound,
  Users,
} from 'lucide-react';

import { E, errMsg, list, send } from '../api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

import {
  Async,
  Badge,
  Button,
  Confirm,
  ReceiptButton,
  Table,
  Td,
  Modal,
  Field,
  input,
} from '../components/ui';

import { fmtDate, inr } from '../lib/format';

import type {
  Expense,
  ExpenseCategory,
  Site,
  Worker,
} from '../types';

type Mode = 'mine' | 'worker';

export default function ExpensesPage() {
  const toast = useToast();
  const { hasPermission, user } = useAuth();
  const [sp, setSp] = useSearchParams();

  const canViewExpenses = hasPermission('expenses.view');
  const canApprove = hasPermission('expenses.approve');
  const canReject = hasPermission('expenses.reject');

  const canViewWorkers = hasPermission('workers.view');
  const canViewSites = hasPermission('sites.view');
  const canViewCategories = hasPermission('categories.view');

  const [f, setF] = useState({
    q: '',
    status: ['PENDING', 'APPROVED', 'REJECTED', 'RECORDED'].includes(
      sp.get('status') ?? ''
    ) ? sp.get('status')! : '',
    workerId: '',
    siteId: '',
    category: '',
    subcategory: '',
    from: '',
    to: '',
  });

  const set = (k: string) => (
    e: { target: { value: string } }
  ) => setF(prev => ({ ...prev, [k]: e.target.value }));

  const clearFilters = () => {
    setF({
      q: '',
      status: '',
      workerId: '',
      siteId: '',
      category: '',
      subcategory: '',
      from: '',
      to: '',
    });
  };

  const opts = useApi(async () => {
    const [w, s, c] = await Promise.all([
      canViewWorkers
        ? list<Worker>(E.workers)
        : Promise.resolve({ items: [] }),

      canViewSites
        ? list<Site>(E.sites)
        : Promise.resolve({ items: [] }),

      canViewCategories
        ? list<ExpenseCategory>(E.categories)
        : Promise.resolve({ items: [] }),
    ]);

    return {
      w: w.items,
      s: s.items,
      c: c.items,
    };
  }, [canViewWorkers, canViewSites, canViewCategories]);

  const selectedCategory = opts.data?.c.find(
    c => c.name === f.category
  );

  const availableSubcategories = (
    selectedCategory?.subcategories ?? []
  ).filter(sub => sub.isActive);

  const ex = useApi(
    () =>
      canViewExpenses
        ? list<Expense>(
            E.expenses,
            Object.fromEntries(
              Object.entries(f).filter(([, value]) => value)
            )
          )
        : Promise.resolve({ items: [], summary: {} }),

    [JSON.stringify(f), canViewExpenses]
  );

  // EXPENSE ENTRY FORM

  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('mine');

  const [workerId, setWorkerId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const today = new Date().toLocaleDateString('en-CA');
  const [expenseDate, setExpenseDate] = useState(today);
  const [receipts, setReceipts] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const openForm = (nextMode: Mode) => {
    setMode(nextMode);
    setWorkerId('');
    setSiteId('');
    setCategory('');
    setSubcategory('');
    setAmount('');
    setDescription('');
    setExpenseDate(today);
    setReceipts([]);
    setFormOpen(true);
  };

  const formCategory = opts.data?.c.find(
    c => c.name === category
  );

  const formSubcategories = (
    formCategory?.subcategories ?? []
  ).filter(sub => sub.isActive);

  const submitExpense = async () => {
    if (saving) return;

    if (!siteId || !category || !amount) {
      toast('Please fill all required fields', 'err');
      return;
    }

    if (mode === 'worker' && !workerId) {
      toast('Please select a worker', 'err');
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast('Enter a valid amount', 'err');
      return;
    }
    if (!expenseDate || expenseDate > today) {
      toast('Please select a valid expense date', 'err');
      return;
    }

    if (receipts.length > 5) {
      toast('Maximum 5 receipts allowed', 'err');
      return;
    }

    const data = new FormData();

    data.append('siteId', siteId);
    data.append('amount', String(Math.round(numericAmount * 100)));
    data.append('category', category);
    data.append('expenseDate', expenseDate);

    if (mode === 'worker') {
      data.append('workerId', workerId);
    }

    if (subcategory) {
      data.append('subcategory', subcategory);
    }

    if (description.trim()) {
      data.append('description', description.trim());
    }

    receipts.forEach(file => {
      data.append('receipts', file);
    });

    setSaving(true);

    try {
      await send('post', E.expenses, data);

      toast(
        mode === 'mine'
          ? 'Your expense recorded successfully'
          : 'Worker expense recorded successfully'
      );

      setFormOpen(false);
      setSp({});
      ex.reload();
    } catch (error) {
      toast(errMsg(error), 'err');
    } finally {
      setSaving(false);
    }
  };

  // REVIEW

  const [rv, setRv] = useState<{
    e: Expense;
    action: 'APPROVED' | 'REJECTED';
  } | null>(null);

  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const done = async () => {
    if (!rv || busy) return;

    if (rv.action === 'APPROVED' && !canApprove) return;
    if (rv.action === 'REJECTED' && !canReject) return;

    setBusy(true);

    try {
      await send('patch', E.review(rv.e.id), {
        status: rv.action,
        reviewNote: note.trim() || undefined,
      });

      toast(`Expense ${rv.action.toLowerCase()}`);

      setRv(null);
      setNote('');
      ex.reload();
    } catch (error) {
      toast(errMsg(error), 'err');
    } finally {
      setBusy(false);
    }
  };

  const getReceiptUrls = (e: Expense): string[] => {
    if (e.receiptUrls?.length) return e.receiptUrls;
    return e.receiptUrl ? [e.receiptUrl] : [];
  };

  const expenses = ex.data?.items ?? [];

  const stats = useMemo(() => {
    const total = expenses.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );

    const pending = expenses.filter(e => e.status === 'PENDING');
    const approved = expenses.filter(e => e.status === 'APPROVED');
    const rejected = expenses.filter(e => e.status === 'REJECTED');
    const recorded = expenses.filter(e => e.status === 'RECORDED');

    return {
      total,
      count: expenses.length,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, e) => sum + Number(e.amount || 0), 0),
      approvedCount: approved.length,
      approvedAmount: approved.reduce((sum, e) => sum + Number(e.amount || 0), 0),
      rejectedCount: rejected.length,
      rejectedAmount: rejected.reduce((sum, e) => sum + Number(e.amount || 0), 0),
      recordedCount: recorded.length,
      recordedAmount: recorded.reduce((sum, e) => sum + Number(e.amount || 0), 0),
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
      title: 'Recorded Expenses',
      value: inr(stats.recordedAmount),
      description: `${stats.recordedCount} directly recorded`,
      icon: Receipt,
      color: 'bg-blue-50 text-blue-600',
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
              Manage worker expenses, record admin expenses and review submitted bills.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Total Expenses</p>
            <h2 className="mt-2 text-2xl font-bold">
              {canViewExpenses ? inr(stats.total) : 'Restricted'}
            </h2>
            <div className="mt-2 flex items-center gap-2 text-xs text-blue-300">
              <ArrowUpRight size={14} />
              Expense Overview
            </div>
          </div>
        </div>

        {canViewExpenses && (
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
            <div className="flex items-center gap-2">
              <Plus size={14} />
              {stats.recordedCount} Recorded
            </div>
          </div>
        )}
      </section>

      {/* ADD EXPENSE ACTIONS */}

      {canViewExpenses && (
        <section className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => openForm('mine')}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
          >
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Receipt size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">My Expense</h3>
              <p className="mt-1 text-xs text-slate-500">
                Record your personal expense
              </p>
            </div>
            <Plus className="ml-auto text-blue-600" />
          </button>

          {canViewWorkers && (
            <button
              onClick={() => openForm('worker')}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-md"
            >
              <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                <Users size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Add for Worker</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Record an expense on behalf of a worker
                </p>
              </div>
              <Plus className="ml-auto text-violet-600" />
            </button>
          )}
        </section>
      )}

      {/* STATISTICS */}

      {canViewExpenses && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Expense Summary
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Financial breakdown of loaded expenses.
              </p>
            </div>

            <button
              onClick={ex.reload}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
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
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {item.title}
                      </p>
                      <h3 className="mt-3 text-2xl font-bold text-slate-900">
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
      )}

      {/* FILTERS */}

      {canViewExpenses && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Filter size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Search & Filters</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Find expenses using different criteria.
                </p>
              </div>
            </div>

            {activeFilters > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-xs font-semibold text-red-600"
              >
                <RotateCcw size={14} />
                Clear all filters ({activeFilters})
              </button>
            )}
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search size={17} className="absolute left-3 top-3 text-slate-400" />
              <input
                aria-label="Search description"
                placeholder="Search description..."
                className={`${input} pl-10`}
                value={f.q}
                onChange={set('q')}
              />
            </div>

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
              <option value="RECORDED">Recorded</option>
            </select>

            {canViewWorkers && (
              <select
                aria-label="Worker"
                className={input}
                value={f.workerId}
                onChange={set('workerId')}
              >
                <option value="">All workers</option>
                {(opts.data?.w ?? []).map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            )}

            {canViewSites && (
              <select
                aria-label="Site"
                className={input}
                value={f.siteId}
                onChange={set('siteId')}
              >
                <option value="">All sites</option>
                {(opts.data?.s ?? []).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            {canViewCategories && (
              <select
                aria-label="Category"
                className={input}
                value={f.category}
                onChange={e => setF(prev => ({
                  ...prev,
                  category: e.target.value,
                  subcategory: '',
                }))}
              >
                <option value="">All categories</option>
                {(opts.data?.c ?? []).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            )}

            {canViewCategories && f.category && (
              <select
                aria-label="Subcategory"
                className={input}
                value={f.subcategory}
                onChange={set('subcategory')}
              >
                <option value="">All subcategories</option>
                {availableSubcategories.map(sub => (
                  <option key={sub.id} value={sub.name}>{sub.name}</option>
                ))}
              </select>
            )}

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

            <button
              onClick={clearFilters}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              <RotateCcw size={15} />
              Reset Filters
            </button>
          </div>
        </section>
      )}

      {/* EXPENSE TABLE */}

      {canViewExpenses ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Expense Records
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                View expense owner, entry creator and approval status.
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
            empty={ex.data && expenses.length === 0
              ? 'No expenses match your filters.'
              : false}
          >
            <div className="hidden overflow-x-auto lg:block">
              <Table
                head={[
                  'Date',
                  'Expense For',
                  'Added By',
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
                  <tr key={e.id}>
                    <Td>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <CalendarDays size={14} className="text-slate-400" />
                        {fmtDate(e.expenseDate || e.createdAt)}
                      </div>
                    </Td>

                    <Td>
                      <div className="font-semibold text-slate-800">
                        {e.workerName || '—'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {e.workerRole || ''}
                      </div>
                    </Td>

                    <Td>
                      <div className="font-semibold text-slate-800">
                        {e.addedByName || '—'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {e.addedByRole || ''}
                      </div>
                    </Td>

                    <Td>{e.siteName || '—'}</Td>

                    <Td>
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                        {e.category}
                      </span>
                      {e.subcategory && (
                        <p className="mt-1 text-xs text-blue-600">
                          {e.subcategory}
                        </p>
                      )}
                    </Td>

                    <Td className="max-w-[180px]">
                      <div className="max-w-[180px] truncate">
                        {e.description || '—'}
                      </div>
                      {e.reviewNote && (
                        <p className="mt-1 max-w-[180px] truncate text-xs text-slate-400">
                          Note: {e.reviewNote}
                        </p>
                      )}
                    </Td>

                    <Td>
                      <span className="whitespace-nowrap font-bold">
                        {inr(e.amount)}
                      </span>
                    </Td>

                    <Td><Badge status={e.status} /></Td>

                    <Td>
                      <div className="flex flex-wrap gap-2">
                        {getReceiptUrls(e).length
                          ? getReceiptUrls(e).map((url, index) => (
                              <ReceiptButton
                                key={`${e.id}-${index}`}
                                url={url}
                              />
                            ))
                          : '—'}
                      </div>
                    </Td>

                    <Td>
                      {e.status === 'PENDING' && (canApprove || canReject) ? (
                        <div className="flex items-center gap-2">
                          {canApprove && (
                            <Button
                              variant="success"
                              className="!px-2 !py-1 text-xs"
                              onClick={() => setRv({ e, action: 'APPROVED' })}
                            >
                              Approve
                            </Button>
                          )}

                          {canReject && (
                            <Button
                              variant="danger"
                              className="!px-2 !py-1 text-xs"
                              onClick={() => setRv({ e, action: 'REJECTED' })}
                            >
                              Reject
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {e.status === 'PENDING' ? 'Awaiting review' : '—'}
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </Table>
            </div>

            {/* MOBILE CARDS */}

            <div className="space-y-3 p-4 lg:hidden">
              {expenses.map(e => (
                <div key={e.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-800">
                        {e.workerName || '—'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Expense For · {fmtDate(e.expenseDate || e.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-blue-600">
                        Added By: {e.addedByName || '—'}
                      </p>
                    </div>
                    <Badge status={e.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Amount</p>
                      <p className="mt-1 font-bold">{inr(e.amount)}</p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Category</p>
                      <p className="mt-1 text-sm font-semibold">{e.category}</p>
                      {e.subcategory && (
                        <p className="mt-1 text-xs text-blue-600">{e.subcategory}</p>
                      )}
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Site</p>
                      <p className="mt-1 text-sm font-semibold">{e.siteName || '—'}</p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Receipts</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getReceiptUrls(e).length
                          ? getReceiptUrls(e).map((url, index) => (
                              <ReceiptButton key={`${e.id}-mobile-${index}`} url={url} />
                            ))
                          : '—'}
                      </div>
                    </div>
                  </div>

                  {e.description && (
                    <p className="mt-3 text-sm text-slate-600">
                      {e.description}
                    </p>
                  )}

                  {e.status === 'PENDING' && (canApprove || canReject) && (
                    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                      {canApprove && (
                        <Button
                          variant="success"
                          className="flex-1"
                          onClick={() => setRv({ e, action: 'APPROVED' })}
                        >
                          Approve
                        </Button>
                      )}
                      {canReject && (
                        <Button
                          variant="danger"
                          className="flex-1"
                          onClick={() => setRv({ e, action: 'REJECTED' })}
                        >
                          Reject
                        </Button>
                      )}
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
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-bold text-amber-900">
            Expense viewing permission required
          </h2>
          <p className="mt-2 text-sm text-amber-800">
            Ask the Super Admin to assign expenses.view permission.
          </p>
        </section>
      )}

      {/* ADD EXPENSE MODAL */}

      {formOpen && (
        <Modal
          title={mode === 'mine' ? 'Record My Expense' : 'Add Expense for Worker'}
          onClose={() => {
            if (!saving) setFormOpen(false);
          }}
        >
          <div className="space-y-4">

            {mode === 'worker' && (
              <Field label="Select Worker">
                <select
                  className={input}
                  value={workerId}
                  onChange={e => setWorkerId(e.target.value)}
                >
                  <option value="">Choose worker</option>
                  {(opts.data?.w ?? [])
                    .filter(w => w.isActive)
                    .map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                </select>
              </Field>
            )}

            <Field label="Construction Site">
              <select
                className={input}
                value={siteId}
                onChange={e => setSiteId(e.target.value)}
              >
                <option value="">Select site</option>
                {(opts.data?.s ?? [])
                  .filter(s => s.isActive && !s.isCompleted)
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Category">
              <select
                className={input}
                value={category}
                onChange={e => {
                  setCategory(e.target.value);
                  setSubcategory('');
                }}
              >
                <option value="">Select category</option>
                {(opts.data?.c ?? [])
                  .filter(c => c.isActive)
                  .map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>

            {category && formSubcategories.length > 0 && (
              <Field label="Subcategory">
                <select
                  className={input}
                  value={subcategory}
                  onChange={e => setSubcategory(e.target.value)}
                >
                  <option value="">Select subcategory</option>
                  {formSubcategories.map(sub => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Actual Expense Date">
              <input
                type="date"
                className={input}
                value={expenseDate}
                max={today}
                onChange={e => setExpenseDate(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Select the actual date mentioned on the payment slip.
              </p>
            </Field>

            <Field label="Amount (₹)">
              <input
                type="number"
                min="1"
                step="0.01"
                className={input}
                placeholder="Enter amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </Field>

            <Field label="Description (Optional)">
              <textarea
                className={input}
                rows={3}
                maxLength={500}
                placeholder="Enter expense details..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </Field>

            <Field label="Receipts (Maximum 5 images)">
              <input
                type="file"
                accept="image/*"
                multiple
                className={input}
                onChange={e => {
                  const files = Array.from(e.target.files ?? []);

                  if (files.length > 5) {
                    toast('Maximum 5 receipts allowed', 'err');
                    e.target.value = '';
                    setReceipts([]);
                    return;
                  }

                  setReceipts(files);
                }}
              />
              {receipts.length > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  {receipts.length} receipt(s) selected
                </p>
              )}
            </Field>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
              This expense will be directly recorded without approval.
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button
                variant="ghost"
                disabled={saving}
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>

              <Button
                loading={saving}
                onClick={submitExpense}
              >
                <Plus size={16} />
                Record Expense
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* REVIEW CONFIRMATION */}

      {rv && (
        <Confirm
          title={rv.action === 'APPROVED' ? 'Approve expense?' : 'Reject expense?'}
          variant={rv.action === 'APPROVED' ? 'success' : 'danger'}
          confirmText={rv.action === 'APPROVED' ? 'Approve' : 'Reject'}
          busy={busy}
          message={`${inr(rv.e.amount)} by ${rv.e.workerName} (${rv.e.category}${rv.e.subcategory ? ` / ${rv.e.subcategory}` : ''}). ${
            rv.action === 'APPROVED'
              ? 'This will reduce the worker’s balance.'
              : 'This action cannot be undone.'
          }`}
          onConfirm={done}
          onCancel={() => {
            if (busy) return;
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
              placeholder="Add a note..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </label>
        </Confirm>
      )}
    </div>
  );
}