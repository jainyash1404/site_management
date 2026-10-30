// MOCK backend for testing the frontend only. In-memory data: everything resets on restart.
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { randomUUID as uid } from 'crypto';

const PORT = process.env.PORT || 5000;
const BASE = `http://localhost:${PORT}`;
const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({
  storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.mimetype) ? cb(null, true) : cb(new Error('Only JPG, PNG or WEBP images are allowed')),
});

const now = (d = 0) => new Date(Date.now() - d * 864e5).toISOString();
const db = {
  users: [
    { id: 'u1', name: 'Mama (Admin)', phone: '9999999999', password: 'admin123', email: 'mama@example.com', role: 'ADMIN', isActive: true },
    { id: 'u2', name: 'Suresh', phone: '8888888888', password: 'worker123', email: '', role: 'WORKER', isActive: true },
    { id: 'u3', name: 'Mahesh', phone: '7777777777', password: 'worker123', email: '', role: 'WORKER', isActive: true },
  ],
  sites: [{ id: 's1', name: 'Sector 12 House', address: 'Sector 12', description: 'Residential', isActive: true }, { id: 's2', name: 'Market Complex', address: 'Main Market', description: 'Commercial', isActive: true }],
  categories: ['Cement', 'Steel', 'Labour', 'Transport'].map((name, i) => ({ id: 'c' + i, name, isActive: true })),
  funds: [
    { id: 'f1', workerId: 'u2', siteId: 's1', amount: 100000, type: 'INITIAL', notes: 'Start', createdAt: now(10) },
    { id: 'f2', workerId: 'u2', siteId: '', amount: 30000, type: 'ADDITIONAL', notes: 'Extra', createdAt: now(3) },
    { id: 'f3', workerId: 'u3', siteId: 's2', amount: 50000, type: 'INITIAL', notes: '', createdAt: now(8) },
  ],
  expenses: [
    { id: 'e1', workerId: 'u2', siteId: 's1', category: 'Cement', amount: 20000, description: '40 bags', createdAt: now(5), status: 'APPROVED', reviewNote: 'OK' },
    { id: 'e2', workerId: 'u2', siteId: 's1', category: 'Labour', amount: 5000, description: 'Wages', createdAt: now(1), status: 'PENDING' },
    { id: 'e3', workerId: 'u3', siteId: 's2', category: 'Steel', amount: 3000, description: 'Saria', createdAt: now(2), status: 'REJECTED', reviewNote: 'Bill unclear' },
  ],
};
const files = new Map();
const tokens = new Map();
const pub = ({ password, ...u }) => u;
const bad = (res, code, message) => res.status(code).json({ message });
const sum = xs => xs.reduce((a, b) => a + b, 0);

const auth = (req, res, next) => {
  const uidv = tokens.get((req.headers.authorization || '').replace('Bearer ', ''));
  const u = db.users.find(x => x.id === uidv && x.isActive);
  if (!u) return bad(res, 401, 'Please log in again');
  req.user = u; next();
};
const admin = (req, res, next) => req.user.role === 'ADMIN' ? next() : bad(res, 403, 'Admins only');

const api = express.Router();
api.post('/auth/login', (req, res) => {
  const u = db.users.find(x => x.phone === req.body.phone && x.password === req.body.password);
  if (!u) return bad(res, 401, 'Wrong phone number or password');
  if (!u.isActive) return bad(res, 403, 'This account is deactivated');
  const token = uid(); tokens.set(token, u.id); res.json({ token, user: pub(u) });
});
api.get('/auth/me', auth, (req, res) => res.json({ data: pub(req.user) }));

