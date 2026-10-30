import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';

process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27018/construction_test';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-123456';
process.env.LOGIN_RATE_LIMIT = '1000'; process.env.SIGNUP_RATE_LIMIT = '1000'; process.env.FORGOT_RATE_LIMIT = '1000';
process.env.UPLOAD_DIR = '/tmp/receipts-test';
const { default: mongoose } = await import('mongoose');
const bcrypt = (await import('bcryptjs')).default;
const { app } = await import('../src/app.js');
const { User, Site, Category } = await import('../src/models.js');

let server: Server, base = '';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
async function call(method: string, path: string, token?: string, body?: unknown) {
  const isForm = body instanceof FormData;
  const res = await fetch(base + path, { method, headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && !isForm && { 'Content-Type': 'application/json' }) }, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
  const text = await res.text(); let json: any; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}
const login = async (phone: string, password: string) => (await call('POST', '/api/v1/auth/login', undefined, { phone, password })).body.token as string;
const expenseForm = (siteId: string, amount: string, category = 'Cement', file?: Blob, fname = 'bill.png') => {
  const f = new FormData(); f.append('siteId', siteId); f.append('amount', amount); f.append('category', category); f.append('description', 'test');
  if (file) f.append('receipt', file, fname); return f;
};
let admin = '', w1 = '', w2 = '', w1Id = '', w2Id = '', site = '';

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI!); await mongoose.connection.dropDatabase();
  await Promise.all([User.init(), Category.init()]);
  await User.create({ name: 'Owner', phone: '9999999999', passwordHash: await bcrypt.hash('admin12345', 4), role: 'ADMIN' });
  site = String((await Site.create({ name: 'Site A' })).id);
  await Category.create([{ name: 'Cement' }, { name: 'Steel' }, { name: 'Old', isActive: false }]);
  await new Promise<void>(r => { server = app.listen(0, () => r()); }); base = `http://127.0.0.1:${(server.address() as any).port}`;
  admin = await login('9999999999', 'admin12345');
});
after(async () => { server.close(); await mongoose.disconnect(); });

test('login: wrong password and unknown phone both 401; protected route needs a token', async () => {
  assert.equal((await call('POST', '/api/v1/auth/login', undefined, { phone: '9999999999', password: 'nope' })).status, 401);
  assert.equal((await call('POST', '/api/v1/auth/login', undefined, { phone: '1111111111', password: 'nope' })).status, 401);
  assert.equal((await call('GET', '/api/v1/workers')).status, 401);
  assert.equal((await call('GET', '/api/v1/workers', 'garbage')).status, 401);
});

test('admin creates workers; duplicate phone and bad input are rejected', async () => {
  const a = await call('POST', '/api/v1/workers', admin, { name: 'Suresh', phone: '8888888888', password: 'worker123' });
  const b = await call('POST', '/api/v1/workers', admin, { name: 'Mahesh', phone: '7777777777', password: 'worker123' });
  assert.equal(a.status, 201); assert.equal(b.status, 201); assert.equal(a.body.data.passwordHash, undefined); assert.equal(a.body.data.password, undefined);
  w1Id = a.body.data.id; w2Id = b.body.data.id;
  assert.equal((await call('POST', '/api/v1/workers', admin, { name: 'Xy', phone: '8888888888', password: 'worker123' })).status, 409);
  assert.equal((await call('POST', '/api/v1/workers', admin, { name: 'Xy', phone: '123', password: 'worker123' })).status, 400);
  w1 = await login('8888888888', 'worker123'); w2 = await login('7777777777', 'worker123');
});

test('workers cannot use admin endpoints', async () => {
  for (const [m, p, b] of [['GET', '/api/v1/workers'], ['POST', '/api/v1/funds', { workerId: w1Id, amount: 1, type: 'INITIAL' }], ['POST', '/api/v1/sites', { name: 'x' }], ['GET', '/api/v1/expenses'], ['POST', '/api/v1/expense-categories', { name: 'x' }]] as const)
    assert.equal((await call(m, p, w1, b)).status, 403, `${m} ${p}`);
  assert.equal((await call('POST', '/api/v1/expenses', admin, expenseForm(site, '5'))).status, 403); // admins don't submit expenses
});

