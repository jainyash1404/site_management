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
  q
    .populate('workerId', 'name role')
    .populate('addedBy', 'name role')
    .populate('siteId', 'name');

const str = (v: unknown) =>
  typeof v === 'string' && v ? v : undefined;

const currentUserId = (req: any) => me(req).id;

// ==========================================
// INDIA CURRENT DATE
// ==========================================

const todayIST = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(new Date());

// ==========================================
// GET ALL EXPENSES - ADMIN
// ==========================================

r.get(
  '/',
  role('ADMIN'),
  requirePermission('expenses.view'),
  async (req, res) => {
    const q = req.query;
    const f: Record<string, any> = {};

    const status = str(q.status);

    if (status) {
      if (
        ![
          'PENDING',
          'APPROVED',
          'REJECTED',
          'RECORDED',
        ].includes(status)
      ) {
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

    // NESTED CATEGORY PATH FILTER

    if (str(q.category)) {
      const categorySearch = str(q.category)!.trim();

      f.category = {
        $regex: esc(categorySearch),
        $options: 'i',
      };
    }

    // LEGACY SUBCATEGORY FILTER

    if (str(q.subcategory)) {
      f.subcategory = {
        $regex: esc(str(q.subcategory)!),
        $options: 'i',
      };
    }

    // FILTER BY ACTUAL EXPENSE DATE

    if (str(q.from) || str(q.to)) {
      const dateConditions: any[] = [];

      if (str(q.from)) {
        dateConditions.push({
          $gte: [
            {
              $ifNull: [
                '$expenseDate',
                '$createdAt',
              ],
            },
            new Date(
              str(q.from)! + 'T00:00:00.000Z',
            ),
          ],
        });
      }

      if (str(q.to)) {
        dateConditions.push({
          $lte: [
            {
              $ifNull: [
                '$expenseDate',
                '$createdAt',
              ],
            },
            new Date(
              str(q.to)! + 'T23:59:59.999Z',
            ),
          ],
        });
      }

      f.$expr = {
        $and: dateConditions,
      };
    }

    // SEARCH

    const text = str(q.q);

    if (text) {
      const rx = new RegExp(
        esc(text.slice(0, 80)),
        'i',
      );

      const matchingUsers = await User.find({
        name: rx,
      })
        .select('_id')
        .lean();

      const ids = matchingUsers.map(u => u._id);

      f.$or = [
        { description: rx },
        { category: rx },
        { subcategory: rx },
        { workerId: { $in: ids } },
        { addedBy: { $in: ids } },
      ];
    }

    const limit = Math.min(
      Math.max(Number(q.limit) || 500, 1),
      500,
    );

    const items = await populate(
      Expense.find(f)
        .sort({ createdAt: -1 })
        .limit(limit),
    ).lean();

    const agg = await Expense.aggregate([
      {
        $match: f,
      },
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

        recordedAmount:
          (g('RECORDED')?.t ?? 0) / 100,

        pendingCount:
          g('PENDING')?.n ?? 0,

        rejectedCount:
          g('REJECTED')?.n ?? 0,

        approvedCount:
          g('APPROVED')?.n ?? 0,

        recordedCount:
          g('RECORDED')?.n ?? 0,
      },
    });
  },
);

// ==========================================
// WORKER - OWN EXPENSES
// ==========================================

r.get(
  '/my',
  role('WORKER'),
  async (req, res) => {
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
  },
);

// ==========================================
// VALIDATE NESTED CATEGORY PATH
// ==========================================

async function validateCategoryPath(
  categoryPath: string,
): Promise<string> {
  const parts = categoryPath
    .split('/')
    .map(part => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    throw new HttpError(
      400,
      'Select a valid category',
    );
  }

  if (parts.length > 50) {
    throw new HttpError(
      400,
      'Category hierarchy is too deep',
    );
  }

  let parentId: any = null;

  const resolvedNames: string[] = [];

  for (const categoryName of parts) {
    const categoryDoc = await Category.findOne({
      name: categoryName,
      parentId,
      isActive: true,
    }).collation({
      locale: 'en',
      strength: 2,
    });

    if (!categoryDoc) {
      throw new HttpError(
        400,
        `Invalid or inactive category: ${categoryName}`,
      );
    }

    resolvedNames.push(categoryDoc.name);
    parentId = categoryDoc._id;
  }

  return resolvedNames.join(' / ');
}

// ==========================================
// SUBMIT EXPENSE - ADMIN / WORKER
// ==========================================

r.post(
  '/',
  upload.array('receipts', 5),

  // ADMIN PERMISSION CHECK

  (req, res, next) => {
    const currentUser = me(req);

    if (currentUser.role !== 'ADMIN') {
      return next();
    }

    const permission = req.body?.workerId
      ? 'expenses.create.forWorker'
      : 'expenses.create.own';

    return requirePermission(permission)(
      req,
      res,
      next,
    );
  },

  async (req, res) => {
    const currentUser = me(req);

    const isAdmin = currentUser.role === 'ADMIN';

    if (
      currentUser.role !== 'ADMIN' &&
      currentUser.role !== 'WORKER'
    ) {
      throw new HttpError(403, 'Access denied');
    }

    // VALIDATE REQUEST BODY

    const b = parse(
      z.object({
        siteId: z.string().min(1),

        workerId: z.string().optional(),

        expenseDate: z.string()
          .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            'Invalid expense date',
          )
          .optional(),

        amount: money,

        category: z.string()
          .trim()
          .min(1, 'Category is required')
          .max(500, 'Category path is too long'),

        subcategory: z.string()
          .trim()
          .optional()
          .default(''),

        description: z.string()
          .trim()
          .max(500)
          .optional(),
      }),
      req.body,
    );

    // VALIDATE EXPENSE DATE

    const selectedDate = isAdmin
      ? (b.expenseDate || todayIST())
      : todayIST();

    const [year, month, day] = selectedDate
      .split('-')
      .map(Number);

    const expenseDate = new Date(
      Date.UTC(year, month - 1, day),
    );

    if (
      expenseDate.toISOString().slice(0, 10) !==
      selectedDate
    ) {
      throw new HttpError(
        400,
        'Invalid expense date',
      );
    }

    // REJECT FUTURE DATES

    if (selectedDate > todayIST()) {
      throw new HttpError(
        400,
        'Future expense dates are not allowed',
      );
    }

    // VALIDATE SITE

    const selectedSiteId = idParam(b.siteId);

    const siteExists = await Site.exists({
      _id: selectedSiteId,
      isActive: true,
      isCompleted: false,
    });

    if (!siteExists) {
      throw new HttpError(
        400,
        'Selected site is inactive or completed',
      );
    }

    // DETERMINE EXPENSE OWNER

    let expenseOwnerId = currentUser.id;

    // ADMIN ADDING EXPENSE FOR WORKER

    if (isAdmin && b.workerId) {
      const workerId = idParam(b.workerId);

      const worker = await User.findOne({
        _id: workerId,
        role: 'WORKER',
        isActive: true,
      })
        .select('_id assignedSites')
        .lean();

      if (!worker) {
        throw new HttpError(
          404,
          'Worker not found or inactive',
        );
      }

      const assigned = (
        worker.assignedSites ?? []
      ).some(
        site =>
          String(site) === String(selectedSiteId),
      );

      if (!assigned) {
        throw new HttpError(
          403,
          'Worker is not assigned to this site',
        );
      }

      expenseOwnerId = String(worker._id);
    }

    // WORKER MUST USE ASSIGNED SITE

    if (!isAdmin) {
      const worker = await User.findById(
        currentUser.id,
      )
        .select('assignedSites')
        .lean();

      if (!worker) {
        throw new HttpError(
          404,
          'Worker not found',
        );
      }

      const assigned = (
        worker.assignedSites ?? []
      ).some(
        site =>
          String(site) === String(selectedSiteId),
      );

      if (!assigned) {
        throw new HttpError(
          403,
          'You are not assigned to this site',
        );
      }
    }

    // VALIDATE COMPLETE CATEGORY HIERARCHY

    const savedCategoryPath =
      await validateCategoryPath(b.category);

    // RECEIPTS

    const files = (
      req.files as Express.Multer.File[] | undefined
    ) ?? [];

    if (files.length > 5) {
      throw new HttpError(
        400,
        'Maximum 5 receipt images are allowed',
      );
    }

    const receiptKeys = await Promise.all(
      files.map(file => saveReceipt(file)),
    );

    // STATUS LOGIC

    const status = isAdmin
      ? 'RECORDED'
      : 'PENDING';

    // CREATE EXPENSE

    const e = await Expense.create({
      workerId: expenseOwnerId,

      addedBy: currentUser.id,
      addedByRole: currentUser.role,

      siteId: selectedSiteId,

      expenseDate,

      category: savedCategoryPath,
      subcategory: '',

      amountPaise: b.amount,

      description: b.description ?? '',

      status,

      receiptKeys,

      history: [
        {
          status,
          by: oid(currentUser.id),
          at: new Date(),
          note: isAdmin
            ? 'Recorded directly by admin'
            : 'Submitted by worker',
        },
      ],
    });

    // AUDIT

    audit(
      currentUser.id,
      isAdmin
        ? 'ADMIN_EXPENSE_RECORDED'
        : 'EXPENSE_SUBMITTED',
      'Expense',
      e.id,
      {
        workerId: expenseOwnerId,
        addedBy: currentUser.id,
        amountPaise: b.amount,
        category: savedCategoryPath,
        subcategory: '',
        expenseDate: selectedDate,
        status,
        receiptCount: receiptKeys.length,
      },
    );

    const saved = await populate(
      Expense.findById(e.id),
    ).lean();

    res.status(201).json({
      data: expenseOut(saved),
    });
  },
);

