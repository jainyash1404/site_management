import { Expense, Fund, oid } from './models.js';

export interface Stats { totalAllocated: number; approvedAmount: number; pendingAmount: number; rejectedAmount: number; availableBalance: number; approvedCount: number; pendingCount: number; rejectedCount: number }
const zero = (): Stats => ({ totalAllocated: 0, approvedAmount: 0, pendingAmount: 0, rejectedAmount: 0, availableBalance: 0, approvedCount: 0, pendingCount: 0, rejectedCount: 0 });

// Balance = all funds given − APPROVED expenses only. Computed from records every time; never stored.
export async function workerStats(ids?: string[]): Promise<Map<string, Stats>> {
  const match = ids ? { workerId: { $in: ids.map(oid) } } : {};
  const [funds, exps] = await Promise.all([
    Fund.aggregate([{ $match: match }, { $group: { _id: '$workerId', t: { $sum: '$amountPaise' } } }]),
    Expense.aggregate([{ $match: match }, { $group: { _id: { w: '$workerId', s: '$status' }, t: { $sum: '$amountPaise' }, n: { $sum: 1 } } }]),
  ]);
  const m = new Map<string, Stats>(); const get = (id: string) => { if (!m.has(id)) m.set(id, zero()); return m.get(id)!; };
  for (const f of funds) get(String(f._id)).totalAllocated = f.t / 100;
  for (const e of exps) {
    const s = get(String(e._id.w)), k = { APPROVED: 'approved', PENDING: 'pending', REJECTED: 'rejected' }[e._id.s as 'APPROVED'];
    (s as unknown as Record<string, number>)[`${k}Amount`] = e.t / 100; (s as unknown as Record<string, number>)[`${k}Count`] = e.n;
  }
  for (const s of m.values()) s.availableBalance = Math.round((s.totalAllocated - s.approvedAmount) * 100) / 100;
  return m;
}
export const statsOf = (m: Map<string, Stats>, id: string) => m.get(id) ?? zero();
