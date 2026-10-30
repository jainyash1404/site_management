import { Router } from 'express';
import { z } from 'zod';

import { Category, audit } from '../models.js';

import {
  HttpError,
  auth,
  idParam,
  me,
  parse,
  role,
} from '../middleware.js';

import { categoryOut } from '../serialize.js';

const r = Router();

r.use(auth);


// GET ALL CATEGORIES
r.get('/', async (req, res) => {

  const categories = await Category.find(
    me(req).role === 'ADMIN'
      ? {}
      : { isActive: true }
  )
    .sort({ name: 1 })
    .lean();

  const data = categories.map(c => ({
    ...categoryOut(c),

    subcategories: (c.subcategories || [])
      .filter(s =>
        me(req).role === 'ADMIN' || s.isActive
      )
      .map(s => ({
        id: String(s._id),
        name: s.name,
        isActive: s.isActive,
      })),
  }));

  res.json({ data });
});


// CREATE MAIN CATEGORY
r.post('/', role('ADMIN'), async (req, res) => {

  const { name } = parse(
    z.object({
      name: z.string()
        .trim()
        .min(1, 'Name is required')
        .max(60),
    }),
    req.body
  );

  const c = await Category.create({ name });

  audit(
    me(req).id,
    'CATEGORY_CREATED',
    'Category',
    c.id
  );

  res.status(201).json({
    data: {
      ...categoryOut(c),
      subcategories: [],
    },
  });

});


// UPDATE MAIN CATEGORY
r.patch('/:id', role('ADMIN'), async (req, res) => {

  const b = parse(
    z.object({
      name: z.string()
        .trim()
        .min(1)
        .max(60)
        .optional(),

      isActive: z.boolean().optional(),
    }),
    req.body
  );

  const c = await Category.findById(
    idParam(req.params.id)
  );

  if (!c) {
    throw new HttpError(404, 'Category not found');
  }

  if (b.name !== undefined) {
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
      ...categoryOut(c),
      subcategories: c.subcategories.map(s => ({
        id: String(s._id),
        name: s.name,
        isActive: s.isActive,
      })),
    },
  });

});


// ADD SUBCATEGORY
r.post('/:id/subcategories', role('ADMIN'), async (req, res) => {

  const { name } = parse(
    z.object({
      name: z.string()
        .trim()
        .min(1, 'Subcategory name is required')
        .max(60),
    }),
    req.body
  );

  const c = await Category.findById(
    idParam(req.params.id)
  );

  if (!c) {
    throw new HttpError(404, 'Category not found');
  }

  const exists = c.subcategories.some(
    s => s.name.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    throw new HttpError(
      409,
      'Subcategory already exists'
    );
  }

  c.subcategories.push({
    name,
    isActive: true,
  });

  await c.save();

  const sub = c.subcategories[c.subcategories.length - 1];

  audit(
    me(req).id,
    'SUBCATEGORY_CREATED',
    'Category',
    c.id,
    { subcategory: name }
  );

  res.status(201).json({
    data: {
      id: String(sub._id),
      name: sub.name,
      isActive: sub.isActive,
    },
  });

});


// UPDATE SUBCATEGORY
r.patch('/:id/subcategories/:subId', role('ADMIN'), async (req, res) => {

  const b = parse(
    z.object({
      name: z.string()
        .trim()
        .min(1)
        .max(60)
        .optional(),

      isActive: z.boolean().optional(),
    }),
    req.body
  );

  const c = await Category.findById(
    idParam(req.params.id)
  );

  if (!c) {
    throw new HttpError(404, 'Category not found');
  }

  const sub = c.subcategories.id(req.params.subId);

  if (!sub) {
    throw new HttpError(404, 'Subcategory not found');
  }

  if (b.name !== undefined) {

    const duplicate = c.subcategories.some(
      s =>
        String(s._id) !== String(sub._id) &&
        s.name.toLowerCase() === b.name.toLowerCase()
    );

    if (duplicate) {
      throw new HttpError(
        409,
        'Subcategory already exists'
      );
    }

    sub.name = b.name;
  }

  if (b.isActive !== undefined) {
    sub.isActive = b.isActive;
  }

  await c.save();

  audit(
    me(req).id,
    'SUBCATEGORY_UPDATED',
    'Category',
    c.id,
    b
  );

  res.json({
    data: {
      id: String(sub._id),
      name: sub.name,
      isActive: sub.isActive,
    },
  });

});

// DELETE MAIN CATEGORY
r.delete('/:id', role('ADMIN'), async (req, res) => {
  const c = await Category.findById(idParam(req.params.id));

  if (!c) {
    throw new HttpError(404, 'Category not found');
  }

  await Category.findByIdAndDelete(c.id);

  audit(
    me(req).id,
    'CATEGORY_DELETED',
    'Category',
    c.id,
    { name: c.name }
  );

  res.json({
    message: 'Category deleted successfully',
  });
});


// DELETE SUBCATEGORY
r.delete('/:id/subcategories/:subId', role('ADMIN'), async (req, res) => {
  const c = await Category.findById(idParam(req.params.id));

  if (!c) {
    throw new HttpError(404, 'Category not found');
  }

  const sub = c.subcategories.id(req.params.subId);

  if (!sub) {
    throw new HttpError(404, 'Subcategory not found');
  }

  const deletedName = sub.name;

  sub.deleteOne();

  await c.save();

  audit(
    me(req).id,
    'SUBCATEGORY_DELETED',
    'Category',
    c.id,
    { subcategory: deletedName }
  );

  res.json({
    message: 'Subcategory deleted successfully',
  });
});

export default r;