test('spec example: 1,00,000 + 30,000 given, 20,000 approved => 1,10,000; pending does not reduce balance', async () => {
  for (const [amount, type] of [[100000, 'INITIAL'], [30000, 'ADDITIONAL']] as const) assert.equal((await call('POST', '/api/v1/funds', admin, { workerId: w1Id, siteId: site, amount, type })).status, 201);
  const e = await call('POST', '/api/v1/expenses', w1, expenseForm(site, '20000'));
  assert.equal(e.status, 201); assert.equal(e.body.data.status, 'PENDING');
  let my = (await call('GET', '/api/v1/expenses/my', w1)).body.summary;
  assert.deepEqual([my.totalAllocated, my.pendingAmount, my.availableBalance], [130000, 20000, 130000]);
  assert.equal((await call('PATCH', `/api/v1/expenses/${e.body.data.id}/review`, admin, { status: 'APPROVED', reviewNote: 'ok' })).status, 200);
  my = (await call('GET', '/api/v1/expenses/my', w1)).body.summary;
  assert.deepEqual([my.approvedAmount, my.pendingAmount, my.availableBalance], [20000, 0, 110000]);
  const list = (await call('GET', '/api/v1/workers', admin)).body.data;
  assert.equal(list.find((w: any) => w.id === w1Id).availableBalance, 110000);
  assert.equal((await call('GET', `/api/v1/workers/${w1Id}`, admin)).body.data.approvedAmount, 20000);
});

test('already-reviewed expense cannot be reviewed again (no double deduction); rejected does not deduct', async () => {
  const e = (await call('POST', '/api/v1/expenses', w1, expenseForm(site, '500'))).body.data.id;
  assert.equal((await call('PATCH', `/api/v1/expenses/${e}/review`, admin, { status: 'REJECTED', reviewNote: 'unclear' })).status, 200);
  assert.equal((await call('PATCH', `/api/v1/expenses/${e}/review`, admin, { status: 'APPROVED' })).status, 409);
  assert.equal((await call('GET', '/api/v1/expenses/my', w1)).body.summary.availableBalance, 110000);
  assert.equal((await call('PATCH', '/api/v1/expenses/000000000000000000000000/review', admin, { status: 'APPROVED' })).status, 404);
});

test('concurrent approvals: exactly one succeeds', async () => {
  const e = (await call('POST', '/api/v1/expenses', w1, expenseForm(site, '1000'))).body.data.id;
  const rs = await Promise.all(Array.from({ length: 6 }, () => call('PATCH', `/api/v1/expenses/${e}/review`, admin, { status: 'APPROVED' })));
  assert.equal(rs.filter(r => r.status === 200).length, 1); assert.equal(rs.filter(r => r.status === 409).length, 5);
  assert.equal((await call('GET', '/api/v1/expenses/my', w1)).body.summary.approvedAmount, 21000);
});

test('workers only see their own data', async () => {
  const mine2 = (await call('GET', '/api/v1/expenses/my', w2)).body;
  assert.equal(mine2.data.length, 0); assert.equal(mine2.summary.totalAllocated, 0);
  const funds2 = (await call('GET', '/api/v1/funds', w2)).body; assert.equal(funds2.data.length, 0);
  assert.equal((await call('GET', `/api/v1/funds?workerId=${w1Id}`, w2)).body.data.length, 0); // workerId filter is ignored for workers
  assert.ok((await call('GET', '/api/v1/funds', w1)).body.data.length >= 2);
});

test('input validation: amounts, category, site', async () => {
  for (const amt of ['0', '-5', 'abc', '10.505']) assert.equal((await call('POST', '/api/v1/expenses', w1, expenseForm(site, amt))).status, 400, amt);
  assert.equal((await call('POST', '/api/v1/expenses', w1, expenseForm(site, '5', 'Old'))).status, 400); // inactive category
  assert.equal((await call('POST', '/api/v1/expenses', w1, expenseForm(site, '5', 'Nope'))).status, 400);
  assert.equal((await call('POST', '/api/v1/expenses', w1, expenseForm('000000000000000000000000', '5'))).status, 400);
  assert.equal((await call('POST', '/api/v1/funds', admin, { workerId: w1Id, amount: 10.999, type: 'INITIAL' })).status, 400);
  assert.equal((await call('POST', '/api/v1/expenses', w1, expenseForm(site, '10.25'))).body.data.amount, 10.25);
});

