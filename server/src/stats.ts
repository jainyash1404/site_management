import { Expense, Fund, oid } from './models.js';

export interface Stats {
  totalAllocated: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  availableBalance: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

const zero = (): Stats => ({
  totalAllocated: 0,
  approvedAmount: 0,
  pendingAmount: 0,
  rejectedAmount: 0,
  availableBalance: 0,
  approvedCount: 0,
  pendingCount: 0,
  rejectedCount: 0,
});

// Balance = Total funds allocated - APPROVED expenses only.
// Calculated from database records every time; never stored.
export async function workerStats(
  ids?: string[]
): Promise<Map<string, Stats>> {
  const match = ids
    ? { workerId: { $in: ids.map(oid) } }
    : {};

  const [funds, expenses] = await Promise.all([
    Fund.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$workerId',
          total: { $sum: '$amountPaise' },
        },
      },
    ]),

    Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            workerId: '$workerId',
            status: '$status',
          },
          total: { $sum: '$amountPaise' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const statsMap = new Map<string, Stats>();

  const getStats = (id: string): Stats => {
    if (!statsMap.has(id)) {
      statsMap.set(id, zero());
    }

    return statsMap.get(id)!;
  };

  // Calculate total allocated funds.
  for (const fund of funds) {
    const stats = getStats(String(fund._id));
    stats.totalAllocated = fund.total / 100;
  }

  const statusMap = {
    APPROVED: 'approved',
    PENDING: 'pending',
    REJECTED: 'rejected',
  } as const;

  // Calculate expense amounts and counts.
  for (const expense of expenses) {
    const workerId = String(expense._id.workerId);
    const status = expense._id.status as keyof typeof statusMap;
    const key = statusMap[status];

    if (!key) continue;

    const stats = getStats(workerId);

    if (key === 'approved') {
      stats.approvedAmount = expense.total / 100;
      stats.approvedCount = expense.count;
    } else if (key === 'pending') {
      stats.pendingAmount = expense.total / 100;
      stats.pendingCount = expense.count;
    } else if (key === 'rejected') {
      stats.rejectedAmount = expense.total / 100;
      stats.rejectedCount = expense.count;
    }
  }

  // Available balance = allocated funds - approved expenses.
  for (const stats of statsMap.values()) {
    stats.availableBalance =
      Math.round(
        (stats.totalAllocated - stats.approvedAmount) * 100
      ) / 100;
  }

  return statsMap;
}

export const statsOf = (
  statsMap: Map<string, Stats>,
  id: string
): Stats => {
  return statsMap.get(id) ?? zero();
};