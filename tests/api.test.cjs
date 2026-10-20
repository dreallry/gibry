const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
for (const [key, port] of [['FIREBASE_DATABASE_EMULATOR_HOST', 9018], ['FIREBASE_AUTH_EMULATOR_HOST', 9098]]) {
  if (process.env[key] !== `127.0.0.1:${port}`) throw new Error('API tests require demo-digipus Auth and Database emulators on loopback.');
}
process.env.FIREBASE_DATABASE_URL = 'https://demo-digipus.firebaseio.com';
process.env.VERCEL_URL = 'preview.example.test';
process.env.CRON_SECRET = 'test-cron-secret';
delete process.env.MIDTRANS_SERVER_KEY;
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const handler = require('../api/[...path].js');
const app = initializeApp({ projectId: 'demo-digipus', databaseURL: process.env.FIREBASE_DATABASE_URL });
const db = getDatabase(app), auth = getAuth(app), tokens = {};
const people = [['alice', true, 'user'], ['bob', true, 'user'], ['staff', true, 'librarian'], ['admin', true, 'admin'], ['newbie', false, 'user']];

async function call(path, uid, body = {}, options = {}) {
  const response = { statusCode: 0, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; }, end() {} };
  await handler({ url: `/api/${path}`, method: 'POST', body, headers: { 'content-type': 'application/json', origin: 'https://preview.example.test', ...(uid ? { authorization: `Bearer ${tokens[uid]}` } : {}) }, ...options }, response);
  return response;
}

before(async () => {
  const rules = await fetch('http://127.0.0.1:9018/.settings/rules.json?ns=demo-digipus', { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: fs.readFileSync('database.rules.json', 'utf8') });
  assert.equal(rules.status, 200);
  for (const [uid, verified] of people) {
    try { await auth.deleteUser(uid); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
    await auth.createUser({ uid, email: `${uid}@example.test`, emailVerified: verified, password: 'Test-only-123!' });
    const response = await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${uid}@example.test`, password: 'Test-only-123!', returnSecureToken: true }) });
    assert.equal(response.status, 200);
    tokens[uid] = (await response.json()).idToken;
  }
});
beforeEach(async () => {
  await db.ref().set({ anggota: Object.fromEntries(people.map(([uid, , role]) => [uid, { nama: uid, username: uid, email: `${uid}@example.test`, role, banned: false, totalPoints: 0, level: 1 }])),
    daftar_buku: { free: { judul: 'Free', penulis: 'Author', type: 'digital', hargaSewaPerHari: 0 } } });
});
after(async () => {
  for (const [uid] of people) try { await auth.deleteUser(uid); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  await deleteApp(app);
  const serverApp = require('../functions/server/http.cjs').adminApp();
  if (serverApp !== app) await serverApp.delete();
});

test('API verifies real emulator tokens, email status and ownership', async () => {
  assert.equal((await call('borrow-book', null, { bookId: 'free' })).statusCode, 401);
  assert.equal((await call('borrow-book', 'newbie', { bookId: 'free' })).statusCode, 403);
  const borrowed = await call('borrow-book', 'alice', { bookId: 'free' });
  assert.equal(borrowed.statusCode, 200, JSON.stringify(borrowed.body));
  assert.equal((await call('return-book', 'bob', borrowed.body)).statusCode, 403);
  assert.equal((await call('return-book', 'alice', borrowed.body)).statusCode, 200);
  assert.equal((await call('claim-daily-xp', 'alice')).statusCode, 200);
});

test('batch borrow endpoint records several free books atomically', async () => {
  await db.ref('daftar_buku/two').set({ judul: 'Two', penulis: 'Author', type: 'digital' });
  const response = await call('borrow-books', 'alice', { bookIds: ['free', 'two'], deadlineDays: 7 });
  assert.equal(response.statusCode, 200, JSON.stringify(response.body));
  assert.equal(response.body.borrowIds.length, 2);
  const loans = (await db.ref('peminjaman').get()).val();
  assert.equal(Object.values(loans).filter(loan => loan.userId === 'alice').length, 2);
  assert.ok(Object.values(loans).filter(loan => loan.userId === 'alice').every(loan => loan.paymentMethod === 'Gratis'));
});

test('Vercel domain is accepted automatically while an unrelated origin and wrong staff role are denied', async () => {
  const body = { bookData: { judul: 'Book', penulis: 'Author' } };
  assert.equal((await call('save-book', 'alice', body)).statusCode, 403);
  assert.equal((await call('save-book', 'staff', body)).statusCode, 200);
  assert.equal((await call('save-book', 'staff', body, { headers: { origin: 'https://untrusted.test' } })).statusCode, 403);
  assert.equal((await call('manage-user', 'staff', { userId: 'bob', action: 'role', role: 'admin' })).statusCode, 403);
});

test('unverified users can sync their own safe profile but cannot promote themselves', async () => {
  assert.equal((await call('sync-profile', 'newbie')).statusCode, 200);
  assert.equal((await call('update-profile', 'newbie', { data: { bio: 'Reader' } })).statusCode, 200);
  assert.equal((await call('update-profile', 'newbie', { data: { role: 'admin' } })).statusCode, 400);
  assert.equal((await db.ref('public_profiles/newbie').get()).val().email, undefined);
  assert.equal((await call('update-profile', 'newbie', { data: { photoURL: 'x'.repeat(40000) } })).statusCode, 413);
});

test('daily cron authenticates before accessing data and finishes without a payment key', async () => {
  const response = await call('maintenance', null, {}, { method: 'GET', headers: { authorization: 'Bearer test-cron-secret' } });
  assert.equal(response.statusCode, 200, JSON.stringify(response.body));
  assert.equal(response.body.payments, undefined);
  assert.equal((await call('maintenance', null, {}, { method: 'GET', headers: { authorization: 'Bearer wrong' } })).statusCode, 401);
});

test('account deletion succeeds with recent authentication and no Storage bucket', async () => {
  delete process.env.FIREBASE_STORAGE_BUCKET;
  const response = await call('delete-account', 'newbie');
  assert.equal(response.statusCode, 403);
  const removed = await call('delete-account', 'alice');
  assert.equal(removed.statusCode, 200, JSON.stringify(removed.body));
  assert.equal(removed.body.pending, false);
  assert.equal((await db.ref('anggota/alice').get()).exists(), false);
  await assert.rejects(auth.getUser('alice'), { code: 'auth/user-not-found' });
});

test('admin test-account cleanup preserves staff and members with active loans', async () => {
  await db.ref('peminjaman/active').set({ userId: 'alice', status: 'Dipinjam', bookId: 'free' });
  assert.equal((await call('reset-members', 'staff', { keepAdmins: true })).statusCode, 403);
  assert.equal((await call('reset-members', 'admin', { keepAdmins: false })).statusCode, 400);
  const result = await call('reset-members', 'admin', { keepAdmins: true });
  assert.equal(result.statusCode, 200, JSON.stringify(result.body));
  assert.equal(result.body.deletedCount, 2);
  const profiles = (await db.ref('anggota').get()).val();
  assert.ok(profiles.alice); assert.ok(profiles.staff); assert.ok(profiles.admin);
  assert.equal(profiles.bob, undefined); assert.equal(profiles.newbie, undefined);
});