// Generic active/inactive + create/edit for workers, sites, categories
function crud(path, coll, { adminOnlyList = true, make, statusRoute, filter = () => true, out = x => (x.password ? pub(x) : x) }) {
  api.get(path, auth, (req, res, next) => (adminOnlyList || req.user.role === 'ADMIN' ? next() : res.json({ data: db[coll].filter(x => x.isActive) })), admin, (_q, res) => res.json({ data: db[coll].filter(filter).map(out) }));
  api.post(path, auth, admin, (req, res) => { const r = make(req.body, res); if (!r) return; db[coll].push(r); res.status(201).json({ data: pub(r) }); });
  api.patch(`${path}/:id`, auth, admin, (req, res) => {
    const r = db[coll].find(x => x.id === req.params.id); if (!r) return bad(res, 404, 'Not found');
    for (const k of ['name', 'phone', 'email', 'address', 'description', 'isActive']) if (k in req.body) r[k] = req.body[k];
    res.json({ data: pub(r) });
  });
  if (statusRoute) api.patch(`${path}/:id/status`, auth, admin, (req, res) => {
    const r = db[coll].find(x => x.id === req.params.id); if (!r) return bad(res, 404, 'Not found');
    r.isActive = !!req.body.isActive; res.json({ data: pub(r) });
  });
}
crud('/workers', 'users', { statusRoute: true, filter: u => u.role === 'WORKER', out: u => ({ ...pub(u), ...stats(u.id) }), make: (b, res) => {
  if (!b.name || !/^\d{10}$/.test(b.phone || '') || !b.password) return bad(res, 400, 'Name, 10-digit phone and password are required');
  if (db.users.some(u => u.phone === b.phone)) return bad(res, 409, 'A user with this phone already exists');
  return { id: uid(), name: b.name, phone: b.phone, email: b.email || '', password: b.password, role: 'WORKER', isActive: true };
} });
crud('/sites', 'sites', { adminOnlyList: false, statusRoute: true, make: (b, res) => b.name ? { id: uid(), name: b.name, address: b.address || '', description: b.description || '', isActive: true } : bad(res, 400, 'Name is required') });
crud('/expense-categories', 'categories', { adminOnlyList: false, make: (b, res) => b.name ? { id: uid(), name: b.name, isActive: true } : bad(res, 400, 'Name is required') });
api.get('/workers/:id', auth, admin, (req, res) => { const u = db.users.find(x => x.id === req.params.id && x.role === 'WORKER'); u ? res.json({ data: { ...pub(u), ...stats(u.id) } }) : bad(res, 404, 'Not found'); });

function stats(id) {
  const ex = db.expenses.filter(e => e.workerId === id), by = st => ex.filter(e => e.status === st);
  const totalAllocated = sum(db.funds.filter(f => f.workerId === id).map(f => f.amount)), approvedAmount = sum(by('APPROVED').map(e => e.amount));
  return { totalAllocated, approvedAmount, pendingAmount: sum(by('PENDING').map(e => e.amount)), rejectedAmount: sum(by('REJECTED').map(e => e.amount)),
    availableBalance: totalAllocated - approvedAmount, approvedCount: by('APPROVED').length, pendingCount: by('PENDING').length, rejectedCount: by('REJECTED').length };
}
const wName = id => db.users.find(u => u.id === id)?.name;
const fundOut = f => ({ ...f, workerName: wName(f.workerId), siteName: db.sites.find(s => s.id === f.siteId)?.name });
api.get('/funds', auth, (req, res) => {
  const items = db.funds.filter(f => (req.user.role === 'ADMIN' || f.workerId === req.user.id) && (!req.query.workerId || f.workerId === req.query.workerId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ data: items.map(fundOut), summary: { totalAllocated: sum(items.map(f => f.amount)) } });
});
api.post('/funds', auth, admin, (req, res) => {
  const { workerId, siteId, amount, type, notes } = req.body;
  if (!db.users.some(u => u.id === workerId && u.role === 'WORKER')) return bad(res, 400, 'Valid worker required');
  if (!(Number(amount) > 0)) return bad(res, 400, 'Amount must be greater than 0');
  const f = { id: uid(), workerId, siteId: siteId || '', amount: Number(amount), type: type === 'ADDITIONAL' ? 'ADDITIONAL' : 'INITIAL', notes: notes || '', createdAt: now() };
  db.funds.push(f); res.status(201).json({ data: fundOut(f) });
});

