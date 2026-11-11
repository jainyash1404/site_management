import { Router } from 'express';
import { z } from 'zod';

import {
  Fund,
  Site,
  User,
  audit,
} from '../models.js';

import {
  HttpError,
  auth,
  idParam,
  me,
  parse,
  role,
  requirePermission,
} from '../middleware.js';

import { fundOut } from '../serialize.js';

const r = Router();

r.use(auth);

// ==========================================
// MONEY VALIDATION
// ==========================================

export const money = z.coerce
  .number()
  .positive('Amount must be greater than 0')
  .max(1_000_000_000)
  .refine(
    n => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6,
    'At most 2 decimal places',
  )
  .transform(n => Math.round(n * 100));

const paymentModeSchema = z.enum([
  'CASH',
  'UPI',
  'BANK_TRANSFER',
  'CHEQUE',
  'OTHER',
]);

// ==========================================
// GET ALL FUNDS
// ==========================================

r.get(
  '/',
  role('ADMIN'),
  requirePermission('funds.view'),
  async (req, res) => {
    const q = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof q.siteId === 'string' && q.siteId) {
      filter.siteId = idParam(q.siteId);
    }

    if (typeof q.workerId === 'string' && q.workerId) {
      filter.workerId = idParam(q.workerId);
    }

    const items = await Fund.find(filter)
      .sort({ createdAt: -1 })
      .populate('workerId', 'name phone')
      .populate('siteId', 'name')
      .populate('createdBy', 'name')
      .lean();

    const [summary] = await Fund.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,
          totalAllocated: {
            $sum: '$amountPaise',
          },
        },
      },
    ]);

    res.json({
      data: items.map(fundOut),

      summary: {
        totalAllocated:
          (summary?.totalAllocated ?? 0) / 100,
      },
    });
  },
);

// ==========================================
// ADD FUNDS
// SUPPORTS BOTH WORKER AND SITE ALLOCATION
// ==========================================

r.post(
  '/',
  role('ADMIN'),
  requirePermission('funds.allocate'),
  async (req, res) => {

    const b = parse(
      z.object({
        workerId: z.string().optional(),

        siteId: z.string().optional(),

        contributorName: z.string()
          .trim()
          .max(100)
          .optional(),

        amount: money,

        paymentMode: paymentModeSchema
          .default('CASH'),

        notes: z.string()
          .trim()
          .max(300)
          .optional(),
      }),
      req.body,
    );

    const isWorkerAllocation = Boolean(b.workerId);
    const isSiteAllocation = Boolean(
      b.siteId && b.contributorName?.trim(),
    );

    // Either worker allocation or site contribution is required.
    if (!isWorkerAllocation && !isSiteAllocation) {
      throw new HttpError(
        400,
        'Select a worker or provide a site and contributor name',
      );
    }

    // ======================================
    // VALIDATE WORKER
    // ======================================

    let worker: any = null;

    if (isWorkerAllocation) {
      worker = await User.findOne({
        _id: idParam(b.workerId!),
        role: 'WORKER',
      });

      if (!worker) {
        throw new HttpError(
          404,
          'Worker not found',
        );
      }

      if (!worker.isActive) {
        throw new HttpError(
          400,
          'Cannot allocate funds to an inactive worker',
        );
      }
    }

    // ======================================
    // VALIDATE SITE
    // ======================================

    let site: any = null;

    if (b.siteId) {
      site = await Site.findById(
        idParam(b.siteId),
      );

      if (!site) {
        throw new HttpError(
          404,
          'Site not found',
        );
      }

      if (!site.isActive || site.isCompleted) {
        throw new HttpError(
          400,
          'Funds cannot be added to an inactive or completed site',
        );
      }
    }

    // Site contribution must have a contributor name.
    if (b.siteId && !isWorkerAllocation && !b.contributorName?.trim()) {
      throw new HttpError(
        400,
        'Fund contributor name is required',
      );
    }

    // ======================================
    // CREATE FUND
    // ======================================

    const fund = await Fund.create({
      workerId: worker?._id,

      siteId: site?._id,

      contributorName: b.contributorName?.trim() ?? '',

      amountPaise: b.amount,

      paymentMode: b.paymentMode,

      notes: b.notes ?? '',

      createdBy: me(req).id,
    });

    // ======================================
    // AUDIT LOG
    // ======================================

    audit(
      me(req).id,
      isWorkerAllocation
        ? 'WORKER_FUND_ALLOCATED'
        : 'SITE_FUND_ADDED',
      'Fund',
      String(fund._id),
      {
        workerId: worker
          ? String(worker._id)
          : undefined,

        workerName: worker?.name,

        siteId: site
          ? String(site._id)
          : undefined,

        siteName: site?.name,

        contributorName: b.contributorName,

        amountPaise: b.amount,

        paymentMode: b.paymentMode,
      },
    );

    // ======================================
    // RETURN POPULATED FUND
    // ======================================

    const populatedFund = await Fund.findById(fund._id)
      .populate('workerId', 'name phone')
      .populate('siteId', 'name')
      .populate('createdBy', 'name')
      .lean();

    res.status(201).json({
      data: fundOut(populatedFund),
    });
  },
);

// ==========================================
// DELETE FUND
// ==========================================

r.delete(
  '/:id',
  role('ADMIN'),
  requirePermission('funds.allocate'),
  async (req, res) => {
    const id = idParam(req.params.id);

    const fund = await Fund.findOneAndDelete({
      _id: id,
    });

    if (!fund) {
      throw new HttpError(
        404,
        'Fund record not found',
      );
    }

    audit(
      me(req).id,
      'FUND_DELETED',
      'Fund',
      String(fund._id),
      {
        workerId: fund.workerId
          ? String(fund.workerId)
          : undefined,

        siteId: fund.siteId
          ? String(fund.siteId)
          : undefined,

        contributorName: fund.contributorName,

        amountPaise: fund.amountPaise,        

        paymentMode: fund.paymentMode,
      },
    );

    res.json({
      message: 'Fund deleted successfully',
      id: String(fund._id),
    });
  },
);

export default r;