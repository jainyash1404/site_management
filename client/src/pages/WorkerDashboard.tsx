import { useEffect, useRef, useState, type FormEvent } from 'react';

import {
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Receipt,
  UploadCloud,
  X,
  ArrowUpRight,
  Building2,
  IndianRupee,
  FileImage,
  Sparkles,
  CalendarDays,
  Search,
  RefreshCw,
} from 'lucide-react';

import { E, errMsg, http, list } from '../api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';

import {
  Badge,
  ReceiptButton,
} from '../components/ui';

import {
  fmtDate,
  inr,
  num,
} from '../lib/format';

import type {
  Expense,
  ExpenseCategory,
  Site,
} from '../types';

const OK = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_FILES = 5;
const MAX_SIZE = 5 * 1024 * 1024;

export default function WorkerDashboard() {
  const toast = useToast();

  const {
    data,
    error,
    loading,
    reload,
  } = useApi(async () => ({
    x: await list<Expense>(E.myExpenses),

    s: (await list<Site>(E.sites))
      .items
      .filter(s => s.isActive),

    c: (await list<ExpenseCategory>(E.categories))
      .items
      .filter(c => c.isActive),
  }));

  const [v, setV] = useState({
    siteId: '',
    amount: '',
    category: '',
    subcategory: '',
    description: '',
  });

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  const selectedCategory = data?.c.find(
    c => c.name === v.category,
  );

  const subcategories = (selectedCategory?.subcategories ?? [])
    .filter(s => s.isActive);

  // Receipt previews
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));

    setPreviews(urls);

    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);

  // Select and validate multiple receipt images
  const pick = (selectedFiles?: FileList | File[]) => {
    if (!selectedFiles?.length) return;

    const incoming = Array.from(selectedFiles);
    const remaining = MAX_FILES - files.length;

    if (remaining <= 0) {
      setErrs(x => ({
        ...x,
        file: 'Maximum 5 receipt images are allowed',
      }));
      return;
    }

    if (incoming.length > remaining) {
      setErrs(x => ({
        ...x,
        file: `You can upload only ${remaining} more image(s)`,
      }));
      return;
    }

    const validFiles: File[] = [];

    for (const file of incoming) {
      if (!OK.includes(file.type)) {
        setErrs(x => ({
          ...x,
          file: 'Only JPG, PNG or WEBP images are allowed',
        }));
        continue;
      }

      if (file.size > MAX_SIZE) {
        setErrs(x => ({
          ...x,
          file: `${file.name} exceeds the 5 MB limit`,
        }));
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length) {
      setFiles(prev => [...prev, ...validFiles]);

      setErrs(x => ({
        ...x,
        file: '',
      }));
    }

    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  // Remove individual receipt
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));

    setErrs(x => ({
      ...x,
      file: '',
    }));

    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  // Clear all receipts
  const clear = () => {
    setFiles([]);

    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  // Submit expense
  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (busy) return;

    const er: Record<string, string> = {};

    if (!v.siteId) {
      er.siteId = 'Select a site';
    }

    if (!(Number(v.amount) > 0)) {
      er.amount = 'Enter a valid amount';
    }

    if (!v.category) {
      er.category = 'Select a category';
    }

    if (subcategories.length > 0 && !v.subcategory) {
      er.subcategory = 'Select a subcategory';
    }

    if (errs.file) {
      er.file = errs.file;
    }

    setErrs(er);

    if (Object.keys(er).length) return;

    const fd = new FormData();

    fd.append('siteId', v.siteId);
    fd.append('amount', v.amount);
    fd.append('category', v.category);
    fd.append('subcategory', v.subcategory);
    fd.append('description', v.description.trim());

    files.forEach(file => {
      fd.append('receipts', file);
    });

    setBusy(true);

    try {
      await http.post(E.expenses, fd);

      toast('Expense submitted for approval');

      setV({
        siteId: '',
        amount: '',
        category: '',
        subcategory: '',
        description: '',
      });

      clear();

      setErrs({});

      reload();
    } catch (x) {
      toast(errMsg(x), 'err');
    } finally {
      setBusy(false);
    }
  };

  const sm = data?.x.summary ?? {};
  const expenses = data?.x.items ?? [];

  const filteredExpenses = expenses.filter(e => {
    const q = search.toLowerCase();

    return (
      e.siteName?.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.subcategory?.toLowerCase().includes(q) ||
      e.status.toLowerCase().includes(q)
    );
  });

  const stats = [
    {
      title: 'Funds Received',
      value: inr(sm.totalAllocated),
      description: 'Total funds allocated',
      icon: Wallet,
      color: 'blue',
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Approved Expenses',
      value: inr(sm.approvedAmount),
      description: 'Successfully approved',
      icon: CheckCircle2,
      color: 'emerald',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Available Balance',
      value: inr(sm.availableBalance),
      description: 'Remaining amount',
      icon: TrendingUp,
      color: 'green',
      iconBg: 'bg-green-50 text-green-600',
    },
    {
      title: 'Pending Expenses',
      value: inr(sm.pendingAmount),
      description: `${num(sm.pendingCount)} awaiting approval`,
      icon: Clock,
      color: 'amber',
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'Rejected Expenses',
      value: inr(sm.rejectedAmount),
      description: `${num(sm.rejectedCount)} rejected`,
      icon: XCircle,
      color: 'red',
      iconBg: 'bg-red-50 text-red-600',
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 pb-10">

      {/* WELCOME HEADER */}

      <section className="relative overflow-hidden rounded-2xl bg-slate-950 p-7 text-white">

        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border-[45px] border-white/5" />

        <div className="absolute bottom-[-100px] right-[25%] h-60 w-60 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">

          <div>

            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-300">
              <Sparkles size={15} />
              WORKER WORKSPACE
            </div>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              My Dashboard<span className="text-blue-400">.</span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Manage your construction expenses, track available funds
              and monitor your expense approvals in one place.
            </p>

          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">

            <div className="rounded-xl bg-blue-500/20 p-3 text-blue-300">
              <Wallet size={25} />
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Available Balance
              </p>

              <p className="mt-1 text-2xl font-bold">
                {inr(sm.availableBalance)}
              </p>
            </div>

          </div>

        </div>

        <div className="relative mt-7 flex flex-wrap items-center gap-5 border-t border-white/10 pt-5 text-xs text-slate-400">

          <div className="flex items-center gap-2">
            <Building2 size={14} />
            {data?.s.length ?? 0} Active Sites
          </div>

          <div className="flex items-center gap-2">
            <Receipt size={14} />
            {expenses.length} Total Expenses
          </div>

          <div className="flex items-center gap-2">
            <CalendarDays size={14} />
            Expense Management
          </div>

        </div>

      </section>

      {/* STATISTICS */}

      <section>

        <div className="mb-4 flex items-center justify-between">

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Financial Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your complete funds and expense summary.
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

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

                  <div className={`rounded-xl p-3 ${item.iconBg}`}>
                    <Icon size={21} />
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

      {/* MAIN CONTENT */}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">

        {/* EXPENSE FORM */}

        <div className="xl:col-span-8">

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-100 p-6">

              <div>

                <div className="flex items-center gap-2">

                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <Receipt size={19} />
                  </div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Submit an Expense
                  </h2>

                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Submit your bills and payment receipts for approval.
                </p>

              </div>

              <span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 sm:block">
                Expense Submission
              </span>

            </div>

            <form
              onSubmit={submit}
              noValidate
              className="space-y-5 p-6"
            >

              {/* SITE + AMOUNT */}

              <div className="grid gap-5 sm:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Construction Site *
                  </label>

                  <div className="relative">

                    <Building2
                      size={17}
                      className="absolute left-3 top-3.5 text-slate-400"
                    />

                    <select
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      value={v.siteId}
                      onChange={e =>
                        setV({
                          ...v,
                          siteId: e.target.value,
                        })
                      }
                    >

                      <option value="">
                        Select construction site
                      </option>

                      {data?.s.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}

                    </select>

                  </div>

                  {errs.siteId && (
                    <p className="mt-1 text-xs text-red-500">
                      {errs.siteId}
                    </p>
                  )}

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Expense Amount *
                  </label>

                  <div className="relative">

                    <IndianRupee
                      size={17}
                      className="absolute left-3 top-3.5 text-slate-400"
                    />

                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      inputMode="decimal"
                      placeholder="Enter amount"
                      value={v.amount}
                      onChange={e =>
                        setV({
                          ...v,
                          amount: e.target.value,
                        })
                      }
                    />

                  </div>

                  {errs.amount && (
                    <p className="mt-1 text-xs text-red-500">
                      {errs.amount}
                    </p>
                  )}

                </div>

              </div>

              {/* CATEGORY + DESCRIPTION */}

              <div className="grid gap-5 sm:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Expense Category *
                  </label>

                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    value={v.category}
                    onChange={e =>
                      setV({
                        ...v,
                        category: e.target.value,
                        subcategory: '',
                      })
                    }
                  >

                    <option value="">
                      Select category
                    </option>

                    {data?.c.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}

                  </select>

                  {errs.category && (
                    <p className="mt-1 text-xs text-red-500">
                      {errs.category}
                    </p>
                  )}

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Description
                  </label>

                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    placeholder="What was this expense for?"
                    value={v.description}
                    onChange={e =>
                      setV({
                        ...v,
                        description: e.target.value,
                      })
                    }
                  />

                </div>

              </div>

              {/* SUBCATEGORY */}

              {v.category && subcategories.length > 0 && (

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Expense Subcategory *
                  </label>

                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    value={v.subcategory}
                    onChange={e =>
                      setV({
                        ...v,
                        subcategory: e.target.value,
                      })
                    }
                  >

                    <option value="">
                      Select subcategory
                    </option>

                    {subcategories.map(sub => (
                      <option key={sub.id} value={sub.name}>
                        {sub.name}
                      </option>
                    ))}

                  </select>

                  {errs.subcategory && (
                    <p className="mt-1 text-xs text-red-500">
                      {errs.subcategory}
                    </p>
                  )}

                </div>

              )}

              {/* MULTIPLE RECEIPT UPLOAD */}

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label className="block text-sm font-semibold text-slate-700">
                    Bill / Receipt Images
                  </label>

                  <span className="text-xs text-slate-400">
                    {files.length}/{MAX_FILES} uploaded
                  </span>

                </div>

                <div
                  onClick={() => {
                    if (files.length < MAX_FILES) {
                      fileRef.current?.click();
                    }
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    pick(e.dataTransfer.files);
                  }}
                  className={`rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-7 text-center transition hover:border-blue-400 hover:bg-blue-50/40 ${
                    files.length >= MAX_FILES
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer'
                  }`}
                >

                  <input
                    ref={fileRef}
                    type="file"
                    hidden
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => pick(e.target.files ?? undefined)}
                  />

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <UploadCloud size={27} />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-slate-700">
                    {files.length >= MAX_FILES
                      ? 'Maximum 5 images selected'
                      : 'Click to upload or drag and drop'}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    JPG, PNG or WEBP · Maximum 5 MB per image · Up to 5 images
                  </p>

                </div>

                {errs.file && (
                  <p className="mt-2 text-xs text-red-500">
                    {errs.file}
                  </p>
                )}

                {/* IMAGE PREVIEWS */}

                {files.length > 0 && (

                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">

                    {files.map((file, index) => (

                      <div
                        key={`${file.name}-${index}`}
                        className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-2"
                      >

                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute right-3 top-3 z-10 rounded-full bg-red-500 p-1.5 text-white shadow hover:bg-red-600"
                          aria-label="Remove receipt"
                        >
                          <X size={14} />
                        </button>

                        <img
                          src={previews[index]}
                          alt={`Receipt ${index + 1}`}
                          className="h-28 w-full rounded-lg object-cover"
                        />

                        <p className="mt-2 truncate text-xs font-semibold text-slate-700">
                          {file.name}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>

                      </div>

                    ))}

                  </div>

                )}

                {files.length > 0 && (

                  <button
                    type="button"
                    onClick={clear}
                    className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    <X size={14} />
                    Remove All Receipts
                  </button>

                )}

              </div>

              {/* SUBMIT */}

              <div className="flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">

                <p className="text-xs leading-5 text-slate-400">
                  Make sure the amount and receipt details are correct
                  before submitting.
                </p>

                <button
                  type="submit"
                  disabled={busy}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {busy ? (
                    <>
                      <RefreshCw size={17} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Expense
                      <ArrowUpRight size={17} />
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

        {/* QUICK INFORMATION */}

        <div className="space-y-5 xl:col-span-4">

          {/* BALANCE CARD */}

          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 to-blue-950 p-6 text-white shadow-lg">

            <div className="flex items-center justify-between">

              <div className="rounded-xl bg-white/10 p-3">
                <Wallet size={23} />
              </div>

              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100">
                Current Balance
              </span>

            </div>

            <p className="mt-7 text-sm text-blue-100">
              Available funds
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              {inr(sm.availableBalance)}
            </h2>

            <div className="mt-6 border-t border-white/15 pt-4">

              <div className="flex justify-between text-xs text-blue-100">
                <span>Total Funds Received</span>

                <span className="font-semibold text-white">
                  {inr(sm.totalAllocated)}
                </span>
              </div>

              <div className="mt-3 flex justify-between text-xs text-blue-100">
                <span>Approved Expenses</span>

                <span className="font-semibold text-white">
                  {inr(sm.approvedAmount)}
                </span>
              </div>

            </div>

          </div>

          {/* EXPENSE STATUS */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h3 className="font-bold text-slate-900">
              Expense Status
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Your expense approval overview.
            </p>

            <div className="mt-5 space-y-5">

              {[
                {
                  label: 'Approved',
                  count: num(sm.approvedCount),
                  amount: inr(sm.approvedAmount),
                  color: 'bg-emerald-500',
                  icon: CheckCircle2,
                },
                {
                  label: 'Pending',
                  count: num(sm.pendingCount),
                  amount: inr(sm.pendingAmount),
                  color: 'bg-amber-500',
                  icon: Clock,
                },
                {
                  label: 'Rejected',
                  count: num(sm.rejectedCount),
                  amount: inr(sm.rejectedAmount),
                  color: 'bg-red-500',
                  icon: XCircle,
                },
              ].map(item => {

                const Icon = item.icon;

                return (
                  <div key={item.label}>

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-2">
                        <Icon size={16} className="text-slate-400" />

                        <span className="text-sm font-medium text-slate-700">
                          {item.label}
                        </span>
                      </div>

                      <span className="text-sm font-bold text-slate-800">
                        {item.count}
                      </span>

                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">

                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{
                          width: `${
                            expenses.length
                              ? Math.min(
                                  100,
                                  (Number(item.count) / expenses.length) * 100,
                                )
                              : 0
                          }%`,
                        }}
                      />

                    </div>

                    <p className="mt-1 text-right text-xs text-slate-400">
                      {item.amount}
                    </p>

                  </div>
                );
              })}

            </div>

          </div>

          {/* ACTIVE SITES */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between">

              <h3 className="font-bold text-slate-900">
                My Active Sites
              </h3>

              <Building2 size={19} className="text-blue-600" />

            </div>

            <div className="mt-4 space-y-3">

              {data?.s.length ? (

                data.s.map(site => (

                  <div
                    key={site.id}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
                  >

                    <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                      <Building2 size={17} />
                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-sm font-semibold text-slate-800">
                        {site.name}
                      </p>

                      <p className="text-xs text-emerald-600">
                        Active Project
                      </p>

                    </div>

                  </div>

                ))

              ) : (

                <p className="py-4 text-center text-sm text-slate-400">
                  No active sites available.
                </p>

              )}

            </div>

          </div>

        </div>

      </section>

      {/* MY EXPENSES */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center">

          <div>

            <div className="flex items-center gap-2">

              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <FileImage size={19} />
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                My Expenses
              </h2>

            </div>

            <p className="mt-2 text-sm text-slate-500">
              Track your submitted bills and approval history.
            </p>

          </div>

          <div className="relative">

            <Search
              size={17}
              className="absolute left-3 top-3 text-slate-400"
            />

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search expenses..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
            />

          </div>

        </div>

        {!expenses.length ? (

          <div className="p-14 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Receipt size={30} />
            </div>

            <h3 className="mt-4 font-bold text-slate-800">
              No expenses submitted yet
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Your submitted expenses will appear here.
            </p>

          </div>

        ) : !filteredExpenses.length ? (

          <div className="p-10 text-center text-sm text-slate-500">
            No matching expenses found.
          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">

                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Site</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Review Note</th>
                  <th className="px-6 py-4">Receipts</th>
                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredExpenses.map(e => {

                  const receiptUrls = e.receiptUrls?.length
                    ? e.receiptUrls
                    : e.receiptUrl
                      ? [e.receiptUrl]
                      : [];

                  return (

                    <tr
                      key={e.id}
                      className="transition hover:bg-slate-50"
                    >

                      <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-600">
                        {fmtDate(e.createdAt)}
                      </td>

                      <td className="px-6 py-5">

                        <div className="flex items-center gap-2">

                          <Building2 size={16} className="text-slate-400" />

                          <span className="text-sm font-medium text-slate-800">
                            {e.siteName}
                          </span>

                        </div>

                      </td>

                      <td className="px-6 py-5">

                        <p className="text-sm font-medium text-slate-700">
                          {e.category}
                        </p>

                        {e.subcategory && (
                          <p className="mt-1 text-xs text-slate-400">
                            {e.subcategory}
                          </p>
                        )}

                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-sm font-bold text-slate-900">
                        {inr(e.amount)}
                      </td>

                      <td className="px-6 py-5">
                        <Badge status={e.status} />
                      </td>

                      <td className="max-w-[200px] px-6 py-5 text-sm text-slate-500">
                        {e.reviewNote || '—'}
                      </td>

                      <td className="px-6 py-5">

                        {receiptUrls.length > 0 ? (

                          <div className="flex flex-wrap gap-2">

                            {receiptUrls.map((url, index) => (
                              <ReceiptButton
                                key={`${e.id}-receipt-${index}`}
                                url={url}
                              />
                            ))}

                          </div>

                        ) : (
                          <span className="text-xs text-slate-400">
                            —
                          </span>
                        )}

                      </td>

                    </tr>

                  );
                })}

              </tbody>

            </table>

          </div>

        )}

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500">
          Showing {filteredExpenses.length} of {expenses.length} expenses
        </div>

      </section>

    </div>
  );
}