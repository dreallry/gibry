const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function images({ width = 800, height = 600, context = true, length = 1000 } = {}) {
  const canvas = { width: 0, height: 0, getContext: () => context ? { drawImage() {} } : null, toDataURL: () => 'data:image/jpeg;base64,' + 'a'.repeat(length) };
  const sandbox = { exports: {}, Blob, File,
    require: () => ({ auth: { currentUser: { uid: 'alice' } } }),
    FileReader: class { readAsDataURL() { this.result = 'data:image/png;base64,YQ=='; this.onload(); } },
    Image: class { constructor() { this.width = width; this.height = height; } set src(value) { this.onload(); } },
    document: { createElement: () => canvas },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/storage.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
  return { ...sandbox.exports, canvas };
}

test('Vercel API covers the existing endpoints and immediate public-data synchronization', async () => {
  const handler = require('../api/[...path].js');
  const operations = ['borrow-book', 'borrow-books', 'return-book', 'create-snap', 'confirm-payment', 'midtrans-webhook', 'sync-points', 'claim-daily-xp', 'spend-points', 'redeem-reward', 'process-redemption', 'delete-account', 'give-like', 'save-book', 'delete-book', 'update-profile', 'sync-profile', 'manage-user', 'manage-loan', 'announce'];
  for (const operation of operations) {
    const response = { code: 0, setHeader() {}, status(code) { this.code = code; return this; }, json() {} };
    await handler({ url: `/api/${operation}`, method: 'POST', headers: { 'content-type': 'application/json' }, body: {} }, response);
    assert.equal(response.code, operation === 'midtrans-webhook' ? 503 : 401, operation);
  }
  for (const route of ['/api/unknown', '/api/toString', '/api/nested/borrow-book']) {
    const response = { code: 0, setHeader() {}, status(code) { this.code = code; return this; }, json() {} };
    await handler({ url: route, method: 'POST', headers: {}, body: {} }, response);
    assert.equal(response.code, 404);
  }
  for (const request of [{ url: '/api/[...path]?...path=borrow-book' }, { url: '/api/[...path]', query: { '...path': 'borrow-book' } }]) {
    const response = { code: 0, setHeader() {}, status(code) { this.code = code; return this; }, json() {} };
    await handler({ ...request, method: 'POST', headers: { 'content-type': 'application/json' }, body: {} }, response);
    assert.equal(response.code, 401);
  }
});

test('maintenance requires a configured cron secret and a matching bearer before accessing data', async () => {
  const handler = require('../api/[...path].js');
  const prior = process.env.CRON_SECRET;
  for (const secret of ['', 'test-cron-secret']) {
    process.env.CRON_SECRET = secret;
    const response = { code: 0, setHeader() {}, status(code) { this.code = code; return this; }, json() {} };
    await handler({ url: '/api/maintenance', method: 'GET', headers: { authorization: 'Bearer wrong' } }, response);
    assert.equal(response.code, 401);
  }
  if (prior === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = prior;
});

test('recent authentication verifies the token once while retaining revocation and email checks', async () => {
  let verifications = 0, executed = 0;
  let identity = { uid: 'alice', email_verified: true, auth_time: Math.floor(Date.now() / 1000) };
  const { ServiceError } = require('../functions/server/errors.cjs');
  const context = { exports: {}, module: { exports: {} }, process: { env: {} }, Buffer, console,
    require(name) {
      if (name === 'firebase-admin/app') return { getApps: () => [{ name: '[DEFAULT]' }] };
      if (name === 'firebase-admin/auth') return { getAuth: () => ({ async verifyIdToken(token, revoked) {
        verifications++; assert.equal(token, 'test-token'); assert.equal(revoked, true);
        if (identity === null) throw new Error('Revoked');
        return identity;
      } }) };
      if (name === 'firebase-admin/database') return { getDatabase: () => ({}) };
      return { ServiceError, requireMember: async () => {} };
    },
  };
  vm.runInNewContext(fs.readFileSync('functions/server/http.cjs', 'utf8'), context);
  const handler = context.module.exports.endpoint(() => { executed++; return {}; }, { recentAuth: true });
  const response = { setHeader() {}, status(code) { this.code = code; return this; }, json() {} };
  const request = { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer test-token' }, body: {} };
  await handler(request, response); assert.equal(response.code, 200); assert.equal(verifications, 1);
  identity.auth_time -= 301;
  await handler(request, response); assert.equal(response.code, 401);
  identity.email_verified = false;
  await handler(request, response); assert.equal(response.code, 403);
  identity = null;
  await handler(request, response); assert.equal(response.code, 401);
  assert.equal(executed, 1);
});

test('deployment has one API function, a daily cron, and no Cloud Functions hosting dependency', () => {
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.deepEqual(config.crons, [{ path: '/api/maintenance', schedule: '0 1 * * *' }]);
  assert.deepEqual(fs.readdirSync('api').filter(name => /\.js$/.test(name)), ['[...path].js']);
  assert.equal(config.functions['api/[...path].js'].maxDuration, 60);
  const firebase = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
  assert.equal(firebase.functions, undefined);
  assert.ok(firebase.hosting.rewrites.every(item => !item.function));
});

test('Spark avatar upload does not call Firebase Storage and limits image size', () => {
  const source = fs.readFileSync('src/lib/storage.ts', 'utf8');
  assert.ok(!source.includes('firebase/storage'));
  assert.ok(!source.includes('uploadBytes'));
  assert.ok(!fs.readFileSync('src/lib/firebase.ts', 'utf8').includes('getStorage'));
});

test('avatar compression fits both dimensions and produces a bounded JPEG', async () => {
  const library = images({ width: 2000, height: 1000 });
  const photo = await library.uploadProfilePhoto('alice', new Blob(['image'], { type: 'image/png' }));
  assert.equal(library.canvas.width, 160); assert.equal(library.canvas.height, 80);
  assert.ok(photo.startsWith('data:image/jpeg;base64,'));
  const wide = images({ width: 300, height: 100 });
  await wide.compressImageToBase64(new Blob(['image'], { type: 'image/jpeg' }), 400, 50);
  assert.equal(wide.canvas.width, 150); assert.equal(wide.canvas.height, 50);
});

test('avatar upload rejects another user, invalid MIME, oversized files and canvas failure', async () => {
  const library = images();
  await assert.rejects(library.uploadProfilePhoto('bob', 'https://example.test/photo.jpg'), /akun/);
  await assert.rejects(library.uploadProfilePhoto('alice', new Blob(['svg'], { type: 'image/svg+xml' })), /JPG/);
  await assert.rejects(library.uploadProfilePhoto('alice', new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/jpeg' })), /5 MB/);
  await assert.rejects(images({ context: false }).uploadProfilePhoto('alice', new Blob(['image'], { type: 'image/png' })), /Browser/);
  await assert.rejects(images({ length: 25000 }).uploadProfilePhoto('alice', new Blob(['image'], { type: 'image/png' })), /terlalu besar/);
});
