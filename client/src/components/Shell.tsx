import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  HardHat,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

type LinkItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

export default function Shell({
  links,
}: {
  links: LinkItem[];
}) {
  const { user, logout, isSuperAdmin } = useAuth();

const roleLabel =
  user?.role === 'WORKER'
    ? 'Worker'
    : isSuperAdmin
      ? 'Super Admin'
      : 'Administrator';
  const [open, setOpen] = useState(false);

  const initials = (user?.name || 'Admin')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const branding = (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-200">
        <HardHat className="h-5 w-5" />
      </div>

      <div>
        <h1 className="text-[16px] font-extrabold tracking-tight text-slate-900">
          Construction<span className="text-blue-600">.</span>
        </h1>
        <p className="text-[10px] font-medium tracking-[1.5px] text-slate-400">
          MANAGER
        </p>
      </div>
    </div>
  );

  const navigation = (
    <nav className="space-y-1" aria-label="Main navigation">
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">
        Main menu
      </p>

      {links.map((link) => {
        const Icon = link.icon;

        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#101d35] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-blue-400" />
                )}

                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                    isActive
                      ? 'bg-white/10 text-blue-300'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'
                  }`}
                >
                  <Icon className="h-[17px] w-[17px]" />
                </span>

                <span>{link.label}</span>
              </>
            )}
          </NavLink>
        );
      })}

      {links.length === 0 && (
        <p className="px-3 py-4 text-sm text-slate-400">
          No modules assigned yet.
        </p>
      )}
    </nav>
  );

  const profile = (
    <div className="border-t border-slate-200 pt-4">
      <div className="rounded-xl border border-slate-200 bg-slate-100 p-3.5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-indigo-600 text-base font-bold tracking-wide text-white shadow-md">
            {initials || <UserCircle className="h-6 w-6" />}

            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-[2.5px] border-slate-100 bg-emerald-500" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[14px] font-bold tracking-tight text-slate-900">
              {user?.name || 'Administrator'}
            </h3>

            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-1">
              <ShieldCheck className="h-3 w-3 text-blue-700" />

              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-800">
                 {roleLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2.5">
          <span className="text-[11px] font-medium text-slate-500">
            Account status
          </span>

          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={logout}
        className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
      >
        <LogOut className="h-[18px] w-[18px]" />
        Logout
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f8fc] md:flex">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex">
        <div className="mb-10 px-2">
          {branding}
        </div>

        <div className="flex-1 overflow-y-auto">
          {navigation}
        </div>

        {profile}
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        {branding}

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
        >
          {open ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </header>

      {/* Mobile Navigation */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[65px] z-30 overflow-y-auto border-b border-slate-200 bg-white p-4 shadow-lg md:hidden">
          <div className="flex min-h-full flex-col">
            <div className="flex-1">
              {navigation}
            </div>

            {profile}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="min-w-0 flex-1 p-4 md:p-6 xl:p-8">
        <Outlet />
      </main>
    </div>
  );
}