import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import type { Role } from './types';
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
import WorkerDashboard from './pages/WorkerDashboard';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

const home = (r: Role) => (r === 'ADMIN' ? '/admin' : '/worker');
// UI guard only; the backend must enforce permissions on every request.
function Protected({ role }: { role: Role }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === role ? <Outlet /> : <Navigate to={home(user.role)} replace />;
}
function Root() { const { user, ready } = useAuth(); if (!ready) return null; return user ? <Navigate to={home(user.role)} replace /> : <LandingPage />; }

export default function App() {
  return <Routes>
    <Route path="/" element={<Root />} /><Route path="/login" element={<LoginPage />} /><Route path="/signup" element={<SignupPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route element={<Protected role="ADMIN" />}><Route path="/admin" element={<AdminLayout />}>
      <Route index element={<AdminDashboard />} /><Route path="workers" element={<WorkersPage />} /><Route path="workers/:id" element={<WorkerDetailPage />} /><Route path="sites" element={<SitesPage />} />
      <Route path="funds" element={<FundsPage />} /><Route path="expenses" element={<ExpensesPage />} /><Route path="categories" element={<CategoriesPage />} /></Route></Route>
    <Route element={<Protected role="WORKER" />}><Route path="/worker" element={<WorkerLayout />}><Route index element={<WorkerDashboard />} /></Route></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
