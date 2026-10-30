import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { config } from '../config.js';
import { User, audit } from '../models.js';
import { HttpError, auth, me, parse } from '../middleware.js';
import { userOut } from '../serialize.js';
import { sendMail } from '../mailer.js';

const r = Router();
const DUMMY = bcrypt.hashSync('not-a-real-password', 10); // keeps response time similar for unknown phones
const limit = (windowMs: number, env: string, def: number, message: string) => rateLimit({ windowMs, limit: Number(process.env[env] ?? def), standardHeaders: true, legacyHeaders: false, message: { message } });
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const phone = z.string().regex(/^\d{10}$/, 'Enter a 10-digit phone number');
const password = z.string().min(6, 'Password must be at least 6 characters').max(100);

r.post('/login', limit(15 * 60_000, 'LOGIN_RATE_LIMIT', 20, 'Too many login attempts. Try again later.'), async (req, res) => {
  const b = parse(z.object({ phone: z.string().min(1), password: z.string().min(1) }), req.body);
  const u = await User.findOne({ phone: b.phone });
  const ok = await bcrypt.compare(b.password, u?.passwordHash ?? DUMMY);
  if (!u || !ok) throw new HttpError(401, 'Wrong phone number or password');
  if (!u.isActive) throw new HttpError(403, u.pendingApproval ? 'Your account is waiting for the owner’s approval.' : 'This account is deactivated. Contact the owner.');
  const token = jwt.sign({ sub: u.id, role: u.role, pv: u.passwordChangedAt?.getTime() ?? 0 }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
  res.json({ token, user: userOut(u) });
});

// Self sign-up always creates an INACTIVE worker; the owner must approve before the person can log in.
r.post('/signup', limit(60 * 60_000, 'SIGNUP_RATE_LIMIT', 10, 'Too many sign-ups from this network. Try again later.'), async (req, res) => {
  const b = parse(z.object({ name: z.string().trim().min(2, 'Name is required').max(80), phone, email: z.union([z.literal(''), z.string().email('Invalid email')]).optional(), password }), req.body);
  if (await User.exists({ phone: b.phone })) throw new HttpError(409, 'An account with this phone number already exists');
  const u = await User.create({ name: b.name, phone: b.phone, email: b.email ?? '', passwordHash: await bcrypt.hash(b.password, 10), role: 'WORKER', isActive: false, pendingApproval: true });
  audit(u.id, 'WORKER_SIGNUP', 'User', u.id, { name: u.name });
  res.status(201).json({ message: 'Account created. You can log in once the owner approves it.' });
});

// Same answer whether or not the number exists (no account enumeration).
r.post('/forgot-password', limit(15 * 60_000, 'FORGOT_RATE_LIMIT', 5, 'Too many requests. Try again later.'), async (req, res) => {
  const b = parse(z.object({ phone }), req.body);
  const u = await User.findOne({ phone: b.phone, isActive: true });
  if (u) {
    const token = randomBytes(32).toString('hex');
    u.resetTokenHash = sha(token); u.resetExpires = new Date(Date.now() + 30 * 60_000); u.resetRequestedAt = new Date(); await u.save(); // flag lets the owner see it and set a password by hand
    let emailed = false;
    if (u.email) emailed = await sendMail(u.email, 'Reset your password', `Hello ${u.name},\n\nUse this link to set a new password (valid for 30 minutes):\n${config.appUrl}/reset-password?token=${token}\n\nIf you did not ask for this, ignore this email.`).catch(e => { console.error('mail failed', e); return false; });
    audit(u.id, 'PASSWORD_RESET_REQUESTED', 'User', u.id, { emailed });
  }
  res.json({ message: 'If this number is registered, a reset link was emailed to the address on file (if any), and the owner can also set a new password for you.' });
});

r.post('/reset-password', limit(15 * 60_000, 'FORGOT_RATE_LIMIT', 5, 'Too many requests. Try again later.'), async (req, res) => {
  const b = parse(z.object({ token: z.string().min(20).max(200), password }), req.body);
  const now = new Date();
  // Atomic and single-use: the token is consumed in the same operation that changes the password.
  const u = await User.findOneAndUpdate({ resetTokenHash: sha(b.token), resetExpires: { $gt: now }, isActive: true },
    { $set: { passwordHash: await bcrypt.hash(b.password, 10), passwordChangedAt: now }, $unset: { resetTokenHash: 1, resetExpires: 1, resetRequestedAt: 1 } });
  if (!u) throw new HttpError(400, 'This reset link is invalid or has expired');
  audit(u.id, 'PASSWORD_RESET_DONE', 'User', u.id);
  res.json({ message: 'Password updated. You can now log in.' });
});

r.get('/me', auth, async (req, res) => res.json({ data: userOut(await User.findById(me(req).id)) }));
export default r;
