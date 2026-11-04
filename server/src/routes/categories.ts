import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';

import { Category, audit } from '../models.js';

import {
  HttpError,
  auth,
  idParam,
  me,
  parse,
  role,
  requirePermission,
} from '../middleware.js';

const r = Router();

r.use(auth);

// GET ALL CATEGORIES
r.get(
  '/',
  async (req, res, next) => {
    if (me(req).role === 'ADMIN') {
      return requirePermission('categories.view')(req, res, next);
    }

    next();
  },
  async (req, res) => {
    const isAdmin = me(req).role === 'ADMIN';

    const categories = await Category.find({})
      .sort({ name: 1 })
      .lean();

    let visibleCategories = categories;

    // Workers only see active categories
    // whose complete parent hierarchy is active.
    if (!isAdmin) {
      const categoryMap = new Map(
        categories.map(c => [String(c._id), c])
      );

      const activeIds = new Set(
        categories
          .filter(c => c.isActive)
          .map(c => String(c._id))
      );

      visibleCategories = categories.filter(c => {
        if (!c.isActive) return false;

        let parentId = c.parentId
          ? String(c.parentId)
          : null;

        while (parentId) {
          if (!activeIds.has(parentId)) return false;

          const parent = categoryMap.get(parentId);

          if (!parent) return false;

          parentId = parent.parentId
            ? String(parent.parentId)
            : null;
        }

        return true;
      });
    }

    const data = visibleCategories.map(c => ({
      id: String(c._id),
      name: c.name,
      parentId: c.parentId
        ? String(c.parentId)
        : null,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.json({ data });
  }
);

// CREATE MAIN CATEGORY
r.post(
  '/',
  role('ADMIN'),
  requirePermission('categories.create'),
  async (req, res) => {
    const { name } = parse(
      z.object({
        name: z.string().trim().min(1).max(60),
      }),
      req.body
    );

    const duplicate = await Category.findOne({
      parentId: null,
      name,
    }).collation({
      locale: 'en',
      strength: 2,
    });

    if (duplicate) {
      throw new HttpError(409, 'Category already exists');
    }

    const c = await Category.create({
      name,
      parentId: null,
    });

    audit(
      me(req).id,
      'CATEGORY_CREATED',
      'Category',
      c.id
    );

    res.status(201).json({
      data: {
        id: c.id,
        name: c.name,
        parentId: null,
        isActive: c.isActive,
      },
    });
  }
);

// CREATE CHILD CATEGORY AT ANY LEVEL
r.post(
  '/:id/subcategories',
  role('ADMIN'),
  requirePermission('categories.subcategories'),
  async (req, res) => {
    const { name } = parse(
      z.object({
        name: z.string().trim().min(1).max(60),
      }),
      req.body
    );

    const parent = await Category.findById(
      idParam(req.params.id)
    );

    if (!parent) {
      throw new HttpError(404, 'Parent category not found');
    }

    if (!parent.isActive) {
      throw new HttpError(
        400,
        'Cannot add under inactive category'
      );
    }

    const duplicate = await Category.findOne({
      parentId: parent._id,
      name,
    }).collation({
      locale: 'en',
      strength: 2,
    });

    if (duplicate) {
      throw new HttpError(
        409,
        'Category already exists under this parent'
      );
    }

    const child = await Category.create({
      name,
      parentId: parent._id,
    });

    audit(
      me(req).id,
      'SUBCATEGORY_CREATED',
      'Category',
      child.id,
      {
        parentId: parent.id,
        name,
      }
    );

    res.status(201).json({
      data: {
        id: child.id,
        name: child.name,
        parentId: String(parent._id),
        isActive: child.isActive,
      },
    });
  }
);

// UPDATE CATEGORY
r.patch(
  '/:id',
  role('ADMIN'),
  async (req, res, next) => {
    const b = req.body;

    if (b?.name !== undefined) {
      return requirePermission('categories.update')(
        req,
        res,
        err => {
          if (err) return next(err);

          if (b?.isActive !== undefined) {
            return requirePermission('categories.deactivate')(
              req,
              res,
              next
            );
          }

          next();
        }
      );
    }

    if (b?.isActive !== undefined) {
      return requirePermission('categories.deactivate')(
        req,
        res,
        next
      );
    }

    next();
  },
  async (req, res) => {
    const b = parse(
      z.object({
        name: z.string().trim().min(1).max(60).optional(),
        isActive: z.boolean().optional(),
      }),
      req.body
    );

    if (b.name === undefined && b.isActive === undefined) {
      throw new HttpError(400, 'No update fields provided');
    }

    const c = await Category.findById(
      idParam(req.params.id)
    );

    if (!c) {
      throw new HttpError(404, 'Category not found');
    }

    if (b.name !== undefined) {
      const duplicate = await Category.findOne({
        _id: { $ne: c._id },
        parentId: c.parentId,
        name: b.name,
      }).collation({
        locale: 'en',
        strength: 2,
      });

      if (duplicate) {
        throw new HttpError(
          409,
          'Category already exists under this parent'
        );
      }

      c.name = b.name;
    }

    if (b.isActive !== undefined) {
      c.isActive = b.isActive;
    }

    await c.save();

    audit(
      me(req).id,
      'CATEGORY_UPDATED',
      'Category',
      c.id,
      b
    );

    res.json({
      data: {
        id: c.id,
        name: c.name,
        parentId: c.parentId
          ? String(c.parentId)
          : null,
        isActive: c.isActive,
      },
    });
  }
);

// DELETE CATEGORY AND ALL DESCENDANTS
r.delete(
  '/:id',
  role('ADMIN'),
  requirePermission('categories.delete'),
  async (req, res) => {
    const c = await Category.findById(
      idParam(req.params.id)
    );

    if (!c) {
      throw new HttpError(404, 'Category not found');
    }

    const all = await Category.find(
      {},
      { _id: 1, parentId: 1 }
    ).lean();

    const ids = new Set<string>([
      String(c._id),
    ]);

    let changed = true;

    while (changed) {
      changed = false;

      for (const item of all) {
        const id = String(item._id);

        const parentId = item.parentId
          ? String(item.parentId)
          : '';

        if (
          parentId &&
          ids.has(parentId) &&
          !ids.has(id)
        ) {
          ids.add(id);
          changed = true;
        }
      }
    }

    const objectIds = [...ids].map(
      id => new Types.ObjectId(id)
    );

    await Category.deleteMany({
      _id: { $in: objectIds },
    });

    audit(
      me(req).id,
      'CATEGORY_DELETED',
      'Category',
      c.id,
      {
        name: c.name,
        deletedCount: ids.size,
      }
    );

    res.json({
      message: 'Category and descendants deleted successfully',
      deletedCount: ids.size,
    });
  }
);

export default r;