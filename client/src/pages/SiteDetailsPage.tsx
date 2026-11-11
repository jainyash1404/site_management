import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { FormEvent, ReactNode } from 'react';

import {
  ArrowLeft,
  Wallet,
  Plus,
  IndianRupee,
  User,
  CreditCard,
  X,
  Loader2,
  Building2,
  FileText,
  CheckCircle2,
  MapPin,
  Receipt,
  HardHat,
  Clock,
  CalendarDays,
  TrendingUp,
  Banknote,
  CircleDollarSign,
  Download,
} from 'lucide-react';

import { E, http, errMsg, list, send } from '../api';
import type { Fund, Site, Expense, Worker } from '../types';
import { inr, fmtDate } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { exportExcelWorkbook } from '../utils/exportExcel';

type Tab = 'funds' | 'expenses' | 'workers' | 'activity';

const paymentModes = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
] as const;

const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'funds', label: 'Funds', icon: <Wallet size={17} /> },
  { id: 'expenses', label: 'Expenses', icon: <IndianRupee size={17} /> },
  { id: 'workers', label: 'Workers', icon: <HardHat size={17} /> },
  { id: 'activity', label: 'Activity', icon: <Clock size={17} /> },
];

export default function SiteDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

const toast = useToast();
  const { hasPermission } = useAuth();

  const canAllocateFunds = hasPermission('funds.allocate');
  const canViewFunds = hasPermission('funds.view');
  const canViewExpenses = hasPermission('expenses.view');

  const [site, setSite] = useState<Site | null>(null);
  const [siteLoading, setSiteLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>('funds');

  const [funds, setFunds] = useState<Fund[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const [workerLoading, setWorkerLoading] = useState(false);
  const [fundLoading, setFundLoading] = useState(false);
  const [expenseLoading, setExpenseLoading] = useState(false);

  const [fundModal, setFundModal] = useState(false);
  const [fundSaving, setFundSaving] = useState(false);
  const [fundError, setFundError] = useState('');

  const [fundForm, setFundForm] = useState({
    contributorName: '',
    amount: '',
    type: 'INITIAL' as 'INITIAL' | 'ADDITIONAL',
    paymentMode: 'CASH',
    notes: '',
  });

  // ==========================================
  // LOAD SITE
  // ==========================================

  const loadSite = useCallback(async () => {
    if (!id) return;

    setSiteLoading(true);

    try {
      const response = await http.get(`${E.sites}/${id}`);
      setSite(response.data?.data ?? response.data);
    } catch (error) {
      toast(errMsg(error), 'err');
    } finally {
      setSiteLoading(false);
    }
  }, [id, toast]);

  // ==========================================
  // LOAD SITE FUNDS
  // ==========================================

  const loadFunds = useCallback(async () => {
    if (!id || !canViewFunds) return;

    setFundLoading(true);

    try {
      const result = await list<Fund>(E.funds, {
        siteId: id,
        limit: 500,
      });

      setFunds(result.items ?? []);
    } catch (error) {
      toast(errMsg(error), 'err');
    } finally {
      setFundLoading(false);
    }
  }, [id, toast, canViewFunds]);

  // ==========================================
  // LOAD SITE EXPENSES
  // ==========================================

  const loadExpenses = useCallback(async () => {
    if (!id || !canViewExpenses) return;

    setExpenseLoading(true);

    try {
      const result = await list<Expense>(E.expenses, {
        siteId: id,
        limit: 500,
      });

      setExpenses(result.items ?? []);
    } catch (error) {
      toast(errMsg(error), 'err');
    } finally {
      setExpenseLoading(false);
    }
  }, [id, toast, canViewExpenses]);

  // ==========================================
  // LOAD SITE WORKERS
  // ==========================================

  const loadWorkers = useCallback(async () => {
    if (!id) return;

    setWorkerLoading(true);

    try {
      const result = await list<Worker>(E.workers);

      const assignedWorkers = (result.items ?? []).filter(worker =>
        worker.assignedSites?.some(
          siteId => String(siteId) === String(id)
        )
      );

      setWorkers(assignedWorkers);
    } catch (error) {
      toast(errMsg(error), 'err');
    } finally {
      setWorkerLoading(false);
    }
  }, [id, toast]);

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadSite();
    loadFunds();
    loadExpenses();
    loadWorkers();
  }, [loadSite, loadFunds, loadExpenses, loadWorkers]);

  // ==========================================
  // SITE FINANCIAL CALCULATIONS
  // ==========================================

  const totalReceived = funds.reduce(
    (total, fund) => total + Number(fund.amount || 0),
    0
  );

  const approvedAmount = expenses
    .filter(expense => expense.status === 'APPROVED')
    .reduce(
      (total, expense) => total + Number(expense.amount || 0),
      0
    );

  const recordedAmount = expenses
    .filter(expense => expense.status === 'RECORDED')
    .reduce(
      (total, expense) => total + Number(expense.amount || 0),
      0
    );

  const pendingAmount = expenses
    .filter(expense => expense.status === 'PENDING')
    .reduce(
      (total, expense) => total + Number(expense.amount || 0),
      0
    );

  const totalSpent = approvedAmount + recordedAmount;

  const availableBalance = totalReceived - totalSpent;

  const utilization = totalReceived > 0
    ? Math.min(100, (totalSpent / totalReceived) * 100)
    : 0;

  // ==========================================
  // FUND FORM RESET
  // ==========================================

  // ==========================================
