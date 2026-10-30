export type Role = 'ADMIN' | 'WORKER';

export type ExpenseStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

export type AdminPermission =
  | 'dashboard.view'
  | 'workers.view'
  | 'workers.create'
  | 'workers.update'
  | 'workers.deactivate'
  | 'sites.view'
  | 'sites.create'
  | 'sites.update'
  | 'sites.deactivate'
  | 'sites.complete'
  | 'sites.delete'
  | 'funds.view'
  | 'funds.allocate'
  | 'expenses.view'
  | 'expenses.approve'
  | 'expenses.reject'
  | 'categories.view'
  | 'categories.create'
  | 'categories.update'
  | 'categories.deactivate'
  | 'categories.delete'
  | 'categories.subcategories';

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
  isSuperAdmin?: boolean;
  permissions?: AdminPermission[];
}

export interface Worker extends AuthUser {
  isActive: boolean;
  pendingApproval?: boolean;
  resetRequested?: boolean;
}

export interface Admin extends AuthUser {
  role: 'ADMIN';
  isSuperAdmin: boolean;
  permissions: AdminPermission[];
  isActive: boolean;
}

export interface Site {
  id: string;
  name: string;
  address?: string;
  description?: string;
  isActive: boolean;
  isCompleted: boolean;
}

export interface ExpenseSubcategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  isActive: boolean;
  subcategories?: ExpenseSubcategory[];
}

export interface Fund {
  id: string;
  workerId: string;
  workerName?: string;
  siteId?: string;
  siteName?: string;
  amount: number;
  type: 'INITIAL' | 'ADDITIONAL';
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  workerId?: string;
  workerName?: string;
  siteId?: string;
  siteName?: string;

  category: string;
  subcategory?: string;

  amount: number;
  description?: string;
  createdAt: string;
  status: ExpenseStatus;
  reviewNote?: string;

  // Multiple receipts
  receiptUrls?: string[];

  // Backward compatibility
  receiptUrl?: string;
}

export interface Listed<T> {
  items: T[];
  summary: Record<string, number>;
}