test('receipt upload: stored, shown via signed link, tamper-proof, real image required', async () => {
  const e = await call('POST', '/api/v1/expenses', w1, expenseForm(site, '99', 'Steel', new Blob([PNG], { type: 'image/png' })));
  assert.equal(e.status, 201); const url: string = e.body.data.receiptUrl.replace('http://localhost:5000', base); assert.ok(url);
  const img = await fetch(url); assert.equal(img.status, 200); assert.equal(img.headers.get('content-type'), 'image/png');
  const adm = (await call('GET', '/api/v1/expenses?q=Mahesh', admin)).body; assert.equal(adm.data.length, 0);
  assert.ok((await call('GET', '/api/v1/expenses?q=Suresh', admin)).body.data.some((x: any) => x.receiptUrl)); // admin list carries the same receipt
  assert.equal((await fetch(url.replace(/sig=\w{4}/, 'sig=0000'))).status, 403);
  assert.equal((await fetch(url.split('?')[0])).status, 403);
  assert.equal((await fetch(base + '/api/v1/receipts/..%2F..%2Fetc%2Fpasswd?exp=9999999999&sig=x')).status, 403);
  const fake = await call('POST', '/api/v1/expenses', w1, expenseForm(site, '5', 'Cement', new Blob(['<script>alert(1)</script>'.repeat(5)], { type: 'image/png' }), 'x.png'));
  assert.equal(fake.status, 400);
  const big = await call('POST', '/api/v1/expenses', w1, expenseForm(site, '5', 'Cement', new Blob([Buffer.alloc(5 * 1024 * 1024 + 10)], { type: 'image/png' })));
  assert.equal(big.status, 413);
});

test('admin filters: status, worker, date range, summary', async () => {
  const pend = (await call('GET', '/api/v1/expenses?status=PENDING', admin)).body; assert.ok(pend.data.every((e: any) => e.status === 'PENDING'));
  const byW = (await call('GET', `/api/v1/expenses?workerId=${w2Id}`, admin)).body.data; assert.equal(byW.length, 0);
  const today = new Date().toISOString().slice(0, 10);
  assert.ok((await call('GET', `/api/v1/expenses?from=${today}&to=${today}`, admin)).body.data.length > 0);
  assert.equal((await call('GET', '/api/v1/expenses?from=2000-01-01&to=2000-01-02', admin)).body.data.length, 0);
  assert.equal((await call('GET', '/api/v1/expenses?status=BOGUS', admin)).status, 400);
  assert.equal((await call('GET', '/api/v1/expenses?q=.*', admin)).status, 200); // regex input is escaped
});

test('deactivated worker is locked out immediately; categories/sites toggles; worker sees only active', async () => {
  assert.equal((await call('PATCH', `/api/v1/workers/${w2Id}/status`, admin, { isActive: false })).status, 200);
  assert.equal((await call('GET', '/api/v1/expenses/my', w2)).status, 401);
  assert.equal((await call('POST', '/api/v1/auth/login', undefined, { phone: '7777777777', password: 'worker123' })).status, 403);
  const cats = (await call('GET', '/api/v1/expense-categories', w1)).body.data; assert.ok(!cats.some((c: any) => c.name === 'Old'));
  assert.ok((await call('GET', '/api/v1/expense-categories', admin)).body.data.some((c: any) => c.name === 'Old'));
  assert.equal((await call('POST', '/api/v1/expense-categories', admin, { name: 'cement' })).status, 409); // case-insensitive unique
  const s = (await call('POST', '/api/v1/sites', admin, { name: 'Site B' })).body.data.id;
  await call('PATCH', `/api/v1/sites/${s}/status`, admin, { isActive: false });
  assert.ok(!(await call('GET', '/api/v1/sites', w1)).body.data.some((x: any) => x.id === s));
  assert.equal((await call('POST', '/api/v1/funds', admin, { workerId: w2Id, amount: 5, type: 'INITIAL' })).status, 400); // cannot fund a deactivated worker
});

const { outbox } = await import('../src/mailer.js');
const post = (p: string, b: unknown, t?: string) => call('POST', `/api/v1${p}`, t, b);