// EXPORT SITE FINANCIAL REPORT
// ==========================================

const handleExportExcel = () => {
  if (!site) return;

  if (fundLoading || expenseLoading || workerLoading) {
    toast('Please wait for the site data to finish loading.', 'err');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  const safeSiteName = site.name
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim();

  // ==========================================
  // SHEET 1: FINANCIAL SUMMARY
  // ==========================================

  const financialSummary = [
    {
      Particulars: 'Site Name',
      Value: site.name,
    },
    {
      Particulars: 'Site Address',
      Value: site.address || 'Not specified',
    },
    {
      Particulars: 'Site Status',
      Value: site.isCompleted
        ? 'Completed'
        : site.isActive
          ? 'Active'
          : 'Inactive',
    },
    {
      Particulars: 'Report Date',
      Value: today,
    },
    {
      Particulars: 'Total Funds Received (INR)',
      Value: totalReceived,
    },
    {
      Particulars: 'Approved Expenses (INR)',
      Value: approvedAmount,
    },
    {
      Particulars: 'Recorded Expenses (INR)',
      Value: recordedAmount,
    },
    {
      Particulars: 'Total Spent (INR)',
      Value: totalSpent,
    },
    {
      Particulars: 'Pending Expenses (INR)',
      Value: pendingAmount,
    },
    {
      Particulars: 'Available Balance (INR)',
      Value: availableBalance,
    },
    {
      Particulars: 'Fund Utilization (%)',
      Value: Number(utilization.toFixed(2)),
    },
    {
      Particulars: 'Total Assigned Workers',
      Value: workers.length,
    },
  ];

  // ==========================================
  // SHEET 2: FUND HISTORY
  // ==========================================

  const fundHistory = funds.map((fund, index) => ({
    'S.No.': index + 1,
    Date: fmtDate(fund.createdAt),
    Contributor: fund.contributorName || fund.workerName || '—',
    'Fund Type': fund.type || '—',
    'Payment Mode':
      paymentModes.find(mode => mode.value === fund.paymentMode)
        ?.label || fund.paymentMode || '—',
    'Added By': fund.createdByName || 'Admin',
    'Amount (INR)': Number(fund.amount || 0),
    Remarks: fund.notes || '—',
  }));

  // ==========================================
  // SHEET 3: EXPENSE HISTORY
  // ==========================================

  const expenseHistory = expenses.map((expense, index) => ({
    'S.No.': index + 1,
    Date: fmtDate(expense.expenseDate || expense.createdAt),
    Category: expense.category || 'Uncategorized',
    Description: expense.description || '—',
    Worker: expense.workerName || '—',
    'Added By': expense.addedByName || 'Admin',
    Status: expense.status,
    'Amount (INR)': Number(expense.amount || 0),
    'Included in Spending':
      expense.status === 'APPROVED' ||
      expense.status === 'RECORDED'
        ? 'Yes'
        : 'No',
  }));

  // ==========================================
  // SHEET 4: WORKER DETAILS
  // ==========================================

  const workerDetails = workers.map((worker, index) => {
    const paid = Number(worker.totalAllocated || 0);

    const spent =
      Number(worker.approvedAmount || 0) +
      Number(worker.recordedAmount || 0);

    const pending = Number(worker.pendingAmount || 0);

    return {
      'S.No.': index + 1,
      'Worker Name': worker.name,
      Phone: worker.phone || '—',
      'Total Paid (INR)': paid,
      'Total Spent (INR)': spent,
      'Pending Expenses (INR)': pending,
      'Remaining Balance (INR)': paid - spent,
      Status:
        worker.pendingApproval
          ? 'Pending Approval'
          : worker.isActive
            ? 'Active'
            : 'Inactive',
    };
  });

  // ==========================================
  // SHEET 5: CATEGORY SPENDING
  // ==========================================

  const categoryTotals = expenses
    .filter(expense =>
      expense.status === 'APPROVED' ||
      expense.status === 'RECORDED'
    )
    .reduce<Record<string, number>>((result, expense) => {
      const category = expense.category || 'Uncategorized';

      result[category] =
        (result[category] || 0) +
        Number(expense.amount || 0);

      return result;
    }, {});

  const categorySpending = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount], index) => ({
      'S.No.': index + 1,
      Category: category,
      'Total Spent (INR)': amount,
      'Percentage (%)':
        totalSpent > 0
          ? Number(((amount / totalSpent) * 100).toFixed(2))
          : 0,
    }));

  // ==========================================
  // GENERATE EXCEL WORKBOOK
  // ==========================================

  exportExcelWorkbook(
    [
      {
        name: 'Financial Summary',
        data: financialSummary,
      },
      {
        name: 'Fund History',
        data: fundHistory,
      },
      {
        name: 'Expense History',
        data: expenseHistory,
      },
      {
        name: 'Worker Details',
        data: workerDetails,
      },
      {
        name: 'Category Spending',
        data: categorySpending,
      },
    ],
    `${safeSiteName}_Financial_Report_${today}`
  );

  toast('Site financial report downloaded successfully.', 'ok');
};

  const resetFundForm = () => {
    setFundForm({
      contributorName: '',
      amount: '',
      type: 'INITIAL',
      paymentMode: 'CASH',
      notes: '',
    });

    setFundError('');
  };

  // ==========================================
  // ADD FUNDS
  // ==========================================

  const submitFund = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFundError('');

    const amount = Number(fundForm.amount);

    if (!fundForm.contributorName.trim()) {
      setFundError('Please enter the contributor name.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFundError('Please enter a valid amount.');
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(fundForm.amount.trim())) {
      setFundError('Amount can have a maximum of 2 decimal places.');
      return;
    }

    if (!id) return;

    setFundSaving(true);

    try {
      await send('post', E.funds, {
        siteId: id,
        contributorName: fundForm.contributorName.trim(),
        amount,
        type: fundForm.type,
        paymentMode: fundForm.paymentMode,
        notes: fundForm.notes.trim(),
      });

      setFundModal(false);
      resetFundForm();

      await loadFunds();

      toast('Funds added successfully.', 'ok');
    } catch (error) {
      setFundError(errMsg(error));
    } finally {
      setFundSaving(false);
    }
  };

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (siteLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // ==========================================
  // SITE NOT FOUND
  // ==========================================

  if (!site) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-400" />

        <h2 className="text-lg font-semibold text-slate-800">
          Site not found
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          This site may have been deleted or is unavailable.
        </p>

        <button
          onClick={() => navigate('/admin/sites')}
          className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to Sites
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* BACK BUTTON */}

      <button
        onClick={() => navigate('/admin/sites')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600"
      >
        <ArrowLeft size={17} />
        Back to Sites
      </button>

      {/* SITE HEADER */}

      <section className="relative overflow-hidden rounded-[26px] bg-[#111d36] p-6 text-white shadow-xl sm:p-8">

        <div className="pointer-events-none absolute -right-16 -top-32 h-80 w-80 rounded-full border-[35px] border-white/[0.035]" />

        <div className="pointer-events-none absolute -bottom-44 right-40 h-80 w-80 rounded-full border-[35px] border-white/[0.035]" />

        <div className="relative">

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">

            <div className="flex items-start gap-4">

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-indigo-300">
                <Building2 size={30} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
                  Construction Site
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  {site.name}
                </h1>

                <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                  <MapPin size={16} />
                  {site.address || 'Location not specified'}
                </div>

                {site.description && (
                  <p className="mt-2 max-w-xl text-sm text-slate-400">
                    {site.description}
                  </p>
                )}
              </div>

            </div>

            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold ${
                site.isCompleted
                  ? 'border-blue-400/20 bg-blue-400/10 text-blue-300'
                  : site.isActive
                    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                    : 'border-slate-400/20 bg-slate-400/10 text-slate-300'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />

              {canViewFunds && canViewExpenses && (
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={fundLoading || expenseLoading || workerLoading}
                  className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={17} />
                  Export Excel
                </button>
              )}

              {site.isCompleted
                ? 'Completed'
                : site.isActive
                  ? 'Active'
                  : 'Inactive'}
            </span>

          </div>

          {/* SITE FINANCIAL METRICS */}

          <div className="mt-8 grid grid-cols-1 gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">

            <HeaderMetric
              title="Total Funds Received"
              amount={totalReceived}
              loading={fundLoading}
              icon={<Wallet size={19} />}
            />

            <HeaderMetric
              title="Total Spent"
              amount={totalSpent}
              loading={expenseLoading}
              icon={<Receipt size={19} />}
              onClick={() => setActiveTab('expenses')}
            />

            <HeaderMetric
              title="Available Balance"
              amount={availableBalance}
              loading={fundLoading || expenseLoading}
              icon={<IndianRupee size={19} />}
              green
            />

          </div>

        </div>
      </section>

      {/* TABS */}

      <div className="border-b border-slate-200">
        <div className="flex gap-2 overflow-x-auto">

          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-t-xl border-b-[3px] px-5 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}

        </div>
      </div>

      {/* ======================================
          FUNDS TAB
      ====================================== */}

      {activeTab === 'funds' && (
        <div className="space-y-6">

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Fund Management
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Monitor all funds received for this construction site.
              </p>
            </div>

            {canAllocateFunds && (
              <button
                onClick={() => {
                  resetFundForm();
                  setFundModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
              >
                <Plus size={18} />
                Add Funds
              </button>
            )}

          </div>

          {/* FUND SUMMARY */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

            <SummaryCard
              title="Total Received"
              amount={totalReceived}
              icon={<Wallet size={21} />}
              color="indigo"
              loading={fundLoading}
            />

            <SummaryCard
              title="Initial Funds"
              amount={funds
                .filter(f => f.type === 'INITIAL')
                .reduce((sum, f) => sum + Number(f.amount || 0), 0)}
              icon={<CheckCircle2 size={21} />}
              color="emerald"
              loading={fundLoading}
            />

            <SummaryCard
              title="Additional Funds"
              amount={funds
                .filter(f => f.type === 'ADDITIONAL')
                .reduce((sum, f) => sum + Number(f.amount || 0), 0)}
              icon={<TrendingUp size={21} />}
              color="blue"
              loading={fundLoading}
            />

          </div>

          {/* FUND HISTORY */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center">

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Fund Allocation History
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Complete record of funds received for this site.
                </p>
              </div>

              <span className="w-fit rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                {funds.length} Records
              </span>

            </div>

            {fundLoading ? (
              <LoadingState />
            ) : funds.length === 0 ? (
              <EmptyState
                icon={<Wallet size={25} />}
                title="No funds received yet"
                description="Contributions added to this site will appear here."
              />
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-[850px] text-left">

                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-bold">Contributor</th>
                      <th className="px-5 py-4 font-bold">Date</th>
                      <th className="px-5 py-4 font-bold">Payment Mode</th>
                      <th className="px-5 py-4 font-bold">Added By</th>
                      <th className="px-5 py-4 font-bold">Remarks</th>
                      <th className="px-5 py-4 text-right font-bold">Amount</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {funds.map(fund => (
                      <tr
                        key={fund.id}
                        className="transition hover:bg-slate-50/80"
                      >

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                              <User size={18} />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-800">
                                {fund.contributorName || fund.workerName || '—'}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                Fund Contributor
                              </p>
                            </div>

                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <CalendarDays size={15} className="text-slate-400" />
                            {fmtDate(fund.createdAt)}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                            <CreditCard size={16} className="text-slate-400" />
                            {paymentModes.find(
                              mode => mode.value === fund.paymentMode
                            )?.label || fund.paymentMode || '—'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-slate-600">
                          {fund.createdByName || 'Admin'}
                        </td>

                        <td className="max-w-[200px] px-5 py-4 text-sm text-slate-500">
                          <span className="block truncate">
                            {fund.notes || '—'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-slate-900">
                          {inr(fund.amount)}
                        </td>

                      </tr>
                    ))}

                  </tbody>
                </table>

              </div>
            )}

          </div>

        </div>
      )}

      {/* ======================================
          EXPENSES TAB
      ====================================== */}

      {activeTab === 'expenses' && (
        <div className="space-y-6">

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Site Expenses
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              All expenses associated with {site.name}.
            </p>
          </div>

          {/* EXPENSE SUMMARY */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <SummaryCard
              title="Total Spent"
              amount={totalSpent}
              icon={<Receipt size={21} />}
              color="indigo"
              loading={expenseLoading}
            />

            <SummaryCard
              title="Approved Expenses"
              amount={approvedAmount}
              icon={<CheckCircle2 size={21} />}
              color="emerald"
              loading={expenseLoading}
            />

            <SummaryCard
              title="Recorded Expenses"
              amount={recordedAmount}
              icon={<Banknote size={21} />}
              color="blue"
              loading={expenseLoading}
            />

            <SummaryCard
              title="Pending Expenses"
              amount={pendingAmount}
              icon={<Clock size={21} />}
              color="amber"
              loading={expenseLoading}
            />

          </div>

          {/* UTILIZATION */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex flex-wrap items-center justify-between gap-3">

              <div>
                <h3 className="font-bold text-slate-900">
                  Fund Utilization
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Percentage of received funds used by this site.
                </p>
              </div>

              <span className="text-2xl font-bold text-indigo-600">
                {utilization.toFixed(1)}%
              </span>

            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${utilization}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
              <span>Spent: {inr(totalSpent)}</span>
              <span>Available: {inr(availableBalance)}</span>
            </div>

          </div>

          {/* CATEGORY WISE SPENDING */}

          <CategorySpending
            expenses={expenses}
            loading={expenseLoading}
          />

          {/* EXPENSE HISTORY */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-5 py-5">
              <h3 className="font-bold text-slate-900">
                Expense History
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                All expenses recorded for this site.
              </p>
            </div>

            {expenseLoading ? (
              <LoadingState />
            ) : expenses.length === 0 ? (
              <EmptyState
                icon={<Receipt size={25} />}
                title="No expenses found"
                description="Expenses related to this site will appear here."
              />
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-[800px] text-left">

                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Expense</th>
                      <th className="px-5 py-4">Worker</th>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Amount</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {expenses.map(expense => (
                      <tr key={expense.id} className="hover:bg-slate-50/70">

                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {expense.category || 'Expense'}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {expense.description || 'No description'}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {expense.workerName || expense.addedByName || 'Admin'}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {fmtDate(expense.expenseDate || expense.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={expense.status} />
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-slate-900">
                          {inr(expense.amount)}
                        </td>

                      </tr>
                    ))}

                  </tbody>
                </table>

              </div>
            )}

          </div>

        </div>
      )}

      {/* ======================================
          WORKERS TAB
      ====================================== */}

      {activeTab === 'workers' && (
        <div className="space-y-5">

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Site Workers
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Worker allocation and financial summary for {site.name}.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className="text-sm text-slate-500">
                Total Assigned:
              </span>

              <span className="ml-2 text-lg font-bold text-indigo-600">
                {workers.length}
              </span>
            </div>

          </div>

          {/* WORKER FINANCIAL SUMMARY */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

            <SummaryCard
              title="Total Paid to Workers"
              amount={workers.reduce(
                (sum, worker) => sum + Number(worker.totalAllocated || 0),
                0
              )}
              icon={<Wallet size={21} />}
              color="indigo"
              loading={workerLoading}
            />

            <SummaryCard
              title="Total Worker Spending"
              amount={workers.reduce(
                (sum, worker) =>
                  sum +
                  Number(worker.approvedAmount || 0) +
                  Number(worker.recordedAmount || 0),
                0
              )}
              icon={<Receipt size={21} />}
              color="blue"
              loading={workerLoading}
            />

            <SummaryCard
              title="Remaining Worker Balance"
              amount={workers.reduce(
                (sum, worker) =>
                  sum +
                  Number(worker.totalAllocated || 0) -
                  Number(worker.approvedAmount || 0) -
                  Number(worker.recordedAmount || 0),
                0
              )}
              icon={<CircleDollarSign size={21} />}
              color="emerald"
              loading={workerLoading}
            />

          </div>

          {/* WORKER HISTORY TABLE */}

          {workerLoading ? (
            <div className="flex justify-center rounded-2xl border border-slate-200 bg-white py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : workers.length === 0 ? (
            <EmptyState
              icon={<HardHat size={25} />}
              title="No Workers Assigned"
              description="No workers have been assigned to this construction site yet."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-5">
                <h3 className="font-bold text-slate-900">
                  Worker Financial Details
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Funds allocated, expenses and remaining balance for each worker.
                </p>
              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[1050px] text-left">

                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Worker</th>
                      <th className="px-5 py-4">Phone Number</th>
                      <th className="px-5 py-4 text-right">Total Paid</th>
                      <th className="px-5 py-4 text-right">Total Spent</th>
                      <th className="px-5 py-4 text-right">Pending</th>
                      <th className="px-5 py-4 text-right">Balance</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {workers.map(worker => {
                      const totalPaid = Number(worker.totalAllocated || 0);

                      const totalSpent =
                        Number(worker.approvedAmount || 0) +
                        Number(worker.recordedAmount || 0);

                      const pending = Number(worker.pendingAmount || 0);

                      const balance = totalPaid - totalSpent;

                      return (
                        <tr
                          key={worker.id}
                          className="transition hover:bg-slate-50"
                        >

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">

                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-600">
                                {worker.name?.charAt(0)?.toUpperCase() || 'W'}
                              </div>

                              <div>
                                <p className="font-semibold text-slate-800">
                                  {worker.name}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  Construction Worker
                                </p>
                              </div>

                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {worker.phone || '—'}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-slate-800">
                            {inr(totalPaid)}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-red-600">
                            {inr(totalSpent)}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-amber-600">
                            {inr(pending)}
                          </td>

                          <td className="px-5 py-4 text-right font-bold text-emerald-600">
                            {inr(balance)}
                          </td>

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                                worker.isActive && !worker.pendingApproval
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />

                              {worker.isActive && !worker.pendingApproval
                                ? 'Active'
                                : worker.pendingApproval
                                  ? 'Pending Approval'
                                  : 'Inactive'}
                            </span>

                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================
          ACTIVITY TAB
      ====================================== */}

      {activeTab === 'activity' && (
        <EmptyState
          icon={<FileText size={25} />}
          title="Site Activity"
          description="Recent site activities will appear here."
        />
      )}

      {/* ======================================
          ADD FUNDS MODAL
      ====================================== */}

      {fundModal && canAllocateFunds && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={event => {
            if (
              event.target === event.currentTarget &&
              !fundSaving
            ) {
              setFundModal(false);
            }
          }}
        >

          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

            <div className="flex items-center justify-between bg-[#111d36] px-6 py-5 text-white">

              <div className="flex items-center gap-4">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-white">
                  <Wallet size={23} />
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    Add Funds
                  </h2>

                  <p className="mt-1 text-sm text-slate-300">
                    Record a new site contribution.
                  </p>
                </div>

              </div>

              <button
                type="button"
                disabled={fundSaving}
                onClick={() => setFundModal(false)}
                className="rounded-xl bg-white/10 p-2.5 text-slate-300 transition hover:bg-white/20 hover:text-white"
              >
                <X size={19} />
              </button>

            </div>

            <form onSubmit={submitFund} className="space-y-5 p-6">

              <FormField label="Construction Site">
                <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5 text-sm font-semibold text-slate-800">
                  <Building2 size={18} className="text-indigo-600" />
                  {site.name}
                </div>
              </FormField>

              <FormField label="Fund Given By" required>
                <div className="relative">

                  <User
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={fundForm.contributorName}
                    onChange={event =>
                      setFundForm(prev => ({
                        ...prev,
                        contributorName: event.target.value,
                      }))
                    }
                    placeholder="Enter contributor name"
                    className="w-full rounded-xl border border-slate-200 py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    required
                  />

                </div>
              </FormField>

              <FormField label="Amount" required>
                <div className="relative">

                  <IndianRupee
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={fundForm.amount}
                    onChange={event =>
                      setFundForm(prev => ({
                        ...prev,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="Enter amount in rupees"
                    className="w-full rounded-xl border border-slate-200 py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    required
                  />

                </div>
              </FormField>

              <FormField label="Fund Type" required>
                <select
                  value={fundForm.type}
                  onChange={event =>
                    setFundForm(prev => ({
                      ...prev,
                      type: event.target.value as 'INITIAL' | 'ADDITIONAL',
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="INITIAL">Initial Allocation</option>
                  <option value="ADDITIONAL">Additional Funds</option>
                </select>
              </FormField>

              <FormField label="Payment Mode" required>
                <div className="relative">

                  <CreditCard
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={fundForm.paymentMode}
                    onChange={event =>
                      setFundForm(prev => ({
                        ...prev,
                        paymentMode: event.target.value,
                      }))
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  >
                    {paymentModes.map(mode => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>

                </div>
              </FormField>

              <FormField label="Remarks">
                <textarea
                  rows={3}
                  value={fundForm.notes}
                  onChange={event =>
                    setFundForm(prev => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Add additional details..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </FormField>

              {fundError && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {fundError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  disabled={fundSaving}
                  onClick={() => {
                    setFundModal(false);
                    resetFundForm();
                  }}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={fundSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {fundSaving ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      Save Funds
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// HEADER METRIC
// ==========================================

function HeaderMetric({
  title,
  amount,
  loading,
  icon,
  green = false,
  onClick,
}: {
  title: string;
  amount: number;
  loading: boolean;
  icon: ReactNode;
  green?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        green
          ? 'border-emerald-400/20 bg-emerald-400/[0.08]'
          : 'border-white/10 bg-white/[0.05]'
      } ${
        onClick
          ? 'cursor-pointer hover:border-indigo-400/50 hover:bg-white/10'
          : 'cursor-default'
      }`}
    >

      <div className="flex items-center justify-between">

        <p className={`text-xs font-medium ${
          green ? 'text-emerald-200' : 'text-slate-400'
        }`}>
          {title}
        </p>

        <div className={`rounded-xl p-2 ${
          green
            ? 'bg-emerald-400/10 text-emerald-300'
            : 'bg-white/10 text-indigo-300'
        }`}>
          {icon}
        </div>

      </div>

      <p className={`mt-3 text-xl font-bold tracking-tight ${
        green ? 'text-emerald-300' : 'text-white'
      }`}>
        {loading ? 'Loading...' : inr(amount)}
      </p>

      {onClick && (
        <p className="mt-2 text-xs text-indigo-300">
          View expenses →
        </p>
      )}

    </button>
  );
}

// ==========================================
// SUMMARY CARD
// ==========================================

function SummaryCard({
  title,
  amount,
  value,
  icon,
  color,
  loading = false,
}: {
  title: string;
  amount?: number;
  value?: string;
  icon: ReactNode;
  color: 'indigo' | 'blue' | 'emerald' | 'amber';
  loading?: boolean;
}) {
  const styles = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex items-center justify-between">

        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <div className={`rounded-xl p-3 ${styles[color]}`}>
          {icon}
        </div>

      </div>

      <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        {loading
          ? 'Loading...'
          : value ?? inr(amount ?? 0)}
      </h3>

    </div>
  );
}

// ==========================================
// FORM FIELD
// ==========================================

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>

      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      {children}

    </div>
  );
}

// ==========================================
// EMPTY STATE
// ==========================================

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm">

      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        {icon}
      </div>

      <h3 className="text-lg font-bold text-slate-900">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {description}
      </p>

    </div>
  );
}

// ==========================================
// LOADING STATE
// ==========================================

function LoadingState() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  );
}

// ==========================================
// EXPENSE STATUS BADGE
// ==========================================

function StatusBadge({
  status,
}: {
  status: Expense['status'];
}) {
  const styles = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    REJECTED: 'bg-red-50 text-red-700 border-red-100',
    RECORDED: 'bg-blue-50 text-blue-700 border-blue-100',
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${styles[status]}`}>
      {status}
    </span>
  );
}

// ==========================================
// CATEGORY WISE SPENDING
// ==========================================

function CategorySpending({
  expenses,
  loading,
}: {
  expenses: Expense[];
  loading: boolean;
}) {
  const categoryTotals = expenses
    .filter(expense =>
      ['APPROVED', 'RECORDED'].includes(expense.status)
    )
    .reduce<Record<string, number>>((result, expense) => {
      const category = expense.category || 'Uncategorized';

      result[category] =
        (result[category] || 0) + Number(expense.amount || 0);

      return result;
    }, {});

  const categories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]);

  const total = categories.reduce(
    (sum, [, amount]) => sum + amount,
    0
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div>
        <h3 className="font-bold text-slate-900">
          Category-wise Spending
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Breakdown of approved and recorded expenses.
        </p>
      </div>

      {loading ? (
        <LoadingState />
      ) : categories.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          No spending data available yet.
        </p>
      ) : (
        <div className="mt-7 space-y-6">

          {categories.map(([category, amount]) => {
            const percentage = total > 0
              ? (amount / total) * 100
              : 0;

            return (
              <div key={category}>

                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

                  <span className="text-sm font-semibold text-slate-700">
                    {category}
                  </span>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-900">
                      {inr(amount)}
                    </span>

                    <span className="text-xs text-slate-400">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>

                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}