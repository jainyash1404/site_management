import { Expense, Fund, oid } from './models.js';

export interface Stats {
  totalAllocated: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  recordedAmount: number;
  availableBalance: number;

  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  recordedCount: number;
}

const zero = (): Stats => ({
  totalAllocated: 0,
  approvedAmount: 0,
  pendingAmount: 0,
  rejectedAmount: 0,
  recordedAmount: 0,
  availableBalance: 0,

  approvedCount: 0,
  pendingCount: 0,
  rejectedCount: 0,
  recordedCount: 0,
});

export async function workerStats(
  ids?: string[],
  siteId?: string,
): Promise<Map<string, Stats>> {

  const fundMatch: Record<string, any> = {};
  const expenseMatch: Record<string, any> = {};

  if (ids) {
    const workerIds = ids.map(oid);

    fundMatch.workerId = { $in: workerIds };
    expenseMatch.workerId = { $in: workerIds };
  }

  if (siteId) {
    const selectedSiteId = oid(siteId);

    fundMatch.siteId = selectedSiteId;
    expenseMatch.siteId = selectedSiteId;
  }

  const [funds, expenses] = await Promise.all([

    // WORKER FUNDS
    Fund.aggregate([
      { $match: fundMatch },
      {
        $group: {
          _id: '$workerId',
          total: { $sum: '$amountPaise' },
        },
      },
    ]),

    // WORKER EXPENSES
    Expense.aggregate([
      { $match: expenseMatch },
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

  for (const fund of funds) {
    if (!fund._id) continue;

    getStats(String(fund._id)).totalAllocated =
      fund.total / 100;
  }

  for (const expense of expenses) {
    const workerId = String(expense._id.workerId);

    const stats = getStats(workerId);

    const amount = expense.total / 100;
    const count = expense.count;

    switch (expense._id.status) {

      case 'APPROVED':
        stats.approvedAmount = amount;
        stats.approvedCount = count;
        break;

      case 'PENDING':
        stats.pendingAmount = amount;
        stats.pendingCount = count;
        break;

      case 'REJECTED':
        stats.rejectedAmount = amount;
        stats.rejectedCount = count;
        break;

      case 'RECORDED':
        stats.recordedAmount = amount;
        stats.recordedCount = count;
        break;
    }
  }

  for (const stats of statsMap.values()) {
    stats.availableBalance = Math.round(
      (
        stats.totalAllocated -
        stats.approvedAmount -
        stats.recordedAmount
      ) * 100
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