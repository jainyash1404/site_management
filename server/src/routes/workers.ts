import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { User, Site, audit } from '../models.js';

import {
  HttpError,
  auth,
  idParam,
  me,
  parse,
  role,
  requirePermission,
  hasPermission,
} from '../middleware.js';

import { userOut } from '../serialize.js';
import { statsOf, workerStats } from '../stats.js';

const r = Router();

r.use(auth, role('ADMIN'));


const phone = z.string().regex(
  /^\d{10}$/,
  'Enter a 10-digit phone number',
);

const email = z.union([
  z.literal(''),
  z.string().email('Invalid email'),
]);

const password = z.string()
  .min(6, 'Password must be at least 6 characters')
  .max(100);

const assignedSitesSchema = z.object({
  assignedSites: z.array(
    z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid site ID')
  ),
});

const findWorker = async (id: unknown) => {
  const u = await User.findOne({
    _id: idParam(id),
    role: 'WORKER',
  });

  if (!u) {
    throw new HttpError(404, 'Worker not found');
  }

  return u;
};

const safeWorkerStats = (stats: any, admin: any) => {
  const canViewFunds = hasPermission(admin, 'funds.view');
  const canViewExpenses = hasPermission(admin, 'expenses.view');

  const safeStats: Record<string, any> = {};

  if (canViewFunds) {
    safeStats.totalAllocated = stats.totalAllocated;
  }

  if (canViewExpenses) {
    safeStats.approvedAmount = stats.approvedAmount;
    safeStats.pendingAmount = stats.pendingAmount;
    safeStats.rejectedAmount = stats.rejectedAmount;
    safeStats.pendingCount = stats.pendingCount;
    safeStats.rejectedCount = stats.rejectedCount;
  }

  if (canViewFunds && canViewExpenses) {
    safeStats.availableBalance = stats.availableBalance;
  }

  return safeStats;
};

// GET all workers
r.get(
  '/',
  requirePermission('workers.view'),
  async (req, res) => {
    const ws = await User.find({
      role: 'WORKER',
    }).sort({ name: 1 }).lean();

    const st = await workerStats(
      ws.map(w => String(w._id)),
    );

    const admin = me(req);

    res.json({
      data: ws.map(w => {
        const stats = statsOf(st, String(w._id));

        return userOut(
          w,
          safeWorkerStats(stats, admin),
        );
      }),
    });
  },
);

// CREATE worker
r.post(
  '/',
  requirePermission('workers.create'),
  async (req, res) => {
    const b = parse(
      z.object({
        name: z.string().trim().min(2, 'Name is required'),
        phone,
        email: email.optional(),
        password,
      }),
      req.body,
    );

    const u = await User.create({
      name: b.name,
      phone: b.phone,
      email: b.email ?? '',
      passwordHash: await bcrypt.hash(b.password, 10),
      role: 'WORKER',
    });

    audit(
      me(req).id,
      'WORKER_CREATED',
      'User',
      u.id,
      { name: u.name },
    );

    res.status(201).json({
      data: userOut(u),
    });
  },
);

// GET individual worker
r.get(
  '/:id',
  requirePermission('workers.view'),
  async (req, res) => {
    const u = await findWorker(req.params.id);
    const admin = me(req);

    const stats = statsOf(
      await workerStats([u.id]),
      u.id,
    );

    res.json({
      data: userOut(
        u,
        safeWorkerStats(stats, admin),
      ),
    });
  },
);

// UPDATE worker
r.patch(
  '/:id',
  requirePermission('workers.update'),
  async (req, res) => {
    const b = parse(
      z.object({
        name: z.string().trim().min(2).optional(),
        phone: phone.optional(),
        email: email.optional(),
        password: password.optional(),
      }),
      req.body,
    );

    const u = await findWorker(req.params.id);

    if (b.name) u.name = b.name;
    if (b.phone) u.phone = b.phone;
    if (b.email !== undefined) u.email = b.email;

    if (b.password) {
      u.passwordHash = await bcrypt.hash(b.password, 10);
      u.passwordChangedAt = new Date();
      u.resetRequestedAt = undefined;
    }

    await u.save();

    audit(
      me(req).id,
      'WORKER_UPDATED',
      'User',
      u.id,
      {
        fields: Object.keys(b).filter(k => k !== 'password'),
        passwordChanged: !!b.password,
      },
    );

    res.json({
      data: userOut(u),
    });
  },
);

// ASSIGN SITES TO WORKER
r.patch(
  '/:id/sites',
  requirePermission('workers.update'),
  async (req, res) => {
    const { assignedSites } = parse(
      assignedSitesSchema,
      req.body,
    );

    const u = await findWorker(req.params.id);

    // Remove duplicate IDs
    const uniqueSiteIds = [...new Set(assignedSites)];

    // Validate that all selected sites exist and are active
      
    const sites = await Site.find({
      _id: { $in: uniqueSiteIds },
      isActive: true,
      isCompleted: false,
    }).select('_id');

    if (sites.length !== uniqueSiteIds.length) {
      throw new HttpError(
        400,
        'One or more selected sites are invalid, inactive, or completed.',
      );
    }

    u.assignedSites = uniqueSiteIds as any;

    await u.save();

    audit(
      me(req).id,
      'WORKER_SITES_ASSIGNED',
      'User',
      u.id,
      { assignedSites: uniqueSiteIds },
    );

    res.json({
      data: userOut(u),
    });
  },
);

// ACTIVATE / DEACTIVATE worker
r.patch(
  '/:id/status',
  requirePermission('workers.deactivate'),
  async (req, res) => {
    const { isActive } = parse(
      z.object({
        isActive: z.boolean(),
      }),
      req.body,
    );

    const u = await findWorker(req.params.id);

    u.isActive = isActive;

    if (isActive) {
      u.pendingApproval = false;
    }

    await u.save();

    audit(
      me(req).id,
      isActive ? 'WORKER_ACTIVATED' : 'WORKER_DEACTIVATED',
      'User',
      u.id,
    );

    res.json({
      data: userOut(u),
    });
  },
);

export default r;