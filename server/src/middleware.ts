import jwt from 'jsonwebtoken';
import { z, ZodError, type ZodTypeAny } from 'zod';
import { isValidObjectId } from 'mongoose';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { config } from './config.js';
import { User } from './models.js';

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export type Role = 'ADMIN' | 'WORKER';
export interface AuthUser { id: string; role: Role; name: string }
declare global { namespace Express { interface Request { user?: AuthUser } } }
export const me = (req: { user?: AuthUser }): AuthUser => req.user!;

export const parse = <S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> => {
  const r = schema.safeParse(data);
  if (!r.success) { const i = r.error.issues[0]; throw new HttpError(400, i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message); }
  return r.data;
};
export const idParam = (v: unknown): string => { if (typeof v !== 'string' || !isValidObjectId(v)) throw new HttpError(400, 'Invalid id'); return v; };

export const auth: RequestHandler = async (req, _res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) throw new HttpError(401, 'Please log in');
  let p: { sub: string; pv?: number };
  try { p = jwt.verify(h.slice(7), config.jwtSecret) as { sub: string; pv?: number }; } catch { throw new HttpError(401, 'Session expired. Please log in again'); }
  const u = await User.findById(p.sub); // checked on every request so deactivation takes effect immediately
  if (!u || !u.isActive) throw new HttpError(401, 'Account not available');
  if ((p.pv ?? 0) !== (u.passwordChangedAt?.getTime() ?? 0)) throw new HttpError(401, 'Password was changed. Please log in again'); // every older session dies on a password change
  req.user = { id: u.id, role: u.role as Role, name: u.name };
  next();
};
export const role = (...roles: Role[]): RequestHandler => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) throw new HttpError(403, 'You do not have permission to do this');
  next();
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) return void res.status(err.status).json({ message: err.message });
  if (err instanceof ZodError) return void res.status(400).json({ message: err.issues[0]?.message ?? 'Invalid input' });
  if (err?.code === 11000) return void res.status(409).json({ message: 'This value already exists' });
  if (err?.code === 'LIMIT_FILE_SIZE') return void res.status(413).json({ message: 'Image must be 5 MB or smaller' });
  if (err?.name === 'MulterError') return void res.status(400).json({ message: err.message });
  if (err?.type === 'entity.parse.failed') return void res.status(400).json({ message: 'Invalid JSON' });
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
};
