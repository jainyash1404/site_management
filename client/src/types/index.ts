export type Role = 'ADMIN' | 'WORKER';
export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export interface AuthUser { id: string; name: string; phone: string; email?: string; role: Role }
export interface Worker extends AuthUser { isActive: boolean; pendingApproval?: boolean; resetRequested?: boolean }
export interface Site {
  id: string;
  name: string;
  address?: string;
  description?: string;
  isActive: boolean;
  isCompleted: boolean;
}
export interface ExpenseCategory { id: string; name: string; isActive: boolean }
export interface Fund { id: string; workerId: string; workerName?: string; siteId?: string; siteName?: string; amount: number; type: 'INITIAL' | 'ADDITIONAL'; notes?: string; createdAt: string }
export interface Expense { id: string; workerId?: string; workerName?: string; siteId?: string; siteName?: string; category: string; amount: number; description?: string; createdAt: string; status: ExpenseStatus; reviewNote?: string; receiptUrl?: string }
export interface Listed<T> { items: T[]; summary: Record<string, number> }
