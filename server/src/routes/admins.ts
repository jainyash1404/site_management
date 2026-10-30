import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import {
  User,
  audit,
  ADMIN_PERMISSIONS,
} from '../models.js';

import {
  HttpError,
  auth,
  idParam,
  me,
  parse,
} from '../middleware.js';

import { userOut } from '../serialize.js';

const r = Router();

r.use(auth);

// Only Super Admin can manage admins
r.use((req, _res, next) => {
  const user = me(req);

  if (user.role !== 'ADMIN' || !user.isSuperAdmin) {
    throw new HttpError(
      403,
      'Only Super Admin can manage administrators'
    );
  }

  next();
});

const phone = z.string().regex(
  /^\d{10}$/,
  'Enter a valid 10-digit phone number'
);

const password = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100);

const permissionsSchema = z.array(
  z.enum(ADMIN_PERMISSIONS)
).max(ADMIN_PERMISSIONS.length);

// GET ALL ADMINS
r.get('/', async (_req, res) => {
  const admins = await User.find({
    role: 'ADMIN',
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    data: admins.map(admin => userOut(admin)),
  });
});

// CREATE ADMIN
r.post('/', async (req, res) => {
  const b = parse(
    z.object({
      name: z.string().trim().min(2).max(80),
      phone,
      email: z.union([
        z.literal(''),
        z.string().email(),
      ]).optional(),
      password,
      permissions: permissionsSchema.default([]),
    }),
    req.body
  );

  if (await User.exists({ phone: b.phone })) {
    throw new HttpError(
      409,
      'An account with this phone number already exists'
    );
  }

  const admin = await User.create({
    name: b.name,
    phone: b.phone,
    email: b.email ?? '',
    passwordHash: await bcrypt.hash(b.password, 10),

    role: 'ADMIN',
    isSuperAdmin: false,
    permissions: [...new Set(b.permissions)],

    isActive: true,
    pendingApproval: false,
  });

  audit(
    me(req).id,
    'ADMIN_CREATED',
    'User',
    admin.id,
    {
      name: admin.name,
      permissions: admin.permissions,
    }
  );

  res.status(201).json({
    data: userOut(admin),
  });
});

// UPDATE ADMIN PERMISSIONS
r.patch('/:id/permissions', async (req, res) => {
  const b = parse(
    z.object({
      permissions: permissionsSchema,
    }),
    req.body
  );

  const admin = await User.findOne({
    _id: idParam(req.params.id),
    role: 'ADMIN',
    isSuperAdmin: false,
  });

  if (!admin) {
    throw new HttpError(
      404,
      'Admin not found or cannot be modified'
    );
  }

  admin.permissions = [...new Set(b.permissions)];

  await admin.save();

  audit(
    me(req).id,
    'ADMIN_PERMISSIONS_UPDATED',
    'User',
    admin.id,
    {
      permissions: admin.permissions,
    }
  );

  res.json({
    data: userOut(admin),
  });
});

// ACTIVATE / DEACTIVATE ADMIN
r.patch('/:id/status', async (req, res) => {
  const b = parse(
    z.object({
      isActive: z.boolean(),
    }),
    req.body
  );

  const admin = await User.findOne({
    _id: idParam(req.params.id),
    role: 'ADMIN',
    isSuperAdmin: false,
  });

  if (!admin) {
    throw new HttpError(
      404,
      'Admin not found or cannot be modified'
    );
  }

  admin.isActive = b.isActive;

  await admin.save();

  audit(
    me(req).id,
    b.isActive ? 'ADMIN_ACTIVATED' : 'ADMIN_DEACTIVATED',
    'User',
    admin.id
  );

  res.json({
    data: userOut(admin),
  });
});

export default r;