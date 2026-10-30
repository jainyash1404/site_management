import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Edit3,
  Lock,
  Loader2,
  X,
  Phone,
  Mail,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

import { E, http, send, errMsg } from '../api';
import type { Admin, AdminPermission } from '../types';

const permissionGroups: {
  title: string;
  description: string;
  permissions: { key: AdminPermission; label: string }[];
}[] = [
  {
    title: 'Dashboard',
    description: 'Dashboard access',
    permissions: [
      { key: 'dashboard.view', label: 'View Dashboard' },
    ],
  },
  {
    title: 'Workers',
    description: 'Manage construction workers',
    permissions: [
      { key: 'workers.view', label: 'View Workers' },
      { key: 'workers.create', label: 'Add Workers' },
      { key: 'workers.update', label: 'Edit Workers' },
      { key: 'workers.deactivate', label: 'Activate / Deactivate Workers' },
    ],
  },
  {
    title: 'Sites',
    description: 'Manage construction sites',
    permissions: [
      { key: 'sites.view', label: 'View Sites' },
      { key: 'sites.create', label: 'Create Sites' },
      { key: 'sites.update', label: 'Edit Sites' },
      { key: 'sites.deactivate', label: 'Activate / Deactivate Sites' },
      { key: 'sites.complete', label: 'Complete Sites' },
      { key: 'sites.delete', label: 'Delete Sites' },
    ],
  },
  {
    title: 'Funds',
    description: 'Manage site funds',
    permissions: [
      { key: 'funds.view', label: 'View Funds' },
      { key: 'funds.allocate', label: 'Allocate Funds' },
    ],
  },
  {
    title: 'Expenses',
    description: 'Manage worker expenses',
    permissions: [
      { key: 'expenses.view', label: 'View Expenses' },
      { key: 'expenses.approve', label: 'Approve Expenses' },
      { key: 'expenses.reject', label: 'Reject Expenses' },
    ],
  },
  {
    title: 'Categories',
    description: 'Manage expense categories',
    permissions: [
      { key: 'categories.view', label: 'View Categories' },
      { key: 'categories.create', label: 'Create Categories' },
      { key: 'categories.update', label: 'Edit Categories' },
      { key: 'categories.deactivate', label: 'Deactivate Categories' },
      { key: 'categories.delete', label: 'Delete Categories' },
      { key: 'categories.subcategories', label: 'Manage Subcategories' },
    ],
  },
];

