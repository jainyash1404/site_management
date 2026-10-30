import {
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import { useAuth } from './context/AuthContext';
import type {
  Role,
  AdminPermission,
} from './types';

import AdminLayout from './layouts/AdminLayout';
import WorkerLayout from './layouts/WorkerLayout';

import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import WorkersPage from './pages/WorkersPage';
import WorkerDetailPage from './pages/WorkerDetailPage';
import SitesPage from './pages/SitesPage';
import FundsPage from './pages/FundsPage';
import ExpensesPage from './pages/ExpensesPage';
import CategoriesPage from './pages/CategoriesPage';
import AdminManagementPage from './pages/AdminManagementPage';

import WorkerDashboard from './pages/WorkerDashboard';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

const home = (r: Role) =>
  r === 'ADMIN' ? '/admin' : '/worker';

// Loading screen
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
    </div>
  );
}

// Role-based protection
function Protected({ role }: { role: Role }) {
  const { user, ready } = useAuth();

  if (!ready) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return user.role === role
    ? <Outlet />
    : <Navigate to={home(user.role)} replace />;
}

// Permission-based admin protection
function AdminPermissionRoute({
  permission,
}: {
  permission: AdminPermission;
}) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

// Super Admin-only protection
function SuperAdminRoute() {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

// Find first page accessible to the logged-in admin
function AdminHomeRedirect() {
  const { hasPermission, isSuperAdmin } = useAuth();

  if (isSuperAdmin || hasPermission('dashboard.view')) {
    return <AdminDashboard />;
  }

  const routes: {
    permission: AdminPermission;
    path: string;
  }[] = [
    { permission: 'workers.view', path: '/admin/workers' },
    { permission: 'sites.view', path: '/admin/sites' },
    { permission: 'funds.view', path: '/admin/funds' },
    { permission: 'expenses.view', path: '/admin/expenses' },
    { permission: 'categories.view', path: '/admin/categories' },
  ];

  const accessible = routes.find(
    route => hasPermission(route.permission)
  );

  if (accessible) {
    return <Navigate to={accessible.path} replace />;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold">
          No Access Available
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Contact your Super Admin to get permissions.
        </p>
      </div>
    </div>
  );
}

// Root redirect
function Root() {
  const { user, ready } = useAuth();

  if (!ready) return <LoadingScreen />;

  return user
    ? <Navigate to={home(user.role)} replace />
    : <LandingPage />;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Root />} />

      <Route path="/login" element={<LoginPage />} />

      <Route path="/signup" element={<SignupPage />} />

      <Route
        path="/forgot-password"
        element={<ForgotPasswordPage />}
      />

      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />

      {/* ADMIN ROUTES */}
      <Route element={<Protected role="ADMIN" />}>
        <Route path="/admin" element={<AdminLayout />}>

          <Route
            index
            element={<AdminHomeRedirect />}
          />

          {/* Dashboard */}
          <Route element={
            <AdminPermissionRoute permission="dashboard.view" />
          }>
            <Route
              path="dashboard"
              element={<AdminDashboard />}
            />
          </Route>

          {/* Workers */}
          <Route element={
            <AdminPermissionRoute permission="workers.view" />
          }>
            <Route
              path="workers"
              element={<WorkersPage />}
            />

            <Route
              path="workers/:id"
              element={<WorkerDetailPage />}
            />
          </Route>

          {/* Sites */}
          <Route element={
            <AdminPermissionRoute permission="sites.view" />
          }>
            <Route
              path="sites"
              element={<SitesPage />}
            />
          </Route>

          {/* Funds */}
          <Route element={
            <AdminPermissionRoute permission="funds.view" />
          }>
            <Route
              path="funds"
              element={<FundsPage />}
            />
          </Route>

          {/* Expenses */}
          <Route element={
            <AdminPermissionRoute permission="expenses.view" />
          }>
            <Route
              path="expenses"
              element={<ExpensesPage />}
            />
          </Route>

          {/* Categories */}
          <Route element={
            <AdminPermissionRoute permission="categories.view" />
          }>
            <Route
              path="categories"
              element={<CategoriesPage />}
            />
          </Route>

          {/* Admin Management - Super Admin only */}
          <Route element={<SuperAdminRoute />}>
            <Route
              path="admins"
              element={<AdminManagementPage />}
            />
          </Route>

        </Route>
      </Route>

      {/* WORKER ROUTES - unchanged */}
      <Route element={<Protected role="WORKER" />}>
        <Route path="/worker" element={<WorkerLayout />}>
          <Route
            index
            element={<WorkerDashboard />}
          />
        </Route>
      </Route>

      {/* Fallback */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}