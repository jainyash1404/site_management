export type Role = 'ADMIN' | 'WORKER';

export type ExpenseStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'RECORDED';

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
  | 'expenses.delete'
  | 'expenses.create.own'
|   'expenses.create.forWorker'
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
  assignedSites?: string[];

  totalAllocated?: number;
  approvedAmount?: number;
  recordedAmount?: number;
  pendingAmount?: number;
  rejectedAmount?: number;
  availableBalance?: number;
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

export interface ExpenseCategory {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Fund {
  id: string;

  workerId?: string;
  workerName?: string;

  siteId?: string;
  siteName?: string;

  contributorName?: string;

  amount: number;

  type: 'INITIAL' | 'ADDITIONAL';

  paymentMode?:
    | 'CASH'
    | 'UPI'
    | 'BANK_TRANSFER'
    | 'CHEQUE'
    | 'OTHER';

  notes: string;

  createdBy?: string;
  createdByName?: string;

  createdAt: string;
}

export interface Expense {
  id: string;
  expenseDate?: string;

  workerId?: string;
  workerName?: string;
  workerRole?: Role;

  addedBy?: string;
  addedByName?: string;
  addedByRole?: Role;

  siteId?: string;
  siteName?: string;

  category: string;
  subcategory?: string;

  amount: number;
  description?: string;
  createdAt: string;
  status: ExpenseStatus;
  reviewNote?: string;

  receiptUrls?: string[];
  receiptUrl?: string;
}

export interface Listed<T> {
  items: T[];
  summary: Record<string, number>;
}