const expOut = e => ({ ...e, workerName: wName(e.workerId), siteName: db.sites.find(s => s.id === e.siteId)?.name, receiptUrl: e.receiptId ? `${BASE}/uploads/${e.receiptId}` : undefined });
const approvedOf = id => sum(db.expenses.filter(e => e.workerId === id && e.status === 'APPROVED').map(e => e.amount));
api.get('/expenses', auth, admin, (req, res) => {
  const { q, status, workerId, siteId, category, from, to, limit } = req.query;
  let items = db.expenses.filter(e => (!status || e.status === status) && (!workerId || e.workerId === workerId) && (!siteId || e.siteId === siteId) && (!category || e.category === category)
    && (!from || e.createdAt.slice(0, 10) >= from) && (!to || e.createdAt.slice(0, 10) <= to)
    && (!q || [e.description, e.category, wName(e.workerId)].join(' ').toLowerCase().includes(String(q).toLowerCase())));
  items = items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit ? Number(limit) : undefined);
  const all = db.expenses;
  res.json({ data: items.map(expOut), summary: { totalAmount: sum(all.map(e => e.amount)), approvedAmount: sum(all.filter(e => e.status === 'APPROVED').map(e => e.amount)),
    pendingCount: all.filter(e => e.status === 'PENDING').length, rejectedCount: all.filter(e => e.status === 'REJECTED').length } });
});
api.get('/expenses/my', auth, (req, res) => {
  const mine = db.expenses.filter(e => e.workerId === req.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const totalAllocated = sum(db.funds.filter(f => f.workerId === req.user.id).map(f => f.amount));
  res.json({ data: mine.map(expOut), summary: { totalAllocated, approvedAmount: approvedOf(req.user.id), availableBalance: totalAllocated - approvedOf(req.user.id),
    pendingCount: mine.filter(e => e.status === 'PENDING').length, rejectedCount: mine.filter(e => e.status === 'REJECTED').length } });
});
api.post('/expenses', auth, upload.single('receipt'), (req, res) => {
  if (req.user.role !== 'WORKER') return bad(res, 403, 'Only workers submit expenses');
  const { siteId, amount, category, description } = req.body;
  if (!db.sites.some(s => s.id === siteId && s.isActive)) return bad(res, 400, 'Valid site required');
  if (!(Number(amount) > 0)) return bad(res, 400, 'Amount must be greater than 0');
  if (!db.categories.some(c => c.name === category && c.isActive)) return bad(res, 400, 'Valid category required');
  const e = { id: uid(), workerId: req.user.id, siteId, category, amount: Number(amount), description: description || '', createdAt: now(), status: 'PENDING' };
  if (req.file) { e.receiptId = uid(); files.set(e.receiptId, req.file); }
  db.expenses.push(e); res.status(201).json({ data: expOut(e) });
});
api.patch('/expenses/:id/review', auth, admin, (req, res) => {
  const e = db.expenses.find(x => x.id === req.params.id); if (!e) return bad(res, 404, 'Not found');
  if (e.status !== 'PENDING') return bad(res, 409, 'Only pending expenses can be reviewed');
  if (!['APPROVED', 'REJECTED'].includes(req.body.status)) return bad(res, 400, 'Status must be APPROVED or REJECTED');
  e.status = req.body.status; e.reviewNote = req.body.reviewNote || ''; res.json({ data: expOut(e) });
});

app.use('/api/v1', api);
app.get('/uploads/:id', (req, res) => { const f = files.get(req.params.id); if (!f) return res.sendStatus(404); res.type(f.mimetype).send(f.buffer); });
app.use((err, _req, res, _next) => bad(res, err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller' : err.message));
app.listen(PORT, () => console.log(`Mock API on ${BASE}/api/v1\nAdmin: 9999999999 / admin123\nWorker: 8888888888 / worker123 (also 7777777777 / worker123)`));
