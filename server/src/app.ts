import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { errorHandler, HttpError } from './middleware.js';
import { verifyLocal } from './storage.js';
import authR from './routes/auth.js';
import workersR from './routes/workers.js';
import sitesR from './routes/sites.js';
import categoriesR from './routes/categories.js';
import fundsR from './routes/funds.js';
import expensesR from './routes/expenses.js';

export const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // receipts are <img> loaded from the frontend origin
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '100kb' }));
app.get('/health', (_q, res) => void res.json({ ok: true }));

const api = express.Router();
api.use('/auth', authR); api.use('/workers', workersR); api.use('/sites', sitesR); api.use('/funds', fundsR);
api.use('/expenses', expensesR); api.use('/expense-categories', categoriesR);
api.get('/receipts/:file', (req, res) => void res.sendFile(verifyLocal(req.params.file, req.query.exp, req.query.sig))); // signed, expiring links only
app.use('/api/v1', api);
app.use((_q, _r, next) => next(new HttpError(404, 'Not found')));
app.use(errorHandler);
