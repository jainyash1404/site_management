import { useMemo, useState, type FormEvent } from 'react';

import {
  Activity,
  Building2,
  Check,
  CheckCircle2,
  CircleOff,
  Clock3,
  Edit3,
  Flag,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';

import { E, errMsg, list, send } from '../api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import type { Site } from '../types';

type Filter = 'all' | 'active' | 'inactive' | 'completed';

type SiteForm = {
  name: string;
  address: string;
  description: string;
};

type ConfirmAction = {
  type: 'delete' | 'deactivate' | 'complete' | 'reopen';
  site: Site;
};

const emptyForm: SiteForm = {
  name: '',
  address: '',
  description: '',
};

export default function SitesPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission('sites.create');
  const canUpdate = hasPermission('sites.update');
  const canDeactivate = hasPermission('sites.deactivate');
  const canComplete = hasPermission('sites.complete');
  const canDelete = hasPermission('sites.delete');

  const { data, loading, error, reload } = useApi(
    () => list<Site>(E.sites),
    []
  );

  const sites = data?.items ?? [];

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);

  const [form, setForm] = useState<SiteForm>(emptyForm);
  const [formError, setFormError] = useState('');

  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');

  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction | null>(null);

  // STATISTICS
  const activeCount = sites.filter(
    s => s.isActive && !s.isCompleted
  ).length;

  const inactiveCount = sites.filter(
    s => !s.isActive && !s.isCompleted
  ).length;

  const completedCount = sites.filter(
    s => s.isCompleted
  ).length;

  // SEARCH AND FILTERS
  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      const q = search.trim().toLowerCase();

      const matchesSearch =
        !q ||
        site.name.toLowerCase().includes(q) ||
        (site.address ?? '').toLowerCase().includes(q) ||
        (site.description ?? '').toLowerCase().includes(q);

      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && site.isActive && !site.isCompleted) ||
        (filter === 'inactive' && !site.isActive && !site.isCompleted) ||
        (filter === 'completed' && site.isCompleted);

      return matchesSearch && matchesFilter;
    });
  }, [sites, search, filter]);

  // OPEN CREATE MODAL
  const openCreate = () => {
    if (!canCreate) return;

    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  // OPEN EDIT MODAL
  const openEdit = (site: Site) => {
    if (!canUpdate) return;

    setEditing(site);

    setForm({
      name: site.name,
      address: site.address ?? '',
      description: site.description ?? '',
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

  // CREATE / UPDATE SITE
  const saveSite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (saving) return;
    if (editing && !canUpdate) return;
    if (!editing && !canCreate) return;

    if (!form.name.trim()) {
      setFormError('Site name is required.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        description: form.description.trim(),
      };

      if (editing) {
        await send(
          'patch',
          `${E.sites}/${editing.id}`,
          payload
        );

        toast('Site updated successfully');
      } else {
        await send('post', E.sites, payload);

        toast('New site created successfully');
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

  // ASK FOR CONFIRMATION
  const askConfirmation = (
    type: ConfirmAction['type'],
    site: Site
  ) => {
    if (busyId) return;

    if (type === 'delete' && !canDelete) return;
    if (type === 'deactivate' && !canDeactivate) return;
    if (
      (type === 'complete' || type === 'reopen') &&
      !canComplete
    ) return;

    setConfirmAction({
      type,
      site,
    });
  };

  // ACTIVATE SITE
  const activateSite = async (site: Site) => {
    if (!canDeactivate || busyId) return;

    setBusyId(site.id);

    try {
      await send(
        'patch',
        E.status(E.sites, site.id),
        { isActive: true }
      );

      toast('Site activated successfully');
      reload();

    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setBusyId('');
    }
  };

  // EXECUTE CONFIRMED ACTION
  const executeConfirmAction = async () => {
    if (!confirmAction || busyId) return;

    const { type, site } = confirmAction;

    if (type === 'delete' && !canDelete) return;
    if (type === 'deactivate' && !canDeactivate) return;
    if (
      (type === 'complete' || type === 'reopen') &&
      !canComplete
    ) return;

    setBusyId(site.id);

    try {
      if (type === 'delete') {
        await send('delete', `${E.sites}/${site.id}`);

        toast('Site deleted successfully');
      }

      else if (type === 'deactivate') {
        await send(
          'patch',
          E.status(E.sites, site.id),
          { isActive: false }
        );

        toast('Site deactivated successfully');
      }

      else if (type === 'complete') {
        await send(
          'patch',
          `${E.sites}/${site.id}/completion`,
          { isCompleted: true }
        );

        toast('Site marked as completed');
      }

      else if (type === 'reopen') {
        await send(
          'patch',
          `${E.sites}/${site.id}/completion`,
          { isCompleted: false }
        );

        // Reopening and activating are separate permissions.
        // Activate only when the admin also has sites.deactivate.
        if (canDeactivate) {
          await send(
            'patch',
            E.status(E.sites, site.id),
            { isActive: true }
          );
        }

        toast(
          canDeactivate
            ? 'Site reopened and activated successfully'
            : 'Site reopened successfully. Activate it separately if permitted.'
        );
      }

      setConfirmAction(null);
      reload();

    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setBusyId('');
    }
  };

  // STATUS BADGE
  const badge = (site: Site) => {
    if (site.isCompleted) {
      return 'bg-violet-50 text-violet-700';
    }

    if (site.isActive) {
      return 'bg-emerald-50 text-emerald-700';
    }

    return 'bg-slate-100 text-slate-600';
  };

  const statusText = (site: Site) => {
    if (site.isCompleted) return 'Completed';

    return site.isActive ? 'Active' : 'Inactive';
  };

  // CONFIRMATION CONTENT
  const confirmationDetails = {
    delete: {
      title: 'Delete Site?',
      description: 'permanently delete',
      button: 'Yes, Delete',
      color: 'bg-red-600 hover:bg-red-700',
      iconColor: 'bg-red-50 text-red-600',
      icon: Trash2,
      warning:
        'This action cannot be undone. Sites with financial records cannot be deleted.',
    },

    deactivate: {
      title: 'Deactivate Site?',
      description: 'deactivate',
      button: 'Yes, Deactivate',
      color: 'bg-amber-600 hover:bg-amber-700',
      iconColor: 'bg-amber-50 text-amber-600',
      icon: CircleOff,
      warning:
        'This site will no longer be available for new work until activated again.',
    },

    complete: {
      title: 'Complete Project?',
      description: 'mark as completed',
      button: 'Yes, Complete',
      color: 'bg-blue-600 hover:bg-blue-700',
      iconColor: 'bg-blue-50 text-blue-600',
      icon: Flag,
      warning:
        'Completed sites will no longer accept new expenses from workers.',
    },

    reopen: {
      title: 'Reopen Site?',
      description: 'reopen',
      button: 'Yes, Reopen',
      color: 'bg-violet-600 hover:bg-violet-700',
      iconColor: 'bg-violet-50 text-violet-600',
      icon: Activity,
      warning:
        'This site will become active again only if you have activation permission.',
    },
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-10">

      {/* HEADER */}

      <section className="relative overflow-hidden rounded-2xl bg-slate-950 p-7 text-white">

        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[40px] border-white/5" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-300">
              <MapPin size={15} />
              Project Management
            </div>

            <h1 className="text-3xl font-bold">
              Sites Overview<span className="text-blue-400">.</span>
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              Manage your construction locations and track project status.
            </p>
          </div>

          {canCreate && (
            <button
              onClick={openCreate}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
            >
              <Plus size={18} />
              Add New Site
            </button>
          )}

        </div>

        <div className="relative mt-6 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-slate-400">
          <Clock3 size={14} />
          Manage all your project locations in one place
        </div>

      </section>

      {/* STATISTICS */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {[
          {
            title: 'Total Sites',
            value: sites.length,
            description: 'All registered locations',
            icon: Building2,
            color: 'bg-blue-50 text-blue-600',
          },
          {
            title: 'Active Sites',
            value: activeCount,
            description: 'Currently operational',
            icon: Activity,
            color: 'bg-emerald-50 text-emerald-600',
          },
          {
            title: 'Inactive Sites',
            value: inactiveCount,
            description: 'Temporarily inactive',
            icon: CircleOff,
            color: 'bg-amber-50 text-amber-600',
          },
          {
            title: 'Completed Sites',
            value: completedCount,
            description: 'Projects completed',
            icon: CheckCircle2,
            color: 'bg-violet-50 text-violet-600',
          },
        ].map(item => {
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

                  <h2 className="mt-3 text-3xl font-bold text-slate-900">
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

      {/* SITE DIRECTORY */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center">

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Site Directory
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              View and manage your construction sites.
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
                placeholder="Search sites..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
              />
            </div>

            <select
              value={filter}
              onChange={e => setFilter(e.target.value as Filter)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All Sites</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="completed">Completed</option>
            </select>

          </div>

        </div>

        {error && (
          <div className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
            Unable to load sites. Please refresh and try again.
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading sites...
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="p-14 text-center">

            <Building2
              className="mx-auto mb-4 text-slate-300"
              size={40}
            />

            <h3 className="font-semibold text-slate-800">
              No sites found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or filter.
            </p>

          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}

            <div className="hidden overflow-x-auto md:block">

              <table className="w-full text-left">

                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Site</th>
                    <th className="px-6 py-4">Address</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {filteredSites.map(site => (
                    <tr
                      key={site.id}
                      className="transition hover:bg-slate-50"
                    >

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">

                          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                            <Building2 size={19} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {site.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              ID: {site.id.slice(-6).toUpperCase()}
                            </p>
                          </div>

                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {site.address || '—'}
                      </td>

                      <td className="max-w-[200px] truncate px-6 py-5 text-sm text-slate-500">
                        {site.description || '—'}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${badge(site)}`}
                        >
                          {statusText(site)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">

                          {canUpdate && (
                            <button
                              disabled={!!busyId}
                              onClick={() => openEdit(site)}
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
                              title="Edit site"
                            >
                              <Edit3 size={16} />
                            </button>
                          )}

                          {site.isCompleted ? (
                            canComplete && (
                              <button
                                disabled={!!busyId}
                                onClick={() => askConfirmation('reopen', site)}
                                className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-40"
                              >
                                Reopen
                              </button>
                            )
                          ) : (
                            <>
                              {canDeactivate && (
                                <button
                                  disabled={!!busyId}
                                  onClick={() =>
                                    site.isActive
                                      ? askConfirmation('deactivate', site)
                                      : activateSite(site)
                                  }
                                  className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                                >
                                  {site.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                              )}

                              {canComplete && (
                                <button
                                  disabled={!!busyId || !site.isActive}
                                  onClick={() => askConfirmation('complete', site)}
                                  className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                                >
                                  <Flag size={13} />
                                  Complete
                                </button>
                              )}
                            </>
                          )}

                          {canDelete && (
                            <button
                              disabled={!!busyId}
                              onClick={() => askConfirmation('delete', site)}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-40"
                              title="Delete site"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>

            {/* MOBILE VIEW */}

            <div className="space-y-3 p-4 md:hidden">

              {filteredSites.map(site => (
                <div
                  key={site.id}
                  className="rounded-xl border border-slate-200 p-4"
                >

                  <div className="flex items-start justify-between gap-3">

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {site.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {site.address || 'Address not added'}
                      </p>
                    </div>

                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge(site)}`}>
                      {statusText(site)}
                    </span>

                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">

                    {canUpdate && (
                      <button
                        onClick={() => openEdit(site)}
                        disabled={!!busyId}
                        className="rounded-lg border p-2 text-xs font-semibold"
                      >
                        Edit
                      </button>
                    )}

                    {site.isCompleted ? (
                      canComplete && (
                        <button
                          onClick={() => askConfirmation('reopen', site)}
                          disabled={!!busyId}
                          className="rounded-lg bg-violet-50 p-2 text-xs font-semibold text-violet-700"
                        >
                          Reopen
                        </button>
                      )
                    ) : (
                      <>
                        {canComplete && (
                          <button
                            onClick={() => askConfirmation('complete', site)}
                            disabled={!!busyId || !site.isActive}
                            className="rounded-lg bg-blue-50 p-2 text-xs font-semibold text-blue-700"
                          >
                            Mark Complete
                          </button>
                        )}

                        {canDeactivate && (
                          <button
                            onClick={() =>
                              site.isActive
                                ? askConfirmation('deactivate', site)
                                : activateSite(site)
                            }
                            disabled={!!busyId}
                            className="rounded-lg bg-slate-100 p-2 text-xs font-semibold"
                          >
                            {site.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => askConfirmation('delete', site)}
                        disabled={!!busyId}
                        className="flex items-center justify-center gap-1 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}

                  </div>

                </div>
              ))}

            </div>
          </>
        )}

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500">
          Showing {filteredSites.length} of {sites.length} sites
        </div>

      </section>

      {/* ADD / EDIT MODAL */}

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
                  Site Management
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {editing ? 'Edit Site' : 'Add New Site'}
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

            <form onSubmit={saveSite} className="space-y-5 p-6">

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Site Name *
                </label>

                <input
                  required
                  value={form.name}
                  onChange={e =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Enter site name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Address
                </label>

                <input
                  value={form.address}
                  onChange={e =>
                    setForm({ ...form, address: e.target.value })
                  }
                  placeholder="Enter site address"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Describe this construction project"
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {formError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {formError}
                </p>
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
                      : 'Create Site'
                  }
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* CONFIRMATION MODAL */}

      {confirmAction && (() => {
        const config = confirmationDetails[confirmAction.type];
        const Icon = config.icon;

        return (
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 pb-8 pt-8 backdrop-blur-sm"
            onMouseDown={e => {
              if (e.target === e.currentTarget && !busyId) {
                setConfirmAction(null);
              }
            }}
          >

            <div className="w-full max-w-md animate-in slide-in-from-top-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">

              <div className="flex items-start gap-4">

                <div className={`rounded-xl p-3 ${config.iconColor}`}>
                  <Icon size={24} />
                </div>

                <div className="flex-1">

                  <h3 className="text-lg font-bold text-slate-900">
                    {config.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Are you sure you want to{' '}
                    <strong>{config.description}</strong>{' '}
                    <strong>{confirmAction.site.name}</strong>?
                  </p>

                </div>

                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={!!busyId}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-40"
                >
                  <X size={19} />
                </button>

              </div>

              <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                <AlertTriangle size={17} className="shrink-0" />
                <span>{config.warning}</span>
              </div>

              <div className="mt-6 flex justify-end gap-3">

                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={!!busyId}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  onClick={executeConfirmAction}
                  disabled={!!busyId}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${config.color}`}
                >
                  {busyId
                    ? 'Processing...'
                    : config.button
                  }
                </button>

              </div>

            </div>

          </div>
        );
      })()}

    </div>
  );
}