test('sign up: creates a pending worker (never an admin); cannot log in until approved', async () => {
  assert.equal((await post('/auth/signup', { name: 'A', phone: '123', password: 'abcdef' })).status, 400);
  assert.equal((await post('/auth/signup', { name: 'Ramu', phone: '8888888888', password: 'abcdef' })).status, 409); // existing phone
  const s = await post('/auth/signup', { name: 'Ramu Kaka', phone: '6666666666', email: 'ramu@example.com', password: 'secret123', role: 'ADMIN', isActive: true });
  assert.equal(s.status, 201);
  const l = await post('/auth/login', { phone: '6666666666', password: 'secret123' });
  assert.equal(l.status, 403); assert.match(l.body.message, /approval/);
  const list = (await call('GET', '/api/v1/workers', admin)).body.data; const ramu = list.find((w: any) => w.phone === '6666666666');
  assert.equal(ramu.role, 'WORKER'); assert.equal(ramu.pendingApproval, true); assert.equal(ramu.isActive, false);
  assert.equal((await post('/auth/login', { phone: '6666666666', password: 'wrong' })).status, 401); // wrong password reveals nothing
  await call('PATCH', `/api/v1/workers/${ramu.id}/status`, admin, { isActive: true });
  const ok = await post('/auth/login', { phone: '6666666666', password: 'secret123' }); assert.equal(ok.status, 200); assert.equal(ok.body.user.role, 'WORKER');
  assert.equal((await call('GET', '/api/v1/workers', ok.body.token)).status, 403);
});

test('forgot/reset password: generic reply, single-use expiring token, old password and old sessions die', async () => {
  const unknown = await post('/auth/forgot-password', { phone: '1000000000' }); const known = await post('/auth/forgot-password', { phone: '6666666666' });
  assert.equal(unknown.status, 200); assert.equal(unknown.body.message, known.body.message);
  const mail = outbox.at(-1)!; assert.equal(mail.to, 'ramu@example.com');
  const token = mail.text.match(/token=(\w+)/)![1];
  const oldJwt = await login('6666666666', 'secret123');
  assert.equal((await call('GET', '/api/v1/auth/me', oldJwt)).status, 200);
  assert.equal((await post('/auth/reset-password', { token: 'x'.repeat(64), password: 'newpass123' })).status, 400);
  assert.equal((await post('/auth/reset-password', { token, password: '123' })).status, 400);
  assert.equal((await post('/auth/reset-password', { token, password: 'newpass123' })).status, 200);
  assert.equal((await post('/auth/reset-password', { token, password: 'another123' })).status, 400); // single use
  assert.equal((await post('/auth/login', { phone: '6666666666', password: 'secret123' })).status, 401);
  assert.equal((await post('/auth/login', { phone: '6666666666', password: 'newpass123' })).status, 200);
  assert.equal((await call('GET', '/api/v1/auth/me', oldJwt)).status, 401); // old session invalidated
});

test('reset token expires; owner sees the request and can set a password by hand; deactivated users get no token', async () => {
  await post('/auth/forgot-password', { phone: '6666666666' }); const token = outbox.at(-1)!.text.match(/token=(\w+)/)![1];
  await User.updateOne({ phone: '6666666666' }, { resetExpires: new Date(Date.now() - 1000) });
  assert.equal((await post('/auth/reset-password', { token, password: 'newpass123' })).status, 400);
  await post('/auth/forgot-password', { phone: '6666666666' });
  const w = (await call('GET', '/api/v1/workers', admin)).body.data.find((x: any) => x.phone === '6666666666'); assert.equal(w.resetRequested, true);
  assert.equal((await call('PATCH', `/api/v1/workers/${w.id}`, admin, { password: 'byowner123' })).status, 200);
  assert.equal((await post('/auth/login', { phone: '6666666666', password: 'byowner123' })).status, 200);
  assert.equal((await call('GET', '/api/v1/workers', admin)).body.data.find((x: any) => x.id === w.id).resetRequested, false);
  const before = outbox.length; await post('/auth/forgot-password', { phone: '7777777777' }); // Mahesh is deactivated by an earlier test
  assert.equal(outbox.length, before);
});
