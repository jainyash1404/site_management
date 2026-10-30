import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Wallet,
  Receipt,
  Search,
  Filter,
  CalendarDays,
  Building2,
  IndianRupee,
  TrendingUp,
  Clock,
  XCircle,
} from 'lucide-react';

import { E, http, list } from '../api';
import { useApi } from '../hooks/useApi';
import {
  ActiveBadge,
  Async,
  Badge,
  ReceiptButton,
  Stat,
  Table,
  Td,
} from '../components/ui';
import { fmtDate, inr, num } from '../lib/format';
import type { Expense, Fund, Worker } from '../types';

type Detail = Worker & Record<string, number>;

export default function WorkerDetailPage() {
  const { id = '' } = useParams();

  const [expenseSearch, setExpenseSearch] = useState('');
  const [fundSearch, setFundSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  const { data, error, loading, reload } = useApi(async () => {
    const [w, f, x] = await Promise.all([
      http.get(`${E.workers}/${id}`),
      list<Fund>(E.funds, { workerId: id }),
      list<Expense>(E.expenses, { workerId: id }),
    ]);

    return {
      w: (w.data.data ?? w.data) as Detail,
      f: f.items,
      x: x.items,
    };
  }, [id]);

  const w = data?.w;

  const filteredFunds = useMemo(() => {
    if (!data) return [];

    const q = fundSearch.toLowerCase();

    return data.f.filter((f) =>
      !q ||
      (f.siteName || '').toLowerCase().includes(q) ||
      (f.notes || '').toLowerCase().includes(q) ||
      (f.type || '').toLowerCase().includes(q)
    );
  }, [data, fundSearch]);

  const filteredExpenses = useMemo(() => {
    if (!data) return [];

    const q = expenseSearch.toLowerCase();

    return data.x.filter((e) => {
      const matchesSearch =
        !q ||
        (e.siteName || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q);

      const matchesStatus =
        status === 'ALL' || e.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [data, expenseSearch, status]);

  return (
    <div className="mx-auto max-w-[1800px] space-y-6 pb-8">

      {/* Page Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/workers"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          All workers
        </Link>
      </div>

      <Async loading={loading} error={error} onRetry={reload}>
        {data && w && (
          <>
            {/* Worker Header */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-blue-600">
                  {w.name?.charAt(0)?.toUpperCase() || 'W'}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-xl font-bold text-slate-900">
                      {w.name}
                    </h1>
                    <ActiveBadge on={w.isActive} />
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span>{w.phone || 'No phone number'}</span>
                    {w.email && <span>{w.email}</span>}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={reload}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            {/* Financial Overview */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Financial overview
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Summary of worker funds and expenses
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Stat
                  title="Total allocated"
                  value={inr(w.totalAllocated)}
                />

                <Stat
                  title="Approved spent"
                  value={inr(w.approvedAmount)}
                />

                <Stat
                  title={`Pending (${num(w.pendingCount)})`}
                  value={inr(w.pendingAmount)}
                  tone="text-amber-700"
                />

                <Stat
                  title={`Rejected (${num(w.rejectedCount)})`}
                  value={inr(w.rejectedAmount)}
                  tone="text-red-700"
                />

                <Stat
                  title="Available balance"
                  value={inr(w.availableBalance)}
                  tone="text-emerald-700"
                />
              </div>
            </section>

            {/* Funds History */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <Wallet className="h-5 w-5 text-blue-600" />
                    Funds allocation history
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Track all funds allocated to this worker.
                  </p>
                </div>

                <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  {data.f.length} allocations
                </span>
              </div>

              {/* Search */}
              <div className="border-b border-slate-100 p-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={fundSearch}
                    onChange={(e) => setFundSearch(e.target.value)}
                    placeholder="Search site, type or notes..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {filteredFunds.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
                    <Wallet className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="font-semibold text-slate-700">
                    {data.f.length === 0
                      ? 'No funds allocated yet'
                      : 'No matching records'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Fund allocation records will appear here.
                  </p>
                </div>
              ) : (
                <Table head={['Date', 'Site', 'Type', 'Amount', 'Notes']}>
                  {filteredFunds.map((f) => (
                    <tr key={f.id} className="transition hover:bg-slate-50">
                      <Td>
                        <span className="whitespace-nowrap">
                          {fmtDate(f.createdAt)}
                        </span>
                      </Td>

                      <Td>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {f.siteName || '—'}
                        </span>
                      </Td>

                      <Td>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          f.type === 'INITIAL'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {f.type === 'INITIAL' ? 'Initial' : 'Additional'}
                        </span>
                      </Td>

                      <Td>
                        <span className="font-semibold text-slate-900">
                          {inr(f.amount)}
                        </span>
                      </Td>

                      <Td>{f.notes || '—'}</Td>
                    </tr>
                  ))}
                </Table>
              )}
            </section>

            {/* Expense History */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <Receipt className="h-5 w-5 text-blue-600" />
                    Expense history
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Track all expenses submitted by this worker.
                  </p>
                </div>

                <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  {data.x.length} expenses
                </span>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    placeholder="Search site, category or description..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="relative sm:w-48">
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
                    <Receipt className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="font-semibold text-slate-700">
                    {data.x.length === 0
                      ? 'No expenses submitted yet'
                      : 'No matching expenses found'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Expense submissions will appear here.
                  </p>
                </div>
              ) : (
                <Table
                  head={[
                    'Date',
                    'Site',
                    'Category',
                    'Description',
                    'Amount',
                    'Status',
                    'Review note',
                    'Receipt',
                  ]}
                >
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="transition hover:bg-slate-50">
                      <Td>
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <CalendarDays className="h-4 w-4 text-slate-400" />
                          {fmtDate(e.createdAt)}
                        </span>
                      </Td>

                      <Td>{e.siteName || '—'}</Td>

                      <Td>{e.category || '—'}</Td>

                      <Td>
                        <span className="max-w-48 truncate">
                          {e.description || '—'}
                        </span>
                      </Td>

                      <Td>
                        <span className="font-semibold text-slate-900">
                          {inr(e.amount)}
                        </span>
                      </Td>

                      <Td>
                        <Badge status={e.status} />
                      </Td>

                      <Td>{e.reviewNote || '—'}</Td>

                      <Td>
                        <ReceiptButton url={e.receiptUrl} />
                      </Td>
                    </tr>
                  ))}
                </Table>
              )}
            </section>
          </>
        )}
      </Async>
    </div>
  );
}