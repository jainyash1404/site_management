import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import {
  Category,
  Expense,
  Site,
  User,
  audit,
  oid,
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

import { expenseOut } from '../serialize.js';
import { saveReceipt } from '../storage.js';
import { statsOf, workerStats } from '../stats.js';
import { money } from './funds.js';

const r = Router();

r.use(auth);

// Maximum 5 images, each up to 5 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
});

const esc = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const populate = <
  T extends { populate: (p: string, f: string) => T }
>(q: T) =>
  q.populate('workerId', 'name').populate('siteId', 'name');

const str = (v: unknown) =>
  typeof v === 'string' && v ? v : undefined;

// GET ALL EXPENSES - ADMIN
r.get(
  '/',
  role('ADMIN'),
  requirePermission('expenses.view'),
  async (req, res) => {
    const q = req.query;
    const f: Record<string, unknown> = {};

    const status = str(q.status);

    if (status) {
      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        throw new HttpError(400, 'Invalid status');
      }

      f.status = status;
    }

    if (str(q.workerId)) {
      f.workerId = idParam(q.workerId);
    }

    if (str(q.siteId)) {
      f.siteId = idParam(q.siteId);
    }

    // CATEGORY FILTER
    if (str(q.category)) {
      f.category = str(q.category);
    }

    // SUBCATEGORY FILTER
    if (str(q.subcategory)) {
      f.subcategory = str(q.subcategory);
    }

    // DATE FILTER
    const from = str(q.from);
    const to = str(q.to);

    if (from || to) {
      f.createdAt = {
        ...(from && {
          $gte: new Date(from + 'T00:00:00.000Z'),
        }),
        ...(to && {
          $lte: new Date(to + 'T23:59:59.999Z'),
        }),
      };
    }

    // SEARCH FILTER
    const text = str(q.q);

    if (text) {
      const rx = new RegExp(esc(text.slice(0, 80)), 'i');

      const ws = await User.find({
        role: 'WORKER',
        name: rx,
      }).select('_id').lean();

      f.$or = [
        { description: rx },
        { category: rx },
        { subcategory: rx },
        {
          workerId: {
            $in: ws.map(w => w._id),
          },
        },
      ];
    }

    const limit = Math.min(Number(q.limit) || 500, 500);

    const items = await populate(
      Expense.find(f)
        .sort({ createdAt: -1 })
        .limit(limit),
    ).lean();

    // EXPENSE SUMMARY
    const agg = await Expense.aggregate([
      {
        $group: {
          _id: '$status',
          t: { $sum: '$amountPaise' },
          n: { $sum: 1 },
        },
      },
    ]);

    const g = (s: string) =>
      agg.find(a => a._id === s);

    res.json({
      data: items.map(expenseOut),
      summary: {
        totalAmount:
          agg.reduce((a, x) => a + x.t, 0) / 100,

        approvedAmount:
          (g('APPROVED')?.t ?? 0) / 100,

        pendingAmount:
          (g('PENDING')?.t ?? 0) / 100,

        pendingCount:
          g('PENDING')?.n ?? 0,

        rejectedCount:
          g('REJECTED')?.n ?? 0,

        approvedCount:
          g('APPROVED')?.n ?? 0,
      },
    });
  },
);

// WORKER - OWN EXPENSES
r.get('/my', role('WORKER'), async (req, res) => {
  const id = me(req).id;

  const items = await populate(
    Expense.find({ workerId: id })
      .sort({ createdAt: -1 }),
  ).lean();

  res.json({
    data: items.map(expenseOut),
    summary: statsOf(
      await workerStats([id]),
      id,
    ),
  });
});

