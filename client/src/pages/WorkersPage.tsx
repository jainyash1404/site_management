import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import {
  Users,
  UserCheck,
  UserX,
  Wallet,
  Plus,
  Search,
  Edit3,
  History,
  Phone,
  Mail,
  X,
  Check,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  UserRound,
  Building2,
  CheckCircle2,
} from 'lucide-react';

import { E, errMsg, list, send } from '../api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { inr } from '../lib/format';
import type { Worker, Site } from '../types';

type Filter = 'all' | 'active' | 'inactive';

type WorkerForm = {
  name: string;
  phone: string;
  email: string;
  password: string;
};

type ConfirmAction = {
  worker: Worker;
  action: 'activate' | 'deactivate';
};

type WorkerWithStats = Worker & {
  totalAllocated?: number;
  approvedAmount?: number;
  pendingAmount?: number;
  rejectedAmount?: number;
  availableBalance?: number;
  pendingCount?: number;
  rejectedCount?: number;
};

const emptyForm: WorkerForm = {
  name: '',
  phone: '',
  email: '',
  password: '',
};

export default function WorkersPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission('workers.create');
  const canUpdate = hasPermission('workers.update');
  const canDeactivate = hasPermission('workers.deactivate');

  const canViewFunds = hasPermission('funds.view');
  const canViewExpenses = hasPermission('expenses.view');
  const canViewBalance = canViewFunds && canViewExpenses;

  const {
    data,
    loading,
    error,
    reload,
  } = useApi(
    () => list<WorkerWithStats>(E.workers),
    [],
  );

  const {
    data: sitesData,
    loading: sitesLoading,
    reload: reloadSites,
  } = useApi(
    () => list<Site>(E.sites),
    [],
  );

  const workers = data?.items ?? [];

  const sites = (sitesData?.items ?? []).filter(
    site => site.isActive && !site.isCompleted,
  );

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);

  const [form, setForm] = useState<WorkerForm>(emptyForm);
  const [formError, setFormError] = useState('');

  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');

  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction | null>(null);

  // SITE ASSIGNMENT
  const [assigningWorker, setAssigningWorker] =
    useState<Worker | null>(null);

  const [selectedSites, setSelectedSites] =
    useState<string[]>([]);

  const [assignSaving, setAssignSaving] = useState(false);

  const activeWorkers = workers.filter(w => w.isActive);
  const inactiveWorkers = workers.filter(w => !w.isActive);

  const totalAllocated = workers.reduce(
    (sum, w) => sum + Number(w.totalAllocated || 0),
    0,
  );

  const filteredWorkers = useMemo(() => {
    return workers.filter(worker => {
      const q = search.trim().toLowerCase();

      const matchesSearch =
        !q ||
        worker.name.toLowerCase().includes(q) ||
        worker.phone.includes(q) ||
        (worker.email ?? '').toLowerCase().includes(q);

      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && worker.isActive) ||
        (filter === 'inactive' && !worker.isActive);

      return matchesSearch && matchesFilter;
    });
  }, [workers, search, filter]);

  const openCreate = () => {
    if (!canCreate) return;

    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (worker: Worker) => {
    if (!canUpdate) return;

    setEditing(worker);

    setForm({
      name: worker.name,
      phone: worker.phone,
      email: worker.email ?? '',
      password: '',
    });

    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
  };

  const saveWorker = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (saving) return;

    if (editing && !canUpdate) return;
    if (!editing && !canCreate) return;

    const errors: Record<string, string> = {};

    if (!form.name.trim()) {
      errors.name = 'Worker name is required';
    }

    if (!/^\d{10}$/.test(form.phone.trim())) {
      errors.phone = 'Enter a valid 10-digit phone number';
    }

    if (
      form.email.trim() &&
      !/^\S+@\S+\.\S+$/.test(form.email.trim())
    ) {
      errors.email = 'Enter a valid email address';
    }

    if (!editing && form.password.length < 6) {
      errors.password = 'Password must contain at least 6 characters';
    }

    if (editing && form.password && form.password.length < 6) {
      errors.password = 'Password must contain at least 6 characters';
    }

    if (Object.keys(errors).length) {
      setFormError(Object.values(errors).join('. '));
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const payload: Record<string, string> = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      if (editing) {
        await send('patch', `${E.workers}/${editing.id}`, payload);
        toast('Worker updated successfully');
      } else {
        await send('post', E.workers, payload);
        toast('Worker added successfully');
      }

      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      reload();
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  // OPEN SITE ASSIGNMENT
  const openAssignSites = (worker: Worker) => {
    if (!canUpdate) return;

    setAssigningWorker(worker);

    setSelectedSites(
      worker.assignedSites ?? [],
    );

    reloadSites();
  };

  // SELECT / DESELECT SITE
  const toggleSite = (siteId: string) => {
    setSelectedSites(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId],
    );
  };

  // SAVE SITE ASSIGNMENT
  const saveAssignedSites = async () => {
    if (!assigningWorker || assignSaving) return;

    setAssignSaving(true);

    try {
      await send(
        'patch',
        E.assignWorkerSites(assigningWorker.id),
        {
          assignedSites: selectedSites,
        },
      );

      toast('Sites assigned successfully');

      setAssigningWorker(null);
      setSelectedSites([]);

      reload();
    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setAssignSaving(false);
    }
  };

  const askStatusConfirmation = (worker: Worker) => {
    if (!canDeactivate || busyId) return;

    setConfirmAction({
      worker,
      action: worker.isActive ? 'deactivate' : 'activate',
    });
  };

  const executeStatusChange = async () => {
    if (!confirmAction || busyId || !canDeactivate) return;

    const { worker, action } = confirmAction;

    setBusyId(worker.id);

    try {
      await send(
        'patch',
        E.status(E.workers, worker.id),
        { isActive: action === 'activate' },
      );

      toast(
        action === 'activate'
          ? 'Worker activated successfully'
          : 'Worker deactivated successfully',
      );

      setConfirmAction(null);
      reload();
    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setBusyId('');
    }
  };

  const stats = [
    {
      title: 'Total Workers',
      value: workers.length,
      description: 'All registered workers',
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Active Workers',
      value: activeWorkers.length,
      description: 'Currently working',
      icon: UserCheck,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Inactive Workers',
      value: inactiveWorkers.length,
      description: 'Currently inactive',
      icon: UserX,
      color: 'bg-amber-50 text-amber-600',
    },
    ...(canViewFunds
      ? [{
          title: 'Total Allocated',
          value: inr(totalAllocated),
          description: 'Funds allocated to workers',
          icon: Wallet,
          color: 'bg-violet-50 text-violet-600',
        }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-10">

      {/* HEADER */}

      <section className="relative overflow-hidden rounded-2xl bg-slate-950 p-7 text-white">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[40px] border-white/5" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-300">
              <Users size={15} />
              Workforce Management
            </div>

            <h1 className="text-3xl font-bold">
              Workers Overview<span className="text-blue-400">.</span>
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              Manage your workforce and monitor worker accounts.
            </p>
          </div>

          {canCreate && (
            <button
              onClick={openCreate}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
            >
              <Plus size={18} />
              Add Worker
            </button>
          )}
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-5 border-t border-white/10 pt-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <UserRound size={14} />
            {workers.length} Registered Workers
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck size={14} />
            Workforce Administration
          </div>
        </div>
      </section>

      {/* STATISTICS */}

      <section className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${stats.length === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
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

                  <h2 className="mt-3 text-2xl font-bold text-slate-900">
                    {loading ? '—' : item.value}
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
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
      </section>

      {/* WORKER DIRECTORY */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Worker Directory
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage worker accounts and activity.
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
                placeholder="Search workers..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
              />
            </div>

            <select
              value={filter}
              onChange={e => setFilter(e.target.value as Filter)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All Workers</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              onClick={reload}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading workers...
          </div>
        ) : error ? (
          <div className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
            Unable to load workers. Please refresh and try again.
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="p-14 text-center">
            <Users className="mx-auto mb-4 text-slate-300" size={40} />

            <h3 className="font-semibold text-slate-800">
              No workers found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or filter.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Worker</th>
                    <th className="px-5 py-4">Contact</th>

                    {canViewFunds && (
                      <th className="px-5 py-4">Allocated</th>
                    )}

                    {canViewExpenses && (
                      <th className="px-5 py-4">Pending</th>
                    )}

                    {canViewBalance && (
                      <th className="px-5 py-4">Balance</th>
                    )}

                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredWorkers.map(worker => (
                    <tr
                      key={worker.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">
                            {worker.name.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {worker.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              ID: {worker.id.slice(-6).toUpperCase()}
                            </p>

                            <div className="mt-1 flex flex-wrap gap-1">
                              {worker.pendingApproval && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                  Awaiting Approval
                                </span>
                              )}

                              {worker.resetRequested && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                                  Password Reset Requested
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <div className="space-y-1">
                          <p className="flex items-center gap-2 text-sm text-slate-700">
                            <Phone size={13} className="text-slate-400" />
                            {worker.phone}
                          </p>

                          <p className="flex items-center gap-2 text-xs text-slate-400">
                            <Mail size={13} />
                            {worker.email || 'No email'}
                          </p>
                        </div>
                      </td>

                      {canViewFunds && (
                        <td className="whitespace-nowrap px-5 py-5 text-sm font-semibold text-slate-800">
                          {inr(worker.totalAllocated)}
                        </td>
                      )}

                      {canViewExpenses && (
                        <td className="whitespace-nowrap px-5 py-5 text-sm font-semibold text-amber-700">
                          {inr(worker.pendingAmount)}
                        </td>
                      )}

                      {canViewBalance && (
                        <td className="whitespace-nowrap px-5 py-5 text-sm font-bold text-emerald-700">
                          {inr(worker.availableBalance)}
                        </td>
                      )}

                      <td className="px-5 py-5">
                        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          worker.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {worker.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex items-center justify-end gap-2">

                          {canUpdate && (
                            <button
                              disabled={!!busyId}
                              onClick={() => openAssignSites(worker)}
                              className="flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                            >
                              <Building2 size={14} />
                              Assign Sites
                            </button>
                          )}

                          {canUpdate && (
                            <button
                              disabled={!!busyId}
                              onClick={() => openEdit(worker)}
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
                              title="Edit worker"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}

                          {canDeactivate && (
                            <button
                              disabled={!!busyId}
                              onClick={() => askStatusConfirmation(worker)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                            >
                              {worker.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}

                          <Link
                            to={`/admin/workers/${worker.id}`}
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            <History size={14} />
                            History
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}

            <div className="space-y-3 p-4 lg:hidden">
              {filteredWorkers.map(worker => (
                <div
                  key={worker.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">
                        {worker.name.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800">
                          {worker.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {worker.phone}
                        </p>
                      </div>
                    </div>

                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      worker.isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {worker.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {(canViewFunds || canViewExpenses) && (
                    <div className={`mt-4 grid gap-2 ${
                      canViewFunds && canViewExpenses ? 'grid-cols-3' : 'grid-cols-2'
                    }`}>
                      {canViewFunds && (
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-[10px] text-slate-500">Allocated</p>
                          <p className="mt-1 text-xs font-bold">
                            {inr(worker.totalAllocated)}
                          </p>
                        </div>
                      )}

                      {canViewExpenses && (
                        <div className="rounded-lg bg-amber-50 p-3">
                          <p className="text-[10px] text-amber-700">Pending</p>
                          <p className="mt-1 text-xs font-bold text-amber-800">
                            {inr(worker.pendingAmount)}
                          </p>
                        </div>
                      )}

                      {canViewBalance && (
                        <div className="rounded-lg bg-emerald-50 p-3">
                          <p className="text-[10px] text-emerald-700">Balance</p>
                          <p className="mt-1 text-xs font-bold text-emerald-800">
                            {inr(worker.availableBalance)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">

                    {canUpdate && (
                      <button
                        onClick={() => openAssignSites(worker)}
                        disabled={!!busyId}
                        className="flex-1 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs font-semibold text-blue-700"
                      >
                        Assign Sites
                      </button>
                    )}

                    {canUpdate && (
                      <button
                        onClick={() => openEdit(worker)}
                        disabled={!!busyId}
                        className="flex-1 rounded-lg border p-2 text-xs font-semibold"
                      >
                        Edit
                      </button>
                    )}

                    {canDeactivate && (
                      <button
                        onClick={() => askStatusConfirmation(worker)}
                        disabled={!!busyId}
                        className="flex-1 rounded-lg bg-slate-100 p-2 text-xs font-semibold"
                      >
                        {worker.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}

                    <Link
                      to={`/admin/workers/${worker.id}`}
                      className="flex-1 rounded-lg bg-blue-600 p-2 text-center text-xs font-semibold text-white"
                    >
                      History
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500">
          Showing {filteredWorkers.length} of {workers.length} workers
        </div>
      </section>

      {/* ADD / EDIT WORKER MODAL */}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={e => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                  Workforce Management
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {editing ? 'Edit Worker' : 'Add New Worker'}
                </h2>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={saveWorker}
              noValidate
              className="space-y-5 p-6"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Name *
                </label>

                <input
                  required
                  value={form.name}
                  onChange={e =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Enter worker name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Phone Number *
                </label>

                <input
                  required
                  type="tel"
                  maxLength={10}
                  value={form.phone}
                  onChange={e =>
                    setForm({
                      ...form,
                      phone: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  placeholder="10-digit mobile number"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={e =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder="worker@example.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {editing
                    ? 'New Password (Optional)'
                    : 'Password *'}
                </label>

                <input
                  type="password"
                  value={form.password}
                  onChange={e =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder={
                    editing
                      ? 'Leave blank to keep current password'
                      : 'Minimum 6 characters'
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {formError && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check size={16} />

                  {saving
                    ? 'Saving...'
                    : editing
                      ? 'Save Changes'
                      : 'Create Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN SITES MODAL */}

      {assigningWorker && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={e => {
            if (
              e.target === e.currentTarget &&
              !assignSaving
            ) {
              setAssigningWorker(null);
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                  Workforce Management
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Assign Sites
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select sites for {assigningWorker.name}
                </p>
              </div>

              <button
                onClick={() => setAssigningWorker(null)}
                disabled={assignSaving}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[55vh] space-y-3 overflow-y-auto p-6">

              {sitesLoading ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Loading sites...
                </p>
              ) : sites.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No active sites available.
                </p>
              ) : (
                sites.map(site => {
                  const checked = selectedSites.includes(site.id);

                  return (
                    <label
                      key={site.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                        checked
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSite(site.id)}
                        disabled={assignSaving}
                        className="h-4 w-4 accent-blue-600"
                      />

                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">
                          {site.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {site.address || 'Address not available'}
                        </p>
                      </div>

                      {checked && (
                        <CheckCircle2
                          size={19}
                          className="text-blue-600"
                        />
                      )}
                    </label>
                  );
                })
              )}

            </div>

            <div className="flex items-center justify-between border-t bg-slate-50 p-5">

              <p className="text-xs font-medium text-slate-500">
                {selectedSites.length} site(s) selected
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setAssigningWorker(null)}
                  disabled={assignSaving}
                  className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  onClick={saveAssignedSites}
                  disabled={assignSaving || sitesLoading}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {assignSaving ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* STATUS CONFIRMATION */}

      {confirmAction && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/40 px-4 pt-8 backdrop-blur-sm"
          onMouseDown={e => {
            if (e.target === e.currentTarget && !busyId) {
              setConfirmAction(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className={`rounded-xl p-3 ${
                confirmAction.action === 'deactivate'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}>
                {confirmAction.action === 'deactivate'
                  ? <UserX size={24} />
                  : <UserCheck size={24} />}
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {confirmAction.action === 'deactivate'
                    ? 'Deactivate Worker?'
                    : 'Activate Worker?'}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Are you sure you want to{' '}
                  <strong>{confirmAction.action}</strong>{' '}
                  <strong>{confirmAction.worker.name}</strong>?
                </p>
              </div>

              <button
                onClick={() => setConfirmAction(null)}
                disabled={!!busyId}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              <AlertTriangle size={17} className="shrink-0" />

              <span>
                {confirmAction.action === 'deactivate'
                  ? 'This worker will no longer be able to access the worker dashboard.'
                  : 'This worker will regain access to the worker dashboard.'}
              </span>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={!!busyId}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={executeStatusChange}
                disabled={!!busyId}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  confirmAction.action === 'deactivate'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {busyId
                  ? 'Processing...'
                  : confirmAction.action === 'deactivate'
                    ? 'Yes, Deactivate'
                    : 'Yes, Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}