// ==========================================
// ADMIN - APPROVE / REJECT EXPENSE
// ==========================================

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

    throw new HttpError(
      400,
      'Invalid expense status',
    );
  },

  async (req, res) => {
    const b = parse(
      z.object({
        status: z.enum([
          'APPROVED',
          'REJECTED',
        ]),

        reviewNote: z.string()
          .trim()
          .max(500)
          .optional(),
      }),
      req.body,
    );

    const id = idParam(req.params.id);
    const at = new Date();

    const e = await Expense.findOneAndUpdate(
      {
        _id: id,
        status: 'PENDING',
      },
      {
        $set: {
          status: b.status,
          reviewNote: b.reviewNote ?? '',
          reviewedBy: currentUserId(req),
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
          : new HttpError(
              404,
              'Expense not found',
            )
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

// ==========================================
// ADMIN - DELETE EXPENSE
// ==========================================

r.delete(
  '/:id',
  role('ADMIN'),
  requirePermission('expenses.delete'),
  async (req, res) => {
    const id = idParam(req.params.id);

    // FIND AND DELETE EXPENSE

    const expense = await Expense.findOneAndDelete({
      _id: id,
    });

    if (!expense) {
      throw new HttpError(
        404,
        'Expense not found',
      );
    }

    // AUDIT LOG

    audit(
      me(req).id,
      'EXPENSE_DELETED',
      'Expense',
      expense.id,
      {
        workerId: String(expense.workerId),
        siteId: String(expense.siteId),
        amountPaise: expense.amountPaise,
        category: expense.category,
        subcategory: expense.subcategory ?? '',
        status: expense.status,
        expenseDate: expense.expenseDate,
        receiptCount: expense.receiptKeys?.length ?? 0,
      },
    );

    res.json({
      message: 'Expense deleted successfully',
      id: expense.id,
    });
  },
);

export default r;