// WORKER - SUBMIT EXPENSE
r.post(
  '/',
  role('WORKER'),
  upload.array('receipts', 5),
  async (req, res) => {
    const b = parse(
      z.object({
        siteId: z.string(),
        amount: money,
        category: z.string().trim().min(1, 'Category is required'),
        subcategory: z.string().trim().optional().default(''),
        description: z.string().trim().max(500).optional(),
      }),
      req.body,
    );

    // VALIDATE ACTIVE SITE
    // VALIDATE ASSIGNED ACTIVE SITE
const worker = await User.findById(me(req).id)
  .select('assignedSites')
  .lean();

if (!worker) {
  throw new HttpError(404, 'Worker not found');
}

const selectedSiteId = idParam(b.siteId);

const isAssigned = (worker.assignedSites ?? []).some(
  siteId => String(siteId) === String(selectedSiteId)
);

if (!isAssigned) {
  throw new HttpError(
    403,
    'You are not assigned to this site.',
  );
}

const siteExists = await Site.exists({
  _id: selectedSiteId,
  isActive: true,
  isCompleted: false,
});

if (!siteExists) {
  throw new HttpError(
    400,
    'Selected site is inactive or completed.',
  );
}

    // FIND ACTIVE CATEGORY
    const categoryDoc = await Category.findOne({
      name: b.category,
      isActive: true,
    }).collation({
      locale: 'en',
      strength: 2,
    });

    if (!categoryDoc) {
      throw new HttpError(400, 'Select a valid category');
    }

    // VALIDATE SUBCATEGORY
    const activeSubcategories = (
      categoryDoc.subcategories ?? []
    ).filter(sub => sub.isActive);

    if (
      activeSubcategories.length > 0 &&
      !b.subcategory
    ) {
      throw new HttpError(400, 'Select a subcategory');
    }

    if (b.subcategory) {
      const validSubcategory = activeSubcategories.some(
        sub =>
          sub.name.trim().toLowerCase() ===
          b.subcategory.trim().toLowerCase(),
      );

      if (!validSubcategory) {
        throw new HttpError(400, 'Select a valid subcategory');
      }
    }

    // GET UPLOADED IMAGES
    const files = (
      req.files as Express.Multer.File[] | undefined
    ) ?? [];

    if (files.length > 5) {
      throw new HttpError(
        400,
        'Maximum 5 receipt images are allowed',
      );
    }

    // SAVE ALL RECEIPT IMAGES
    const receiptKeys = await Promise.all(
      files.map(file => saveReceipt(file)),
    );

    // CREATE EXPENSE
    const e = await Expense.create({
      workerId: me(req).id,
      siteId: b.siteId,
      category: b.category,
      subcategory: b.subcategory,
      amountPaise: b.amount,
      description: b.description ?? '',
      receiptKeys,
      history: [
        {
          status: 'PENDING',
          by: me(req).id,
          at: new Date(),
        },
      ],
    });

    audit(
      me(req).id,
      'EXPENSE_SUBMITTED',
      'Expense',
      e.id,
      {
        amountPaise: b.amount,
        category: b.category,
        subcategory: b.subcategory,
        receiptCount: receiptKeys.length,
      },
    );

    res.status(201).json({
      data: expenseOut(
        await populate(
          Expense.findById(e.id),
        ).lean(),
      ),
    });
  },
);

// ADMIN - APPROVE / REJECT EXPENSE
r.patch(
  '/:id/review',
  role('ADMIN'),
  async (req, res, next) => {
    const status = req.body?.status;

    if (status === 'APPROVED') {
      return requirePermission('expenses.approve')(
        req,
        res,
        next,
      );
    }

    if (status === 'REJECTED') {
      return requirePermission('expenses.reject')(
        req,
        res,
        next,
      );
    }

    throw new HttpError(400, 'Invalid expense status');
  },
  async (req, res) => {
    const b = parse(
      z.object({
        status: z.enum(['APPROVED', 'REJECTED']),
        reviewNote: z.string().trim().max(500).optional(),
      }),
      req.body,
    );

    const id = idParam(req.params.id);
    const at = new Date();

    // ATOMIC UPDATE PREVENTS DUPLICATE REVIEWS
    const e = await Expense.findOneAndUpdate(
      {
        _id: id,
        status: 'PENDING',
      },
      {
        $set: {
          status: b.status,
          reviewNote: b.reviewNote ?? '',
          reviewedBy: me(req).id,
          reviewedAt: at,
        },
        $push: {
          history: {
            status: b.status,
            by: oid(me(req).id),
            at,
            note: b.reviewNote ?? '',
          },
        },
      },
      {
        new: true,
      },
    );

    if (!e) {
      throw (
        await Expense.exists({ _id: id })
          ? new HttpError(
              409,
              'Only pending expenses can be reviewed',
            )
          : new HttpError(404, 'Expense not found')
      );
    }

    audit(
      me(req).id,
      b.status === 'APPROVED'
        ? 'EXPENSE_APPROVED'
        : 'EXPENSE_REJECTED',
      'Expense',
      e.id,
      {
        workerId: String(e.workerId),
        amountPaise: e.amountPaise,
        note: b.reviewNote,
      },
    );

    res.json({
      data: expenseOut(
        await populate(
          Expense.findById(e.id),
        ).lean(),
      ),
    });
  },
);

export default r;