const allPermissions = permissionGroups.flatMap((group) =>
  group.permissions.map((permission) => permission.key)
);

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  password: '',
};

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [selectedPermissions, setSelectedPermissions] = useState<
    AdminPermission[]
  >([]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await http.get(E.admins);

      setAdmins(response.data?.data ?? []);
    } catch (error) {
      setError(errMsg(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return admins;

    return admins.filter(
      (admin) =>
        admin.name.toLowerCase().includes(query) ||
        admin.phone.includes(query) ||
        (admin.email || '').toLowerCase().includes(query)
    );
  }, [admins, search]);

  const activeCount = admins.filter((admin) => admin.isActive).length;
  const inactiveCount = admins.length - activeCount;

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedPermissions([]);
    setShowCreate(false);
    setEditingAdmin(null);
    setError('');
    setSuccess('');
  };

  const togglePermission = (permission: AdminPermission) => {
    setSelectedPermissions((previous) =>
      previous.includes(permission)
        ? previous.filter((item) => item !== permission)
        : [...previous, permission]
    );
  };

  const toggleGroup = (
    permissions: { key: AdminPermission; label: string }[]
  ) => {
    const keys = permissions.map((permission) => permission.key);

    const allSelected = keys.every((key) =>
      selectedPermissions.includes(key)
    );

    setSelectedPermissions((previous) =>
      allSelected
        ? previous.filter((key) => !keys.includes(key))
        : [...new Set([...previous, ...keys])]
    );
  };

  const selectAll = () => {
    setSelectedPermissions((previous) =>
      previous.length === allPermissions.length
        ? []
        : [...allPermissions]
    );
  };

  const createAdmin = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await send('post', E.admins, {
        ...form,
        permissions: selectedPermissions,
      });

      setSuccess('Admin created successfully.');
      setForm(emptyForm);
      setSelectedPermissions([]);
      setShowCreate(false);

      await fetchAdmins();
    } catch (error) {
      setError(errMsg(error));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setSelectedPermissions(admin.permissions || []);
    setShowCreate(false);
    setError('');
    setSuccess('');
  };

  const updatePermissions = async () => {
    if (!editingAdmin) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await send(
        'patch',
        E.adminPermissions(editingAdmin.id),
        { permissions: selectedPermissions }
      );

      setSuccess('Permissions updated successfully.');
      setEditingAdmin(null);
      await fetchAdmins();
    } catch (error) {
      setError(errMsg(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleAdminStatus = async (admin: Admin) => {
    const action = admin.isActive ? 'deactivate' : 'activate';

    if (!window.confirm(`Are you sure you want to ${action} this admin?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      await send(
        'patch',
        E.adminStatus(admin.id),
        { isActive: !admin.isActive }
      );

      setSuccess(`Admin ${action}d successfully.`);
      await fetchAdmins();
    } catch (error) {
      setError(errMsg(error));
    }
  };

  const PermissionSelector = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Access Permissions
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Select the modules and actions this admin can access.
          </p>
        </div>

        <button
          type="button"
          onClick={selectAll}
          className="text-xs font-bold text-blue-600 hover:text-blue-800"
        >
          {selectedPermissions.length === allPermissions.length
            ? 'Clear All'
            : 'Select All'}
        </button>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-900">
            Selected Permissions
          </span>
          <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-blue-700">
            {selectedPermissions.length}/{allPermissions.length}
          </span>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{
              width: `${
                (selectedPermissions.length / allPermissions.length) * 100
              }%`,
            }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {permissionGroups.map((group) => {
          const groupKeys = group.permissions.map((item) => item.key);

          const selectedCount = groupKeys.filter((key) =>
            selectedPermissions.includes(key)
          ).length;

          return (
            <div
              key={group.title}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {group.title}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {group.description}
                  </p>
                </div>

                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                  {selectedCount}/{groupKeys.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => toggleGroup(group.permissions)}
                className="mb-3 text-[11px] font-bold text-blue-600 hover:text-blue-800"
              >
                {selectedCount === groupKeys.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>

              <div className="space-y-2.5">
                {group.permissions.map((permission) => (
                  <label
                    key={permission.key}
                    className="flex cursor-pointer items-center gap-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.key)}
                      onChange={() => togglePermission(permission.key)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />

                    <span className="text-xs font-medium text-slate-700">
                      {permission.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Admin Management
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Manage administrators and their access permissions.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreate(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          Create Admin
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Admins
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                {admins.length}
              </h2>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Admins
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-emerald-600">
                {activeCount}
              </h2>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Inactive Admins
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-rose-600">
                {inactiveCount}
              </h2>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <XCircle className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Create Admin Form */}
      {showCreate && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Create New Admin
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Add an administrator and configure access.
              </p>
            </div>

            <button
              onClick={resetForm}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={createAdmin} className="space-y-6 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-700">
                  Full Name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Enter full name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-700">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="Enter phone number"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="Enter email address"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            <PermissionSelector />

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Admin
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Permissions */}
      {editingAdmin && (
        <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Edit Permissions
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Updating access for {editingAdmin.name}
              </p>
            </div>

            <button
              onClick={() => setEditingAdmin(null)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 p-5">
            <PermissionSelector />

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                onClick={() => setEditingAdmin(null)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={updatePermissions}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Administrators
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Manage all administrator accounts.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search admins..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 sm:w-56"
              />
            </div>

            <button
              onClick={fetchAdmins}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading administrators...
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 font-bold text-slate-700">
              No administrators found
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Create a new admin to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Administrator
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Contact
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Permissions
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                          {admin.name
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {admin.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Administrator
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-xs font-medium text-slate-700">
                        {admin.phone}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {admin.email || 'No email'}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700">
                        {admin.isSuperAdmin
                          ? 'Full Access'
                          : `${admin.permissions?.length || 0} permissions`}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          admin.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            admin.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {!admin.isSuperAdmin && (
                          <>
                            <button
                              onClick={() => openEdit(admin)}
                              title="Edit permissions"
                              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => toggleAdminStatus(admin)}
                              title={
                                admin.isActive ? 'Deactivate' : 'Activate'
                              }
                              className={`rounded-lg border p-2 transition ${
                                admin.isActive
                                  ? 'border-red-100 text-red-500 hover:bg-red-50'
                                  : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {admin.isActive ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </button>
                          </>
                        )}

                        {admin.isSuperAdmin && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700">
                            <ShieldCheck className="h-4 w-4" />
                            Protected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}