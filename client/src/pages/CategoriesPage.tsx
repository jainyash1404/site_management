import { useMemo, useState, type FormEvent } from 'react';

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
import { useAuth } from '../context/AuthContext';

import { Card, Button, input } from '../components/ui';

type Category = {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  createdAt?: string;
};

type ConfirmAction = {
  type: 'DELETE' | 'TOGGLE';
  category: Category;
};

type TreeNode = Category & {
  children: TreeNode[];
};

export default function CategoriesPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission('categories.create');
  const canUpdate = hasPermission('categories.update');
  const canDeactivate = hasPermission('categories.deactivate');
  const canDelete = hasPermission('categories.delete');
  const canAddChild = hasPermission('categories.subcategories');

  const canManageAnything =
    canCreate || canUpdate || canDeactivate || canDelete || canAddChild;

  const { data, loading, error, reload } = useApi(async () => {
    return await list<Category>(E.categories);
  });

  const categories = data?.items ?? [];

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);

  const [categoryName, setCategoryName] = useState('');

  // Inline child category form
  const [inlineParentId, setInlineParentId] = useState('');
  const [inlineChildName, setInlineChildName] = useState('');

  const [editing, setEditing] = useState<Category | null>(null);

  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction | null>(null);

  const [busy, setBusy] = useState(false);

  // ==========================================
  // BUILD UNLIMITED CATEGORY TREE
  // ==========================================

  const tree = useMemo(() => {
    const map = new Map<string, TreeNode>();

    categories.forEach(category => {
      map.set(category.id, {
        ...category,
        children: [],
      });
    });

    const roots: TreeNode[] = [];

    map.forEach(node => {
      const parent = node.parentId
        ? map.get(node.parentId)
        : undefined;

      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortTree = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => sortTree(node.children));
    };

    sortTree(roots);

    return roots;
  }, [categories]);

  // ==========================================
  // FILTER TREE
  // ==========================================

  const filteredTree = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return tree;

    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((result, node) => {
        const children = filterNodes(node.children);

        if (
          node.name.toLowerCase().includes(query) ||
          children.length > 0
        ) {
          result.push({
            ...node,
            children,
          });
        }

        return result;
      }, []);
    };

    return filterNodes(tree);
  }, [tree, search]);

  const getAllNodes = (nodes: TreeNode[]): TreeNode[] =>
    nodes.flatMap(node => [
      node,
      ...getAllNodes(node.children),
    ]);

  const allNodes = getAllNodes(tree);

  const activeCount = allNodes.filter(c => c.isActive).length;
  const totalChildren = allNodes.filter(c => c.parentId !== null).length;
  const mainCount = tree.length;

  // ==========================================
  // EXPAND / COLLAPSE
  // ==========================================

  const toggleExpand = (id: string) => {
    setExpanded(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const expandAll = () => {
    setExpanded(allNodes.map(c => c.id));
  };

  const collapseAll = () => {
    setExpanded([]);
  };

  // ==========================================
  // CREATE MAIN CATEGORY
  // ==========================================

  const addCategory = async (e: FormEvent) => {
    e.preventDefault();

    if (!categoryName.trim() || busy || !canCreate) return;

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

  // ==========================================
  // OPEN INLINE CHILD FORM
  // ==========================================

  const openChildForm = (id: string) => {
    setInlineParentId(id);
    setInlineChildName('');

    setExpanded(prev =>
      prev.includes(id) ? prev : [...prev, id]
    );
  };

  // ==========================================
  // CREATE CHILD AT ANY LEVEL
  // ==========================================

  const addChild = async (
    e: FormEvent,
    selectedParentId: string
  ) => {
    e.preventDefault();

    if (
      !selectedParentId ||
      !inlineChildName.trim() ||
      busy ||
      !canAddChild
    ) return;

    setBusy(true);

    try {
      await send(
        'post',
        `${E.categories}/${selectedParentId}/subcategories`,
        {
          name: inlineChildName.trim(),
        }
      );

      toast('Child category created successfully');

      setInlineChildName('');
      setInlineParentId('');

      setExpanded(prev =>
        prev.includes(selectedParentId)
          ? prev
          : [...prev, selectedParentId]
      );

      await reload();
    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // EDIT CATEGORY
  // ==========================================

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();

    if (
      !editing ||
      !editing.name.trim() ||
      busy ||
      !canUpdate
    ) return;

    setBusy(true);

    try {
      await send('patch', `${E.categories}/${editing.id}`, {
        name: editing.name.trim(),
      });

      toast('Category updated successfully');

      setEditing(null);

      await reload();
    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // DELETE / STATUS CONFIRMATION
  // ==========================================

  const executeAction = async () => {
    if (!confirmAction || busy) return;

    const { type, category } = confirmAction;

    if (type === 'DELETE' && !canDelete) return;
    if (type === 'TOGGLE' && !canDeactivate) return;

    setBusy(true);

    try {
      if (type === 'DELETE') {
        await send('delete', `${E.categories}/${category.id}`);

        toast(
          'Category and all its descendants deleted successfully'
        );
      }

      if (type === 'TOGGLE') {
        await send('patch', `${E.categories}/${category.id}`, {
          isActive: !category.isActive,
        });

        toast(
          category.isActive
            ? 'Category deactivated'
            : 'Category activated'
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

  // ==========================================
  // RECURSIVE TREE UI
  // ==========================================

  const renderNode = (
    node: TreeNode,
    depth = 0
  ): React.ReactNode => {
    const isOpen =
      expanded.includes(node.id) ||
      search.trim().length > 0;

    const hasChildren = node.children.length > 0;
    const isAddingChild = inlineParentId === node.id;

    return (
      <div key={node.id}>

        {/* CATEGORY ROW */}

        <div
          className="group flex flex-col justify-between gap-3 border-b border-slate-100 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
          style={{
            paddingLeft: `${16 + depth * 25}px`,
          }}
        >

          <div className="flex min-w-0 items-center gap-3">

            <button
              type="button"
              onClick={() => toggleExpand(node.id)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"
            >
              {hasChildren && isOpen ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight
                  size={18}
                  className={hasChildren ? '' : 'opacity-20'}
                />
              )}
            </button>

            <div
              className={`rounded-xl p-2.5 ${
                depth === 0
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-violet-50 text-violet-600'
              }`}
            >
              <Folder size={19} />
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-slate-800">
                {node.name}
              </p>

              <p className="mt-0.5 text-xs text-slate-400">
                {hasChildren
                  ? `${node.children.length} child categories`
                  : 'No child categories'}
              </p>
            </div>

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                node.isActive
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {node.isActive ? 'Active' : 'Inactive'}
            </span>

          </div>

          {/* ACTION BUTTONS */}

          <div className="flex flex-wrap items-center gap-2 pl-10 sm:pl-0">

            {canAddChild && node.isActive && (
              <button
                type="button"
                disabled={busy}
                onClick={() => openChildForm(node.id)}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus size={14} />
                Add Child
              </button>
            )}

            {canUpdate && (
              <button
                type="button"
                onClick={() => setEditing(node)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Pencil size={13} />
                Edit
              </button>
            )}

            {canDeactivate && (
              <button
                type="button"
                onClick={() =>
                  setConfirmAction({
                    type: 'TOGGLE',
                    category: node,
                  })
                }
                className="flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
              >
                <Power size={13} />
                {node.isActive ? 'Deactivate' : 'Activate'}
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() =>
                  setConfirmAction({
                    type: 'DELETE',
                    category: node,
                  })
                }
                className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 size={13} />
                Delete
              </button>
            )}

          </div>
        </div>

        {/* INLINE CHILD CATEGORY INPUT */}

        {isAddingChild && (
          <div
            className="border-b border-blue-100 bg-blue-50/60 p-4"
            style={{
              paddingLeft: `${58 + depth * 25}px`,
            }}
          >
            <form
              onSubmit={e => addChild(e, node.id)}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >

              <div className="flex flex-1 items-center gap-2">
                <Plus
                  size={17}
                  className="shrink-0 text-blue-600"
                />

                <input
                  autoFocus
                  className={input}
                  placeholder={`Enter subcategory under ${node.name}...`}
                  value={inlineChildName}
                  onChange={e =>
                    setInlineChildName(e.target.value)
                  }
                  disabled={busy}
                  required
                />
              </div>

              <div className="flex gap-2">

                <button
                  type="submit"
                  disabled={
                    busy || !inlineChildName.trim()
                  }
                  className="flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus size={14} />
                  {busy ? 'Adding...' : 'Add'}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setInlineParentId('');
                    setInlineChildName('');
                  }}
                  className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <X size={14} />
                  Cancel
                </button>

              </div>
            </form>
          </div>
        )}

        {/* CHILDREN */}

        {isOpen && hasChildren && (
          <div className="bg-slate-50/70">
            {node.children.map(child =>
              renderNode(child, depth + 1)
            )}
          </div>
        )}

      </div>
    );
  };

  const action = confirmAction?.category;
  const isDelete = confirmAction?.type === 'DELETE';

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
              Organize expenses with unlimited nested categories.
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
            {mainCount} Main Categories
          </span>

          <span className="flex items-center gap-2">
            <Layers size={14} />
            {totalChildren} Child Categories
          </span>

          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} />
            {activeCount} Active Categories
          </span>

        </div>
      </section>

      {loading ? (
        <Card>
          <p className="py-6 text-center text-sm text-slate-500">
            Loading categories...
          </p>
        </Card>
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">
            {String(error)}
          </p>

          <Button className="mt-3" onClick={reload}>
            Retry
          </Button>
        </Card>
      ) : (
        <>

          {/* CREATE MAIN CATEGORY */}

          {canCreate && (
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
                    Create a new top-level category.
                  </p>
                </div>

              </div>

              <form
                onSubmit={addCategory}
                className="flex flex-col gap-3 sm:flex-row"
              >

                <input
                  className={input}
                  placeholder="Enter main category name..."
                  value={categoryName}
                  onChange={e =>
                    setCategoryName(e.target.value)
                  }
                  required
                />

                <button
                  type="submit"
                  disabled={
                    busy || !categoryName.trim()
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add Category
                </button>

              </form>
            </Card>
          )}

          {/* CATEGORY DIRECTORY */}

          <Card className="!p-0 overflow-hidden">

            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">

              <div>
                <h2 className="font-bold text-slate-900">
                  Category Directory
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Add and manage categories at any hierarchy level.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">

                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-3 text-slate-400"
                  />

                  <input
                    className={`${input} pl-9`}
                    placeholder="Search categories..."
                    value={search}
                    onChange={e =>
                      setSearch(e.target.value)
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={expandAll}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Expand All
                </button>

                <button
                  type="button"
                  onClick={collapseAll}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Collapse All
                </button>

              </div>
            </div>

            <div className="divide-y divide-slate-100">

              {filteredTree.length === 0 ? (
                <div className="p-12 text-center">

                  <FolderTree
                    size={35}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 font-semibold text-slate-700">
                    No categories found
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Create a category or try another search.
                  </p>

                </div>
              ) : (
                filteredTree.map(node =>
                  renderNode(node)
                )
              )}

            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
              Showing {allNodes.length} total categories
            </div>

          </Card>

          {!canManageAnything && (
            <Card>
              <p className="text-center text-sm text-slate-500">
                You have view-only access to categories.
              </p>
            </Card>
          )}

        </>
      )}

      {/* EDIT MODAL */}

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Edit Category
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
                onChange={e =>
                  setEditing({
                    ...editing,
                    name: e.target.value,
                  })
                }
                required
              />

              <div className="flex justify-end gap-2">

                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    busy || !editing.name.trim()
                  }
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? 'Saving...' : 'Save Changes'}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* DELETE / STATUS CONFIRMATION */}

      {confirmAction && action && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            <div className="p-6">

              <div className="flex items-start gap-4">

                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    isDelete
                      ? 'bg-red-50 text-red-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}
                >
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
                      ? `Permanently delete "${action.name}" and all its descendants?`
                      : `Are you sure you want to ${
                          action.isActive
                            ? 'deactivate'
                            : 'activate'
                        } "${action.name}"?`}
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

              <div
                className={`mt-5 flex gap-3 rounded-xl p-3 text-xs leading-5 ${
                  isDelete
                    ? 'bg-red-50 text-red-700'
                    : 'bg-amber-50 text-amber-800'
                }`}
              >
                <AlertTriangle
                  size={17}
                  className="shrink-0"
                />

                <span>
                  {isDelete
                    ? 'All nested descendants will also be deleted. Existing expense records will not automatically be deleted.'
                    : 'Status changes can affect category availability in expense submissions.'}
                </span>
              </div>

              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmAction(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={executeAction}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                    isDelete
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {busy
                    ? 'Processing...'
                    : isDelete
                      ? 'Yes, Delete'
                      : action.isActive
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