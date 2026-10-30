import { receiptUrl } from './storage.js';
import type { Stats } from './stats.js';


/* eslint-disable @typescript-eslint/no-explicit-any */

export const userOut = (u: any, s?: Partial<Stats>) => ({
  id: String(u._id ?? u.id),
  name: u.name,
  phone: u.phone,
  email: u.email ?? '',
  role: u.role,

  isSuperAdmin: u.role === 'ADMIN' && u.isSuperAdmin === true,
  permissions: u.role === 'ADMIN' ? (u.permissions ?? []) : [],

  isActive: u.isActive,
  assignedSites: (u.assignedSites ?? []).map(
  (site: any) => String(site?._id ?? site)
),
  pendingApproval: !!u.pendingApproval,
  resetRequested: !!u.resetRequestedAt,

  ...s,
});

export const siteOut = (s: any) => ({
  id: String(s._id),
  name: s.name,
  address: s.address ?? '',
  description: s.description ?? '',
  isActive: s.isActive,
  isCompleted: s.isCompleted ?? false,
});

export const categoryOut = (c: any) => ({
  id: String(c._id),
  name: c.name,
  isActive: c.isActive,

  subcategories: (c.subcategories ?? []).map((sub: any) => ({
    id: String(sub._id),
    name: sub.name,
    isActive: sub.isActive,
  })),
});

const pid = (x: any) => String(x?._id ?? x ?? '');

export const fundOut = (f: any) => ({
  id: String(f._id),
  workerId: pid(f.workerId),
  workerName: f.workerId?.name,
  siteId: f.siteId ? pid(f.siteId) : undefined,
  siteName: f.siteId?.name,
  amount: f.amountPaise / 100,
  type: f.type,
  notes: f.notes,
  createdAt: f.createdAt,
});

export const expenseOut = (e: any) => {
  const receiptKeys: string[] =
    e.receiptKeys?.length
      ? e.receiptKeys
      : e.receiptKey
        ? [e.receiptKey]
        : [];

  const receiptUrls = receiptKeys
    .map((key: string) => receiptUrl(key))
    .filter((url: string | undefined): url is string => !!url);

  return {
    id: String(e._id),
    workerId: pid(e.workerId),
    workerName: e.workerId?.name,
    siteId: pid(e.siteId),
    siteName: e.siteId?.name,

    category: e.category,
    subcategory: e.subcategory ?? '',

    amount: e.amountPaise / 100,
    description: e.description,
    createdAt: e.createdAt,
    status: e.status,
    reviewNote: e.reviewNote || undefined,

    // Backward compatibility
    receiptUrl: receiptUrls[0] ?? undefined,

    // Multiple receipts
    receiptUrls,
  };
};