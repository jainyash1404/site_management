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
  User,
  CreditCard,
  Trash2,
} from 'lucide-react';

import { E, errMsg, list, send } from '../api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

import {
  Field,
  input,
  Confirm,
} from '../components/ui';

import { fmtDate, inr } from '../lib/format';

import type { Fund, Site, Worker } from '../types';

type Filter = 'ALL' | 'INITIAL' | 'ADDITIONAL';

type PaymentMode =
  | 'CASH'
  | 'UPI'
  | 'BANK_TRANSFER'
  | 'CHEQUE'
  | 'OTHER';

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
        : Promise.resolve({
            items: [],
            summary: { totalAllocated: 0 },
          }),

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
      s: s.items.filter(x => x.isActive && !x.isCompleted),
    };
  }, [canViewFunds, canViewWorkers, canViewSites]);

  const funds = data?.f.items ?? [];
  const workers = data?.w ?? [];
  const sites = data?.s ?? [];

  // Separate records
  const workerFunds = funds.filter(f => !!f.workerId);
  const siteFunds = funds.filter(
    f => !!f.siteId && !!f.contributorName,
  );

  // WORKER FORM
  const [v, setV] = useState({
    workerId: '',
    siteId: '',
    amount: '',
    type: 'INITIAL' as 'INITIAL' | 'ADDITIONAL',
    notes: '',
  });

  // SITE FORM
  const [siteForm, setSiteForm] = useState({
    contributorName: '',
    siteId: '',
    amount: '',
    type: 'INITIAL' as 'INITIAL' | 'ADDITIONAL',
    paymentMode: 'CASH' as PaymentMode,
    notes: '',
  });

  const [err, setErr] = useState('');
  const [siteErr, setSiteErr] = useState('');

  const [busy, setBusy] = useState(false);
  const [siteBusy, setSiteBusy] = useState(false);

  const [ask, setAsk] = useState(false);
  const [askSite, setAskSite] = useState(false);

  // SEARCH
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  const [siteSearch, setSiteSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState<Filter>('ALL');

  // DELETE
  const [deleteFund, setDeleteFund] = useState<Fund | null>(null);
  const [deleting, setDeleting] = useState(false);

  // STATISTICS - WORKER
  const workerInitial = workerFunds
    .filter(f => f.type === 'INITIAL')
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const workerAdditional = workerFunds
    .filter(f => f.type === 'ADDITIONAL')
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const workerTotal = workerFunds.reduce(
    (sum, f) => sum + Number(f.amount || 0),
    0,
  );

  const fundedWorkers = new Set(
    workerFunds.map(f => f.workerId).filter(Boolean),
  ).size;

  // STATISTICS - SITE
  const siteInitial = siteFunds
    .filter(f => f.type === 'INITIAL')
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const siteAdditional = siteFunds
    .filter(f => f.type === 'ADDITIONAL')
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const siteTotal = siteFunds.reduce(
    (sum, f) => sum + Number(f.amount || 0),
    0,
  );

  const fundedSites = new Set(
    siteFunds.map(f => f.siteId).filter(Boolean),
  ).size;

  // WORKER HISTORY FILTER
  const filteredFunds = useMemo(() => {
    return workerFunds.filter(f => {
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
  }, [workerFunds, search, filter]);

  // SITE HISTORY FILTER
  const filteredSiteFunds = useMemo(() => {
    return siteFunds.filter(f => {
      const q = siteSearch.trim().toLowerCase();

      const matchesSearch =
        !q ||
        (f.contributorName ?? '').toLowerCase().includes(q) ||
        (f.siteName ?? '').toLowerCase().includes(q) ||
        (f.notes ?? '').toLowerCase().includes(q) ||
        (f.paymentMode ?? '').toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q);

      const matchesFilter =
        siteFilter === 'ALL' || f.type === siteFilter;

      return matchesSearch && matchesFilter;
    });
  }, [siteFunds, siteSearch, siteFilter]);

  const selectedWorker = workers.find(
    w => w.id === v.workerId,
  );

  const selectedWorkerSite = sites.find(
    s => s.id === v.siteId,
  );

  const selectedSite = sites.find(
    s => s.id === siteForm.siteId,
  );

  // AMOUNT VALIDATION
  const validateAmount = (amount: string) => {
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return 'Enter a valid amount greater than zero.';
    }

    if (
      amount.includes('.') &&
      amount.split('.')[1].length > 2
    ) {
      return 'Amount can have a maximum of 2 decimal places.';
    }

    return '';
  };

  // WORKER FORM VALIDATION
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canAllocateFunds || busy) return;

    if (!canViewWorkers) {
      setErr('Workers View permission is required.');
      return;
    }

    if (!v.workerId) {
      setErr('Please select a worker.');
      return;
    }

    const amountError = validateAmount(v.amount);

    if (amountError) {
      setErr(amountError);
      return;
    }

    setErr('');
    setAsk(true);
  };

  // SAVE WORKER ALLOCATION
  const save = async () => {
    if (!canAllocateFunds || busy) return;

    setBusy(true);
    setErr('');

    try {
      await send('post', E.funds, {
        workerId: v.workerId,
        siteId: v.siteId || undefined,
        amount: Number(v.amount),
        type: v.type,
        notes: v.notes.trim() || undefined,
      });

      toast('Funds allocated to worker successfully');

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

  // SITE FORM VALIDATION
  const submitSite = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canAllocateFunds || siteBusy) return;

    if (!siteForm.contributorName.trim()) {
      setSiteErr('Please enter contributor name.');
      return;
    }

    if (!siteForm.siteId) {
      setSiteErr('Please select a construction site.');
      return;
    }

    const amountError = validateAmount(siteForm.amount);

    if (amountError) {
      setSiteErr(amountError);
      return;
    }

    setSiteErr('');
    setAskSite(true);
  };

  // SAVE SITE FUNDS
  const saveSite = async () => {
    if (!canAllocateFunds || siteBusy) return;

    setSiteBusy(true);
    setSiteErr('');

    try {
      await send('post', E.funds, {
        siteId: siteForm.siteId,
        contributorName: siteForm.contributorName.trim(),
        amount: Number(siteForm.amount),
        type: siteForm.type,
        paymentMode: siteForm.paymentMode,
        notes: siteForm.notes.trim() || undefined,
      });

      toast('Site funds added successfully');

      setSiteForm({
        contributorName: '',
        siteId: '',
        amount: '',
        type: 'INITIAL',
        paymentMode: 'CASH',
        notes: '',
      });

      setAskSite(false);
      reload();
    } catch (x) {
      setSiteErr(errMsg(x));
      toast(errMsg(x), 'err');
    } finally {
      setSiteBusy(false);
    }
  };

  // DELETE FUND
  const confirmDelete = async () => {
    if (!deleteFund || deleting || !canAllocateFunds) return;

    setDeleting(true);

    try {
      await send('delete', `${E.funds}/${deleteFund.id}`);

      toast('Fund record deleted successfully');
      setDeleteFund(null);
      reload();
    } catch (x) {
      toast(errMsg(x), 'err');
    } finally {
      setDeleting(false);
    }
  };

  const paymentModes: Record<PaymentMode, string> = {
    CASH: 'Cash',
    UPI: 'UPI',
    BANK_TRANSFER: 'Bank Transfer',
    CHEQUE: 'Cheque',
    OTHER: 'Other',
  };

  const workerStats = [
    {
      title: 'Total Allocated',
      value: inr(workerTotal),
      description: 'Funds distributed to workers',
      icon: Wallet,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Initial Allocations',
      value: inr(workerInitial),
      description: 'First-time allocations',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Additional Funds',
      value: inr(workerAdditional),
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

  const siteStats = [
    {
      title: 'Total Received',
      value: inr(siteTotal),
      description: 'Funds received by sites',
      icon: Wallet,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Initial Funds',
      value: inr(siteInitial),
      description: 'Initial site allocations',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Additional Funds',
      value: inr(siteAdditional),
      description: 'Additional site funds',
      icon: TrendingUp,
      color: 'bg-violet-50 text-violet-600',
    },
    {
      title: 'Sites Funded',
      value: fundedSites,
      description: 'Unique sites receiving funds',
      icon: Building2,
      color: 'bg-amber-50 text-amber-600',
    },
  ];

  const renderStats = (stats: typeof workerStats) => (
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
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-10">

      {/* HEADER - ORIGINAL STYLE */}
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
              Manage site funds, worker allocations and financial transactions.
            </p>
          </div>

          {canViewFunds && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-xs text-slate-400">
                Total Site Funds Received
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {inr(siteTotal)}
              </h2>

              <div className="mt-2 flex items-center gap-2 text-xs text-blue-300">
                <TrendingUp size={13} />
                Site Financial Overview
              </div>
            </div>
          )}
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-5 border-t border-white/10 pt-4 text-xs text-slate-400">
          {canViewWorkers && (
            <div className="flex items-center gap-2">
              <Users size={14} />
              {workers.length} Active Workers
            </div>
          )}

          {canViewSites && (
            <div className="flex items-center gap-2">
              <Building2 size={14} />
              {sites.length} Active Sites
            </div>
          )}

          {canViewFunds && (
            <div className="flex items-center gap-2">
              <Receipt size={14} />
              {funds.length} Fund Records
            </div>
          )}
        </div>
      </section>

      {/* SITE FINANCIAL SUMMARY */}
      {canViewFunds && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Site Fund Summary
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Overview of funds received by construction sites.
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

          {renderStats(siteStats)}
        </section>
      )}

      {/* SITE FUND ALLOCATION FORM */}
      {canAllocateFunds && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 p-6">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Building2 size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Add Site Funds
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Record funds received from a person or contributor for a construction site.
              </p>
            </div>
          </div>

          <form onSubmit={submitSite} noValidate className="space-y-5 p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Fund Given By *">
                <input
                  className={input}
                  placeholder="Enter contributor name"
                  value={siteForm.contributorName}
                  onChange={e => {
                    setSiteForm({ ...siteForm, contributorName: e.target.value });
                    setSiteErr('');
                  }}
                  maxLength={100}
                />
              </Field>

              <Field label="Construction Site *">
                <select
                  className={input}
                  value={siteForm.siteId}
                  onChange={e => {
                    setSiteForm({ ...siteForm, siteId: e.target.value });
                    setSiteErr('');
                  }}
                >
                  <option value="">Select construction site</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Amount (₹) *">
                <div className="relative">
                  <IndianRupee size={17} className="absolute left-3 top-3.5 text-slate-400" />
                  <input
                    className={`${input} pl-10`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Enter amount"
                    value={siteForm.amount}
                    onChange={e => {
                      setSiteForm({ ...siteForm, amount: e.target.value });
                      setSiteErr('');
                    }}
                  />
                </div>
              </Field>

              <Field label="Fund Type *">
                <select
                  className={input}
                  value={siteForm.type}
                  onChange={e =>
                    setSiteForm({
                      ...siteForm,
                      type: e.target.value as 'INITIAL' | 'ADDITIONAL',
                    })
                  }
                >
                  <option value="INITIAL">Initial Funds</option>
                  <option value="ADDITIONAL">Additional Funds</option>
                </select>
              </Field>

              <Field label="Payment Mode *">
                <select
                  className={input}
                  value={siteForm.paymentMode}
                  onChange={e =>
                    setSiteForm({
                      ...siteForm,
                      paymentMode: e.target.value as PaymentMode,
                    })
                  }
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>
            </div>

            <Field label="Remarks (Optional)">
              <input
                className={input}
                placeholder="Add payment reference or details..."
                value={siteForm.notes}
                onChange={e =>
                  setSiteForm({ ...siteForm, notes: e.target.value })
                }
                maxLength={300}
              />
            </Field>

            {siteErr && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                {siteErr}
              </div>
            )}

            <div className="flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
              <p className="text-xs leading-5 text-slate-400">
                Fund entries are recorded in the site's financial history.
              </p>

              <button
                type="submit"
                disabled={siteBusy || loading || sites.length === 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={17} />
                Add Site Funds
                <ArrowUpRight size={16} />
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SITE FUND HISTORY */}
      {canViewFunds && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Site Fund Allocation History
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Complete record of funds received by construction sites.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search size={17} className="absolute left-3 top-3 text-slate-400" />
                <input
                  value={siteSearch}
                  onChange={e => setSiteSearch(e.target.value)}
                  placeholder="Search site allocations..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
                />
              </div>

              <select
                value={siteFilter}
                onChange={e => setSiteFilter(e.target.value as Filter)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="ALL">All Allocations</option>
                <option value="INITIAL">Initial</option>
                <option value="ADDITIONAL">Additional</option>
              </select>
            </div>
          </div>

          {filteredSiteFunds.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No site fund records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Contributor</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Site</th>
                    <th className="px-5 py-4">Payment Mode</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Remarks</th>
                    {canAllocateFunds && <th className="px-5 py-4">Actions</th>}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredSiteFunds.map(f => (
                    <tr key={f.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                        <User size={15} className="mr-2 inline text-slate-400" />
                        {f.contributorName || '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        <Clock size={14} className="mr-1 inline" />
                        {fmtDate(f.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {f.siteName || '—'}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        <CreditCard size={14} className="mr-1 inline" />
                        {paymentModes[f.paymentMode ?? 'CASH']}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          f.type === 'INITIAL'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {f.type === 'INITIAL' ? 'Initial' : 'Additional'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-emerald-700">
                        {inr(f.amount)}
                      </td>
                      <td className="max-w-[180px] truncate px-5 py-4 text-sm text-slate-500">
                        {f.notes || '—'}
                      </td>
                      {canAllocateFunds && (
                        <td className="px-5 py-4">
                          <button
                            onClick={() => setDeleteFund(f)}
                            className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                            title="Delete allocation"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500">
            Showing {filteredSiteFunds.length} of {siteFunds.length} site fund records
          </div>
        </section>
      )}

      {/* WORKER FINANCIAL SUMMARY - ORIGINAL UI */}
      {canViewFunds && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Worker Allocation Summary
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Overview of funds distributed to workers.
            </p>
          </div>

          {renderStats(workerStats)}
        </section>
      )}

      {/* WORKER ALLOCATION FORM - ORIGINAL UI */}
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

          <form onSubmit={submit} noValidate className="space-y-5 p-6">
            {!canViewWorkers && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Workers View permission is required to select a worker.
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
                  {workers.map(w => (
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
                  onChange={e => setV({ ...v, siteId: e.target.value })}
                >
                  <option value="">No specific site</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Allocation Amount (₹) *">
                <div className="relative">
                  <IndianRupee size={17} className="absolute left-3 top-3.5 text-slate-400" />
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
                    setV({
                      ...v,
                      type: e.target.value as 'INITIAL' | 'ADDITIONAL',
                    })
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
                onChange={e => setV({ ...v, notes: e.target.value })}
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
                  <p className="text-xs text-slate-500">Allocation Type</p>
                  <p className="mt-1 text-sm font-semibold text-blue-700">
                    {v.type === 'INITIAL' ? 'Initial' : 'Additional'}
                  </p>
                </div>
              </div>
            )}

            {selectedWorkerSite && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                Assigned site: <strong>{selectedWorkerSite.name}</strong>
              </p>
            )}

            {err && (
              <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                {err}
              </div>
            )}

            <div className="flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
              <p className="text-xs leading-5 text-slate-400">
                Worker allocations are maintained separately from site funds.
              </p>

              <button
                type="submit"
                disabled={busy || loading || !canViewWorkers || workers.length === 0}
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

      {/* WORKER ALLOCATION HISTORY */}
      {canViewFunds && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Worker Allocation History
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Complete record of funds distributed to workers.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search size={17} className="absolute left-3 top-3 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search allocations..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
                />
              </div>

              <select
                value={filter}
                onChange={e => setFilter(e.target.value as Filter)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="ALL">All Allocations</option>
                <option value="INITIAL">Initial</option>
                <option value="ADDITIONAL">Additional</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
              Unable to load funds. Please refresh and try again.
            </div>
          ) : loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading allocation history...
            </div>
          ) : filteredFunds.length === 0 ? (
            <div className="p-14 text-center">
              <Receipt className="mx-auto text-slate-300" size={30} />
              <h3 className="mt-4 font-bold text-slate-800">
                No worker allocations yet
              </h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Worker</th>
                    <th className="px-6 py-4">Site</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Notes</th>
                    {canAllocateFunds && <th className="px-6 py-4">Actions</th>}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredFunds.map(f => (
                    <tr key={f.id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-600">
                        <Clock size={15} className="mr-2 inline text-slate-400" />
                        {fmtDate(f.createdAt)}
                      </td>

                      <td className="px-6 py-5 text-sm font-semibold text-slate-800">
                        {f.workerName || '—'}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        <Building2 size={15} className="mr-2 inline text-slate-400" />
                        {f.siteName || '—'}
                      </td>

                      <td className="px-6 py-5">
                        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          f.type === 'INITIAL'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {f.type === 'INITIAL' ? 'Initial' : 'Additional'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-sm font-bold text-emerald-700">
                        {inr(f.amount)}
                      </td>

                      <td className="max-w-[220px] truncate px-6 py-5 text-sm text-slate-500">
                        {f.notes || '—'}
                      </td>

                      {canAllocateFunds && (
                        <td className="px-6 py-5">
                          <button
                            type="button"
                            onClick={() => setDeleteFund(f)}
                            title="Delete allocation"
                            className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500">
            Showing {filteredFunds.length} of {workerFunds.length} worker allocation records
          </div>
        </section>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteFund && (
        <Confirm
          title="Delete Fund Allocation?"
          variant="danger"
          confirmText="Delete Permanently"
          busy={deleting}
          message={`Are you sure you want to delete ${inr(deleteFund.amount)} ${
            deleteFund.workerName
              ? `allocated to ${deleteFund.workerName}`
              : `contributed by ${deleteFund.contributorName || 'this contributor'}`
          }? This will update the related fund balance. This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => !deleting && setDeleteFund(null)}
        />
      )}

      {/* WORKER CONFIRMATION MODAL */}
      {ask && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/40 px-4 pt-8 backdrop-blur-sm"
          onMouseDown={e => {
            if (e.target === e.currentTarget && !busy) setAsk(false);
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
                  <strong>{inr(Number(v.amount))}</strong> to{' '}
                  <strong>{selectedWorker?.name ?? 'this worker'}</strong>.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Worker</span>
                <span className="font-semibold">{selectedWorker?.name}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Site</span>
                <span className="font-semibold">{selectedWorkerSite?.name || 'None'}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Type</span>
                <span className="font-semibold">
                  {v.type === 'INITIAL' ? 'Initial Allocation' : 'Additional Funds'}
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-3 text-sm">
                <span className="font-semibold">Total Amount</span>
                <span className="text-lg font-bold text-emerald-700">
                  {inr(Number(v.amount))}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              <AlertTriangle size={17} className="shrink-0" />
              <span>Please verify the worker and amount before confirming.</span>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setAsk(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
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

      {/* SITE CONFIRMATION MODAL */}
      {askSite && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/40 px-4 pt-8 backdrop-blur-sm"
          onMouseDown={e => {
            if (e.target === e.currentTarget && !siteBusy) setAskSite(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Building2 size={24} />
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Confirm Site Fund Entry
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  You are about to add{' '}
                  <strong>{inr(Number(siteForm.amount))}</strong> to{' '}
                  <strong>{selectedSite?.name}</strong>.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Contributor</span>
                <span className="font-semibold">{siteForm.contributorName}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Site</span>
                <span className="font-semibold">{selectedSite?.name}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Payment Mode</span>
                <span className="font-semibold">{paymentModes[siteForm.paymentMode]}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Type</span>
                <span className="font-semibold">
                  {siteForm.type === 'INITIAL' ? 'Initial Funds' : 'Additional Funds'}
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-3 text-sm">
                <span className="font-semibold">Total Amount</span>
                <span className="text-lg font-bold text-emerald-700">
                  {inr(Number(siteForm.amount))}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              <AlertTriangle size={17} className="shrink-0" />
              <span>Please verify the contributor, site and amount before confirming.</span>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={siteBusy}
                onClick={() => setAskSite(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={siteBusy}
                onClick={saveSite}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {siteBusy ? 'Processing...' : 'Confirm Funds'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}