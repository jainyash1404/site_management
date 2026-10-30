import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, audit } from '../models.js';
import { HttpError, auth, idParam, me, parse, role } from '../middleware.js';
import { userOut } from '../serialize.js';
import { statsOf, workerStats } from '../stats.js';

const r = Router();
r.use(auth, role('ADMIN'));
const phone = z.string().regex(/^\d{10}$/, 'Enter a 10-digit phone number');
const email = z.union([z.literal(''), z.string().email('Invalid email')]);
const password = z.string().min(6, 'Password must be at least 6 characters').max(100);
const findWorker = async (id: unknown) => { const u = await User.findOne({ _id: idParam(id), role: 'WORKER' }); if (!u) throw new HttpError(404, 'Worker not found'); return u; };

r.get('/', async (_req, res) => {
  const ws = await User.find({ role: 'WORKER' }).sort({ name: 1 }).lean();
  const st = await workerStats(ws.map(w => String(w._id)));
  res.json({ data: ws.map(w => userOut(w, statsOf(st, String(w._id)))) });
});
r.post('/', async (req, res) => {
  const b = parse(z.object({ name: z.string().trim().min(2, 'Name is required'), phone, email: email.optional(), password }), req.body);
  const u = await User.create({ name: b.name, phone: b.phone, email: b.email ?? '', passwordHash: await bcrypt.hash(b.password, 10), role: 'WORKER' });
  audit(me(req).id, 'WORKER_CREATED', 'User', u.id, { name: u.name });
  res.status(201).json({ data: userOut(u) });
});
r.get('/:id', async (req, res) => {
  const u = await findWorker(req.params.id);
  res.json({ data: userOut(u, statsOf(await workerStats([u.id]), u.id)) });
});
r.patch('/:id', async (req, res) => {
  const b = parse(z.object({ name: z.string().trim().min(2).optional(), phone: phone.optional(), email: email.optional(), password: password.optional() }), req.body);
  const u = await findWorker(req.params.id);
  if (b.name) u.name = b.name; if (b.phone) u.phone = b.phone; if (b.email !== undefined) u.email = b.email;
  if (b.password) { u.passwordHash = await bcrypt.hash(b.password, 10); u.passwordChangedAt = new Date(); u.resetRequestedAt = undefined; }
  await u.save(); audit(me(req).id, 'WORKER_UPDATED', 'User', u.id, { fields: Object.keys(b).filter(k => k !== 'password'), passwordChanged: !!b.password });
  res.json({ data: userOut(u) });
});
r.patch('/:id/status', async (req, res) => {
  const { isActive } = parse(z.object({ isActive: z.boolean() }), req.body);
  const u = await findWorker(req.params.id); u.isActive = isActive; if (isActive) u.pendingApproval = false; await u.save();
  audit(me(req).id, isActive ? 'WORKER_ACTIVATED' : 'WORKER_DEACTIVATED', 'User', u.id);
  res.json({ data: userOut(u) });
});
export default r;
