import { useState, type FormEvent } from 'react';

import {
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Folder,
  Pencil,
  Power,
  RefreshCw,
  Layers,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react';

import { E, errMsg, list, send } from '../api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';

import { Card, Button, input } from '../components/ui';

type Subcategory = {
  id: string;
  name: string;
  isActive: boolean;
};

type Category = {
  id: string;
  name: string;
  isActive: boolean;
  subcategories: Subcategory[];
};

type ConfirmAction = {
  type:
    | 'DELETE_CATEGORY'
    | 'DELETE_SUBCATEGORY'
    | 'TOGGLE_CATEGORY'
    | 'TOGGLE_SUBCATEGORY';
  category: Category;
  sub?: Subcategory;
};

export default function CategoriesPage() {
  const toast = useToast();

  const {
    data,
    loading,
    error,
    reload,
  } = useApi(async () => {
    return await list<Category>(E.categories);
  });

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);

  const [categoryName, setCategoryName] = useState('');
  const [subName, setSubName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [editing, setEditing] = useState<{
    id: string;
    name: string;
    categoryId?: string;
    type: 'category' | 'subcategory';
  } | null>(null);

  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction | null>(null);

  const [busy, setBusy] = useState(false);

  const categories = data?.items ?? [];

  // SEARCH
  const filtered = categories.filter(c => {
    const q = search.toLowerCase().trim();

    return (
      c.name.toLowerCase().includes(q) ||
      c.subcategories?.some(s =>
        s.name.toLowerCase().includes(q)
      )
    );
  });

  const totalSubcategories = categories.reduce(
    (sum, c) => sum + (c.subcategories?.length || 0),
    0
  );

  const activeCategories = categories.filter(
    c => c.isActive
  ).length;

  // ADD CATEGORY
  const addCategory = async (e: FormEvent) => {
    e.preventDefault();

    if (!categoryName.trim() || busy) return;

    setBusy(true);

    try {
      await send('post', E.categories, {
        name: categoryName.trim(),
      });

      toast('Category created successfully');

      setCategoryName('');

      await reload();
    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setBusy(false);
    }
  };

  // ADD SUBCATEGORY
  const addSubcategory = async (e: FormEvent) => {
    e.preventDefault();

    if (!subName.trim() || !selectedCategory || busy) return;

    setBusy(true);

    try {
      await send(
        'post',
        `${E.categories}/${selectedCategory}/subcategories`,
        {
          name: subName.trim(),
        }
      );

      toast('Subcategory added successfully');

      setSubName('');

      setExpanded(prev =>
        prev.includes(selectedCategory)
          ? prev
          : [...prev, selectedCategory]
      );

      await reload();
    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setBusy(false);
    }
  };

  // EDIT CATEGORY / SUBCATEGORY
  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();

    if (!editing || !editing.name.trim() || busy) return;

    setBusy(true);

    try {
      if (editing.type === 'category') {
        await send(
          'patch',
          `${E.categories}/${editing.id}`,
          {
            name: editing.name.trim(),
          }
        );
      } else {
        await send(
          'patch',
          `${E.categories}/${editing.categoryId}/subcategories/${editing.id}`,
          {
            name: editing.name.trim(),
          }
        );
      }

      toast('Updated successfully');

      setEditing(null);

      await reload();
    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setBusy(false);
    }
  };

  // OPEN DELETE CONFIRMATION
  const deleteCategory = (category: Category) => {
    setConfirmAction({
      type: 'DELETE_CATEGORY',
      category,
    });
  };

  const deleteSubcategory = (
    category: Category,
    sub: Subcategory
  ) => {
    setConfirmAction({
      type: 'DELETE_SUBCATEGORY',
      category,
      sub,
    });
  };

  // OPEN ACTIVATE / DEACTIVATE CONFIRMATION
  const toggleStatus = (
    category: Category,
    sub?: Subcategory
  ) => {
    setConfirmAction({
      type: sub
        ? 'TOGGLE_SUBCATEGORY'
        : 'TOGGLE_CATEGORY',
      category,
      sub,
    });
  };

  // EXECUTE CONFIRMED ACTION
  const executeAction = async () => {
    if (!confirmAction || busy) return;

    const { type, category, sub } = confirmAction;

    setBusy(true);

    try {
      if (type === 'DELETE_CATEGORY') {
        await send(
          'delete',
          `${E.categories}/${category.id}`
        );

        toast('Category deleted successfully');
      }

      if (type === 'DELETE_SUBCATEGORY' && sub) {
        await send(
          'delete',
          `${E.categories}/${category.id}/subcategories/${sub.id}`
        );

        toast('Subcategory deleted successfully');
      }

      if (type === 'TOGGLE_CATEGORY') {
        await send(
          'patch',
          `${E.categories}/${category.id}`,
          {
            isActive: !category.isActive,
          }
        );

        toast(
          category.isActive
            ? 'Category deactivated'
            : 'Category activated'
        );
      }

      if (type === 'TOGGLE_SUBCATEGORY' && sub) {
        await send(
          'patch',
          `${E.categories}/${category.id}/subcategories/${sub.id}`,
          {
            isActive: !sub.isActive,
          }
        );

        toast(
          sub.isActive
            ? 'Subcategory deactivated'
            : 'Subcategory activated'
        );
      }

      setConfirmAction(null);

      await reload();
    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setBusy(false);
    }
  };

  // EXPAND / COLLAPSE
  const toggleExpand = (id: string) => {
    setExpanded(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const actionName = confirmAction?.sub?.name ||
    confirmAction?.category.name || '';

  const isDelete = confirmAction?.type.includes('DELETE');

  const isActive = (
    confirmAction?.sub || confirmAction?.category
  )?.isActive;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-10">

      {/* HEADER */}

      <section className="relative overflow-hidden rounded-2xl bg-slate-950 p-7 text-white">

        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[40px] border-white/5" />

        <div className="absolute bottom-[-100px] right-[25%] h-60 w-60 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-300">
              <FolderTree size={15} />
              Expense Management
            </div>

            <h1 className="text-3xl font-bold">
              Categories<span className="text-blue-400">.</span>
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              Organize expenses with structured categories and subcategories.
            </p>
          </div>

          <button
            type="button"
            onClick={reload}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

        </div>

        <div className="relative mt-6 flex flex-wrap gap-6 border-t border-white/10 pt-5 text-xs text-slate-400">

          <span className="flex items-center gap-2">
            <FolderTree size={14} />
            {categories.length} Main Categories
          </span>

          <span className="flex items-center gap-2">
            <Layers size={14} />
            {totalSubcategories} Subcategories
          </span>

          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} />
            {activeCategories} Active Categories
          </span>

        </div>
      </section>

      {/* MAIN CONTENT */}

      {loading ? (
        <Card>
          <p className="py-6 text-center text-sm text-slate-500">
            Loading categories...
          </p>
        </Card>
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{String(error)}</p>
          <Button className="mt-3" onClick={reload}>
            Retry
          </Button>
        </Card>
      ) : (
        <>

          {/* ADD CATEGORY */}

          <Card>
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <FolderTree size={21} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Create Main Category
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Add a new expense category.
                </p>
              </div>
            </div>

            <form
              onSubmit={addCategory}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <input
                className={input}
                placeholder="Enter category name..."
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                required
              />

              <button
                type="submit"
                disabled={busy || !categoryName.trim()}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus size={16} />
                Add Category
              </button>
            </form>
          </Card>

          {/* ADD SUBCATEGORY */}

          <Card>
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                <Layers size={21} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Create Subcategory
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Add a subcategory under an existing category.
                </p>
              </div>
            </div>

            <form
              onSubmit={addSubcategory}
              className="grid gap-3 sm:grid-cols-2"
            >
              <select
                className={input}
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                required
              >
                <option value="">Select Main Category</option>

                {categories
                  .filter(c => c.isActive)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>

              <input
                className={input}
                placeholder="Enter subcategory name..."
                value={subName}
                onChange={e => setSubName(e.target.value)}
                required
              />

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={busy || !selectedCategory || !subName.trim()}
                  className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add Subcategory
                </button>
              </div>
            </form>
          </Card>

          {/* CATEGORY DIRECTORY */}

          <Card className="!p-0 overflow-hidden">

            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">

              <div>
                <h2 className="font-bold text-slate-900">
                  Category Directory
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Manage main categories and subcategories.
                </p>
              </div>

              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <input
                  className={`${input} pl-9`}
                  placeholder="Search categories..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

            </div>

            <div className="divide-y divide-slate-100">

              {filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <FolderTree
                    size={35}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 font-semibold text-slate-700">
                    No categories found
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Try another search or create a category.
                  </p>
                </div>
              ) : (
                filtered.map(category => {
                  const isOpen = expanded.includes(category.id);
                  const subs = category.subcategories || [];

                  return (
                    <div key={category.id}>

                      {/* CATEGORY ROW */}

                      <div className="flex flex-col justify-between gap-3 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center">

                        <div className="flex min-w-0 items-center gap-3">

                          <button
                            type="button"
                            onClick={() => toggleExpand(category.id)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200"
                          >
                            {isOpen
                              ? <ChevronDown size={19} />
                              : <ChevronRight size={19} />}
                          </button>

                          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                            <FolderTree size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-slate-900">
                              {category.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {subs.length} subcategories
                            </p>
                          </div>

                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            category.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {category.isActive ? 'Active' : 'Inactive'}
                          </span>

                        </div>

                        <div className="flex flex-wrap items-center gap-2 pl-12 sm:pl-0">

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(category.id);
                              setSubName('');
                            }}
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            <Plus size={14} />
                            Subcategory
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditing({
                              id: category.id,
                              name: category.name,
                              type: 'category',
                            })}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleStatus(category)}
                            className="flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                          >
                            <Power size={13} />
                            {category.isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteCategory(category)}
                            className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>

                        </div>
                      </div>

                      {/* SUBCATEGORY LIST */}

                      {isOpen && (
                        <div className="border-t border-slate-100 bg-slate-50/70 py-3 pl-8 pr-4 sm:pl-20">

                          {subs.length === 0 ? (
                            <p className="py-4 text-sm text-slate-400">
                              No subcategories added yet.
                            </p>
                          ) : (
                            <div className="space-y-2">

                              {subs.map(sub => (
                                <div
                                  key={sub.id}
                                  className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"
                                >

                                  <div className="flex items-center gap-3">
                                    <Folder
                                      size={17}
                                      className="text-blue-500"
                                    />

                                    <span className="text-sm font-semibold text-slate-700">
                                      {sub.name}
                                    </span>

                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      sub.isActive
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {sub.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-2 pl-7 sm:pl-0">

                                    <button
                                      type="button"
                                      onClick={() => setEditing({
                                        id: sub.id,
                                        name: sub.name,
                                        categoryId: category.id,
                                        type: 'subcategory',
                                      })}
                                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => toggleStatus(category, sub)}
                                      className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                                    >
                                      {sub.isActive ? 'Deactivate' : 'Activate'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => deleteSubcategory(category, sub)}
                                      className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 size={13} />
                                      Delete
                                    </button>

                                  </div>
                                </div>
                              ))}

                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  );
                })
              )}

            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
              Showing {filtered.length} of {categories.length} categories
            </div>

          </Card>

        </>
      )}

      {/* EDIT MODAL */}

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">

            <div className="mb-4 flex items-center justify-between">

              <h2 className="text-lg font-bold text-slate-900">
                Edit {editing.type === 'category' ? 'Category' : 'Subcategory'}
              </h2>

              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={19} />
              </button>

            </div>

            <form onSubmit={saveEdit} className="space-y-5">

              <input
                autoFocus
                className={input}
                value={editing.name}
                onChange={e => setEditing({
                  ...editing,
                  name: e.target.value,
                })}
                required
              />

              <div className="flex justify-end gap-2">

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={busy || !editing.name.trim()}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? 'Saving...' : 'Save Changes'}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* DELETE / DEACTIVATE CONFIRMATION MODAL */}

      {confirmAction && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8 backdrop-blur-sm">

          <div className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            <div className="p-6">

              <div className="flex items-start gap-4">

                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  isDelete
                    ? 'bg-red-50 text-red-600'
                    : 'bg-amber-50 text-amber-600'
                }`}>
                  {isDelete
                    ? <Trash2 size={23} />
                    : <Power size={23} />}
                </div>

                <div className="flex-1">

                  <h2 className="text-lg font-bold text-slate-900">
                    {isDelete
                      ? 'Confirm Deletion'
                      : 'Confirm Status Change'}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {isDelete
                      ? `Are you sure you want to permanently delete "${actionName}"? ${
                          confirmAction.type === 'DELETE_CATEGORY'
                            ? 'All its subcategories will also be deleted.'
                            : ''
                        } This action cannot be undone.`
                      : `Are you sure you want to ${
                          isActive ? 'deactivate' : 'activate'
                        } "${actionName}"?`}
                  </p>

                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmAction(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={19} />
                </button>

              </div>

              <div className={`mt-5 flex gap-3 rounded-xl p-3 text-xs leading-5 ${
                isDelete
                  ? 'bg-red-50 text-red-700'
                  : 'bg-amber-50 text-amber-800'
              }`}>
                <AlertTriangle size={17} className="shrink-0" />

                <span>
                  {isDelete
                    ? 'Deleting this item is permanent. Please verify before continuing.'
                    : 'Changing the status may affect which categories are available for new expense submissions.'}
                </span>
              </div>

              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmAction(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={executeAction}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                    isDelete
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {busy
                    ? 'Processing...'
                    : isDelete
                      ? 'Yes, Delete'
                      : isActive
                        ? 'Deactivate'
                        : 'Activate'}
                </button>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}