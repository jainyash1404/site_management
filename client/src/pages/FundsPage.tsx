import { useMemo, useState, type FormEvent } from 'react';

import {
  Wallet,
  TrendingUp,
  Users,
  Plus,
  Search,
  Building2,
  IndianRupee,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  Receipt,
  AlertTriangle,
} from 'lucide-react';

import { E, errMsg, list, send } from '../api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Field, input } from '../components/ui';
import { fmtDate, inr } from '../lib/format';
import type { Fund, Site, Worker } from '../types';

type Filter = 'ALL' | 'INITIAL' | 'ADDITIONAL';

export default function FundsPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const canViewFunds = hasPermission('funds.view');
  const canAllocateFunds = hasPermission('funds.allocate');
  const canViewWorkers = hasPermission('workers.view');
  const canViewSites = hasPermission('sites.view');

  const { data, error, loading, reload } = useApi(async () => {
    const [f, w, s] = await Promise.all([
      canViewFunds
        ? list<Fund>(E.funds)
        : Promise.resolve({ items: [], summary: { totalAllocated: 0 } }),

      canViewWorkers
        ? list<Worker>(E.workers)
        : Promise.resolve({ items: [] }),

      canViewSites
        ? list<Site>(E.sites)
        : Promise.resolve({ items: [] }),
    ]);

    return {
      f,
      w: w.items.filter(x => x.isActive),
      s: s.items.filter(x => x.isActive),
    };
  }, [canViewFunds, canViewWorkers, canViewSites]);

  const [v, setV] = useState({
    workerId: '',
    siteId: '',
    amount: '',
    type: 'INITIAL',
    notes: '',
  });

  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  const funds = data?.f.items ?? [];

  // STATISTICS
  const initialTotal = funds
    .filter(f => f.type === 'INITIAL')
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const additionalTotal = funds
    .filter(f => f.type === 'ADDITIONAL')
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const fundedWorkers = new Set(
    funds.map(f => f.workerId).filter(Boolean)
  ).size;

  const totalAllocated = data?.f.summary.totalAllocated ?? 0;

  // SEARCH AND FILTERS
  const filteredFunds = useMemo(() => {
    return funds.filter(f => {
      const q = search.trim().toLowerCase();

      const matchesSearch =
        !q ||
        (f.workerName ?? '').toLowerCase().includes(q) ||
        (f.siteName ?? '').toLowerCase().includes(q) ||
        (f.notes ?? '').toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q);

      const matchesFilter =
        filter === 'ALL' || f.type === filter;

      return matchesSearch && matchesFilter;
    });
  }, [funds, search, filter]);

  // FORM VALIDATION
  const submit = (e: FormEvent) => {
    e.preventDefault();

    if (!canAllocateFunds || busy) return;

    if (!canViewWorkers) {
      setErr('You need Workers View permission to select a worker.');
      return;
    }

    if (!v.workerId) {
      setErr('Please select a worker.');
      return;
    }

    if (
      !(Number(v.amount) > 0) ||
      !Number.isFinite(Number(v.amount))
    ) {
      setErr('Enter a valid amount greater than zero.');
      return;
    }

    if (
      v.amount.includes('.') &&
      v.amount.split('.')[1].length > 2
    ) {
      setErr('Amount can have a maximum of 2 decimal places.');
      return;
    }

    setErr('');
    setAsk(true);
  };

  // SAVE ALLOCATION
  const save = async () => {
    if (!canAllocateFunds || busy) return;

    const amount = Number(v.amount);

    setBusy(true);
    setErr('');

    try {
      await send('post', E.funds, {
        workerId: v.workerId,
        siteId: v.siteId || undefined,
        amount,
        type: v.type,
        notes: v.notes.trim() || undefined,
      });

      toast('Funds allocated successfully');

      setV({
        workerId: '',
        siteId: '',
        amount: '',
        type: 'INITIAL',
        notes: '',
      });

      setAsk(false);
      reload();

    } catch (x) {
      setErr(errMsg(x));
      toast(errMsg(x), 'err');
    } finally {
      setBusy(false);
    }
  };

  const selectedWorker = data?.w.find(
    w => w.id === v.workerId
  );

  const stats = [
    {
      title: 'Total Allocated',
      value: inr(totalAllocated),
      description: 'Total funds distributed',
      icon: Wallet,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Initial Allocations',
      value: inr(initialTotal),
      description: 'First-time allocations',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Additional Funds',
      value: inr(additionalTotal),
      description: 'Extra funds distributed',
      icon: TrendingUp,
      color: 'bg-violet-50 text-violet-600',
    },
    {
      title: 'Workers Funded',
      value: fundedWorkers,
      description: 'Unique workers receiving funds',
      icon: Users,
      color: 'bg-amber-50 text-amber-600',
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
              <Wallet size={15} />
              Financial Management
            </div>

            <h1 className="text-3xl font-bold">
              Funds Overview<span className="text-blue-400">.</span>
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              Allocate funds to workers and monitor financial transactions.
            </p>
          </div>

          {canViewFunds && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-xs text-slate-400">
                Total Funds Allocated
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {inr(totalAllocated)}
              </h2>

              <div className="mt-2 flex items-center gap-2 text-xs text-blue-300">
                <TrendingUp size={13} />
                Financial Overview
              </div>
            </div>
          )}

        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-5 border-t border-white/10 pt-4 text-xs text-slate-400">

          {canViewWorkers && (
            <div className="flex items-center gap-2">
              <Users size={14} />
              {data?.w.length ?? 0} Active Workers
            </div>
          )}

          {canViewSites && (
            <div className="flex items-center gap-2">
              <Building2 size={14} />
              {data?.s.length ?? 0} Active Sites
            </div>
          )}

          {canViewFunds && (
            <div className="flex items-center gap-2">
              <Receipt size={14} />
              {funds.length} Allocation Records
            </div>
          )}

        </div>

      </section>

      {/* FINANCIAL SUMMARY */}

      {canViewFunds && (
        <section>

          <div className="mb-4 flex items-center justify-between">

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Financial Summary
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Overview of all worker fund allocations.
              </p>
            </div>

            <button
              onClick={reload}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw size={14} />
              Refresh
            </button>

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

                      <p className="mt-2 text-xs text-slate-400">
                        {item.description}
                      </p>
                    </div>

                    <div className={`rounded-xl p-3 ${item.color}`}>
                      <Icon size={22} />
                    </div>

                  </div>

                </div>
              );
            })}

          </div>

        </section>
      )}

      {/* ALLOCATION FORM */}

      {canAllocateFunds && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center gap-3 border-b border-slate-100 p-6">

            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Wallet size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Allocate Funds
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Transfer funds to a worker and maintain a transaction record.
              </p>
            </div>

          </div>

          <form
            onSubmit={submit}
            noValidate
            className="space-y-5 p-6"
          >

            {!canViewWorkers && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Workers View permission is required to select a worker for fund allocation.
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">

              <Field label="Select Worker *">

                <select
                  className={input}
                  value={v.workerId}
                  disabled={!canViewWorkers}
                  onChange={e => {
                    setV({ ...v, workerId: e.target.value });
                    setErr('');
                  }}
                >
                  <option value="">Choose a worker</option>

                  {data?.w.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {w.phone}
                    </option>
                  ))}

                </select>

              </Field>

              <Field label="Construction Site (Optional)">

                <select
                  className={input}
                  value={v.siteId}
                  disabled={!canViewSites}
                  onChange={e =>
                    setV({ ...v, siteId: e.target.value })
                  }
                >
                  <option value="">
                    {canViewSites ? 'No specific site' : 'Site selection unavailable'}
                  </option>

                  {data?.s.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}

                </select>

              </Field>

              <Field label="Allocation Amount (₹) *">

                <div className="relative">

                  <IndianRupee
                    size={17}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />

                  <input
                    className={`${input} pl-10`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="Enter amount"
                    value={v.amount}
                    onChange={e => {
                      setV({ ...v, amount: e.target.value });
                      setErr('');
                    }}
                  />

                </div>

              </Field>

              <Field label="Allocation Type *">

                <select
                  className={input}
                  value={v.type}
                  onChange={e =>
                    setV({ ...v, type: e.target.value })
                  }
                >
                  <option value="INITIAL">Initial Allocation</option>
                  <option value="ADDITIONAL">Additional Funds</option>
                </select>

              </Field>

            </div>

            <Field label="Transaction Notes (Optional)">

              <input
                className={input}
                value={v.notes}
                onChange={e =>
                  setV({ ...v, notes: e.target.value })
                }
                placeholder="Add payment reference or allocation details..."
              />

            </Field>

            {selectedWorker && (

              <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700">
                  {selectedWorker.name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedWorker.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {selectedWorker.phone}
                  </p>
                </div>

                <div className="ml-auto text-right">
                  <p className="text-xs text-slate-500">
                    Allocation Type
                  </p>

                  <p className="mt-1 text-sm font-semibold text-blue-700">
                    {v.type === 'INITIAL' ? 'Initial' : 'Additional'}
                  </p>
                </div>

              </div>

            )}

            {err && (
              <div
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600"
              >
                {err}
              </div>
            )}

            <div className="flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">

              <p className="text-xs leading-5 text-slate-400">
                All allocations are recorded in financial history and cannot be deleted.
              </p>

              <button
                type="submit"
                disabled={busy || loading || !canViewWorkers || !data?.w.length}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={17} />
                Allocate Funds
                <ArrowUpRight size={16} />
              </button>

            </div>

          </form>

        </section>
      )}

      {/* ALLOCATION HISTORY */}

      {canViewFunds && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center">

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Allocation History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Complete record of funds distributed to workers.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              <div className="relative">

                <Search
                  size={17}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search allocations..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
                />

              </div>

              <select
                value={filter}
                onChange={e =>
                  setFilter(e.target.value as Filter)
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="ALL">All Allocations</option>
                <option value="INITIAL">Initial</option>
                <option value="ADDITIONAL">Additional</option>
              </select>

            </div>

          </div>

          {error && (
            <div className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
              Unable to load funds. Please refresh and try again.
            </div>
          )}

          {loading ? (

            <div className="p-12 text-center text-sm text-slate-500">
              Loading allocation history...
            </div>

          ) : filteredFunds.length === 0 ? (

            <div className="p-14 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <Receipt size={30} />
              </div>

              <h3 className="mt-4 font-bold text-slate-800">
                {funds.length
                  ? 'No matching allocations'
                  : 'No allocations yet'}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {funds.length
                  ? 'Try changing your search or filter.'
                  : 'Your fund allocation history will appear here.'}
              </p>

            </div>

          ) : (

            <>

              {/* DESKTOP TABLE */}

              <div className="hidden overflow-x-auto md:block">

                <table className="w-full text-left">

                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">

                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Worker</th>
                      <th className="px-6 py-4">Site</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Notes</th>
                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {filteredFunds.map(f => (

                      <tr
                        key={f.id}
                        className="transition hover:bg-slate-50"
                      >

                        <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-600">

                          <div className="flex items-center gap-2">
                            <Clock size={15} className="text-slate-400" />
                            {fmtDate(f.createdAt)}
                          </div>

                        </td>

                        <td className="px-6 py-5">

                          <div className="flex items-center gap-3">

                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 font-bold text-blue-700">
                              {(f.workerName || '?').charAt(0).toUpperCase()}
                            </div>

                            <span className="text-sm font-semibold text-slate-800">
                              {f.workerName || '—'}
                            </span>

                          </div>

                        </td>

                        <td className="px-6 py-5">

                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Building2 size={15} className="text-slate-400" />
                            {f.siteName || '—'}
                          </div>

                        </td>

                        <td className="px-6 py-5">

                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                              f.type === 'INITIAL'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {f.type === 'INITIAL' ? 'Initial' : 'Additional'}
                          </span>

                        </td>

                        <td className="whitespace-nowrap px-6 py-5 text-sm font-bold text-emerald-700">
                          {inr(f.amount)}
                        </td>

                        <td className="max-w-[220px] truncate px-6 py-5 text-sm text-slate-500">
                          {f.notes || '—'}
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

              {/* MOBILE CARDS */}

              <div className="space-y-3 p-4 md:hidden">

                {filteredFunds.map(f => (

                  <div
                    key={f.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >

                    <div className="flex items-center justify-between gap-3">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">
                          {(f.workerName || '?').charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {f.workerName || '—'}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {fmtDate(f.createdAt)}
                          </p>
                        </div>

                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          f.type === 'INITIAL'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {f.type === 'INITIAL' ? 'Initial' : 'Additional'}
                      </span>

                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Site
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {f.siteName || '—'}
                        </p>
                      </div>

                      <div className="rounded-lg bg-emerald-50 p-3">
                        <p className="text-xs text-emerald-700">
                          Amount
                        </p>

                        <p className="mt-1 text-sm font-bold text-emerald-800">
                          {inr(f.amount)}
                        </p>
                      </div>

                    </div>

                    {f.notes && (
                      <p className="mt-3 text-xs text-slate-500">
                        Notes: {f.notes}
                      </p>
                    )}

                  </div>

                ))}

              </div>

            </>

          )}

          <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500">
            Showing {filteredFunds.length} of {funds.length} allocation records
          </div>

        </section>
      )}

      {/* CONFIRMATION MODAL */}

      {ask && data && canAllocateFunds && (

        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/40 px-4 pt-8 backdrop-blur-sm"
          onMouseDown={e => {
            if (e.target === e.currentTarget && !busy) {
              setAsk(false);
            }
          }}
        >

          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">

            <div className="flex items-start gap-4">

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Wallet size={24} />
              </div>

              <div className="flex-1">

                <h3 className="text-lg font-bold text-slate-900">
                  Confirm Fund Allocation
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  You are about to allocate{' '}
                  <strong>{inr(Number(v.amount))}</strong>{' '}
                  to{' '}
                  <strong>
                    {selectedWorker?.name ?? 'this worker'}
                  </strong>.
                </p>

              </div>

            </div>

            <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4">

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Worker</span>
                <span className="font-semibold text-slate-800">
                  {selectedWorker?.name}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Site</span>
                <span className="font-semibold text-slate-800">
                  {data.s.find(s => s.id === v.siteId)?.name || 'None'}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Type</span>
                <span className="font-semibold text-slate-800">
                  {v.type === 'INITIAL' ? 'Initial Allocation' : 'Additional Funds'}
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-3 text-sm">
                <span className="font-semibold text-slate-700">
                  Total Amount
                </span>

                <span className="text-lg font-bold text-emerald-700">
                  {inr(Number(v.amount))}
                </span>
              </div>

            </div>

            <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">

              <AlertTriangle size={17} className="shrink-0" />

              <span>
                This transaction will be permanently recorded in allocation history and cannot be deleted later.
              </span>

            </div>

            <div className="mt-6 flex justify-end gap-3">

              <button
                type="button"
                disabled={busy}
                onClick={() => setAsk(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={save}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? 'Processing...' : 'Confirm Allocation'}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}