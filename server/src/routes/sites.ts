import { Router } from 'express';
import { z } from 'zod';

import { Expense, Fund, Site, audit } from '../models.js';

import {
  HttpError,
  auth,
  idParam,
  me,
  parse,
  role,
  requirePermission,
} from '../middleware.js';

import { siteOut } from '../serialize.js';

const r = Router();

r.use(auth);

// FIND SITE
const find = async (id: unknown) => {
  const site = await Site.findById(idParam(id));

  if (!site) {
    throw new HttpError(404, 'Site not found');
  }

  return site;
};

// SITE VALIDATION
const body = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  address: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

// GET ALL SITES
r.get(
  '/',
  async (req, res, next) => {
    if (me(req).role === 'WORKER') {
      return next();
    }

    return requirePermission('sites.view')(req, res, next);
  },
  async (req, res) => {
    const sites = await Site.find(
      me(req).role === 'ADMIN'
        ? {}
        : {
            isActive: true,
            isCompleted: false,
          }
    )
      .sort({ name: 1 })
      .lean();

    res.json({
      data: sites.map(siteOut),
    });
  }
);

// CREATE SITE
r.post(
  '/',
  role('ADMIN'),
  requirePermission('sites.create'),
  async (req, res) => {
    const site = await Site.create(
      parse(body, req.body)
    );

    audit(
      me(req).id,
      'SITE_CREATED',
      'Site',
      site.id
    );

    res.status(201).json({
      data: siteOut(site),
    });
  }
);

// UPDATE SITE
r.patch(
  '/:id',
  role('ADMIN'),
  requirePermission('sites.update'),
  async (req, res) => {
    const updates = parse(
      body.partial(),
      req.body
    );

    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, 'No update fields provided');
    }

    const site = await find(req.params.id);

    Object.assign(site, updates);

    await site.save();

    audit(
      me(req).id,
      'SITE_UPDATED',
      'Site',
      site.id,
      { fields: Object.keys(updates) }
    );

    res.json({
      data: siteOut(site),
    });
  }
);

// ACTIVATE / DEACTIVATE SITE
r.patch(
  '/:id/status',
  role('ADMIN'),
  requirePermission('sites.deactivate'),
  async (req, res) => {
    const { isActive } = parse(
      z.object({
        isActive: z.boolean(),
      }),
      req.body
    );

    const site = await find(req.params.id);

    if (isActive && site.isCompleted) {
      throw new HttpError(
        409,
        'Reopen the completed site before activating it.'
      );
    }

    site.isActive = isActive;

    await site.save();

    audit(
      me(req).id,
      isActive
        ? 'SITE_ACTIVATED'
        : 'SITE_DEACTIVATED',
      'Site',
      site.id
    );

    res.json({
      data: siteOut(site),
    });
  }
);

// MARK COMPLETE / REOPEN SITE
r.patch(
  '/:id/completion',
  role('ADMIN'),
  requirePermission('sites.complete'),
  async (req, res) => {
    const { isCompleted } = parse(
      z.object({
        isCompleted: z.boolean(),
      }),
      req.body
    );

    const site = await find(req.params.id);

    if (isCompleted) {
      site.isCompleted = true;
      site.isActive = false;
    } else {
      site.isCompleted = false;
    }

    await site.save();

    audit(
      me(req).id,
      isCompleted
        ? 'SITE_MARKED_COMPLETE'
        : 'SITE_REOPENED',
      'Site',
      site.id
    );

    res.json({
      data: siteOut(site),
    });
  }
);

// DELETE SITE
r.delete(
  '/:id',
  role('ADMIN'),
  requirePermission('sites.delete'),
  async (req, res) => {
    const site = await find(req.params.id);

    const [fundCount, expenseCount] = await Promise.all([
      Fund.countDocuments({
        siteId: site._id,
      }),
      Expense.countDocuments({
        siteId: site._id,
      }),
    ]);

    // Protect financial history
    if (fundCount > 0 || expenseCount > 0) {
      throw new HttpError(
        409,
        `Cannot delete this site. It has ${fundCount} fund records and ${expenseCount} expense records.`
      );
    }

    await site.deleteOne();

    audit(
      me(req).id,
      'SITE_DELETED',
      'Site',
      String(site._id)
    );

    res.json({
      data: {
        id: String(site._id),
        deleted: true,
      },
    });
  }
);

export default r;