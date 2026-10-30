import { receiptUrl } from './storage.js';
import type { Stats } from './stats.js';
/* eslint-disable @typescript-eslint/no-explicit-any */
export const userOut = (u: any, s?: Stats) => ({ id: String(u._id ?? u.id), name: u.name, phone: u.phone, email: u.email ?? '', role: u.role, isActive: u.isActive, pendingApproval: !!u.pendingApproval, resetRequested: !!u.resetRequestedAt, ...s });
export const siteOut = (s: any) => ({
  id: String(s._id),
  name: s.name,
  address: s.address ?? '',
  description: s.description ?? '',
  isActive: s.isActive,
  isCompleted: s.isCompleted ?? false,
});
export const categoryOut = (c: any) => ({ id: String(c._id), name: c.name, isActive: c.isActive });
const pid = (x: any) => String(x?._id ?? x ?? '');
export const fundOut = (f: any) => ({ id: String(f._id), workerId: pid(f.workerId), workerName: f.workerId?.name, siteId: f.siteId ? pid(f.siteId) : undefined, siteName: f.siteId?.name,
  amount: f.amountPaise / 100, type: f.type, notes: f.notes, createdAt: f.createdAt });
export const expenseOut = (e: any) => ({ id: String(e._id), workerId: pid(e.workerId), workerName: e.workerId?.name, siteId: pid(e.siteId), siteName: e.siteId?.name,
  category: e.category, amount: e.amountPaise / 100, description: e.description, createdAt: e.createdAt, status: e.status, reviewNote: e.reviewNote || undefined, receiptUrl: receiptUrl(e.receiptKey) });
