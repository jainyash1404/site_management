import { Router } from 'express';
import { z } from 'zod';

import { Fund, Site, User, audit, oid } from '../models.js';

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

export const money = z.coerce
  .number()
  .positive('Amount must be greater than 0')
  .max(1_000_000_000)
  .refine(
    n => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6,
    'At most 2 decimal places',
  )
  .transform(n => Math.round(n * 100));

// GET FUNDS
r.get('/', async (req, res, next) => {
  const u = me(req);

  // Workers retain their existing access.
  if (u.role === 'ADMIN') {
    return requirePermission('funds.view')(req, res, next);
  }

  next();
}, async (req, res) => {
  const u = me(req);
  const q = req.query;

  const filter: Record<string, unknown> =
    u.role === 'ADMIN'
      ? (
          typeof q.workerId === 'string' && q.workerId
            ? { workerId: idParam(q.workerId) }
            : {}
        )
      : { workerId: u.id };

  const items = await Fund.find(filter)
    .sort({ createdAt: -1 })
    .populate('workerId', 'name')
    .populate('siteId', 'name')
    .lean();

  const [t] = await Fund.aggregate([
    {
      $match: filter.workerId
        ? { workerId: oid(String(filter.workerId)) }
        : {},
    },
    {
      $group: {
        _id: null,
        t: { $sum: '$amountPaise' },
      },
    },
  ]);

  res.json({
    data: items.map(fundOut),
    summary: {
      totalAllocated: (t?.t ?? 0) / 100,
    },
  });
});

// ALLOCATE FUNDS
r.post(
  '/',
  role('ADMIN'),
  requirePermission('funds.allocate'),
  async (req, res) => {
    const b = parse(
      z.object({
        workerId: z.string(),
        siteId: z.string().optional(),
        amount: money,
        type: z.enum(['INITIAL', 'ADDITIONAL']),
        notes: z.string().trim().max(300).optional(),
      }),
      req.body,
    );

    if (
      !(await User.exists({
        _id: idParam(b.workerId),
        role: 'WORKER',
        isActive: true,
      }))
    ) {
      throw new HttpError(400, 'Select an active worker');
    }

    if (
      b.siteId &&
      !(await Site.exists({
        _id: idParam(b.siteId),
      }))
    ) {
      throw new HttpError(400, 'Site not found');
    }

    const f = await Fund.create({
      workerId: b.workerId,
      siteId: b.siteId || undefined,
      amountPaise: b.amount,
      type: b.type,
      notes: b.notes ?? '',
      createdBy: me(req).id,
    });

    audit(
      me(req).id,
      'FUND_ALLOCATED',
      'Fund',
      f.id,
      {
        workerId: b.workerId,
        amountPaise: b.amount,
        type: b.type,
      },
    );

    res.status(201).json({
      data: fundOut(f.toObject()),
    });
  },
);

export default r;