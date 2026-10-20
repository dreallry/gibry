const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifySignature, isPaid } = require('../functions/server/payments.cjs');
const { requireId } = require('../functions/server/errors.cjs');
const { publicProfile } = require('../functions/server/public-profiles.cjs');
const { wibDate, fineRate } = require('../functions/server/circulation.cjs');
const { level } = require('../functions/server/points.cjs');
const { publicBook } = require('../functions/server/catalog.cjs');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { endpoint } = require('../functions/server/http.cjs');

test('signature requires the correct secret and unchanged amount', () => {
  const payload = { order_id: 'order_1', status_code: '200', gross_amount: '2000.00' };
  payload.signature_key = crypto.createHash('sha512').update('order_12002000.00test-key').digest('hex');
  assert.doesNotThrow(() => verifySignature(payload, 'test-key'));
  assert.throws(() => verifySignature({ ...payload, gross_amount: '1.00' }, 'test-key'));
  assert.throws(() => verifySignature(payload, 'other-key'));
  assert.throws(() => verifySignature({ ...payload, signature_key: 'a' }, 'test-key'));
  assert.throws(() => verifySignature({}, 'test-key'));
});

test('pending, failed and challenged payments never mean paid', () => {
  for (const transaction_status of ['pending', 'expire', 'cancel', 'deny', 'failure']) assert.equal(isPaid({ transaction_status }), false);
  assert.equal(isPaid({ transaction_status: 'capture', fraud_status: 'challenge' }), false);
  assert.equal(isPaid({ transaction_status: 'capture', fraud_status: 'accept' }), true);
  assert.equal(isPaid({ transaction_status: 'settlement' }), true);
});

test('IDs cannot traverse database paths', () => {
  for (const id of ['../admin', 'a/b', 'a.b', '', null, 'x'.repeat(129)]) assert.throws(() => requireId(id, 'ID'));
  assert.equal(requireId('-Abc_123', 'ID'), '-Abc_123');
});

test('public profiles omit contact details and privileged private metadata', () => {
  const profile = publicProfile({ nama: 'Reader', username: 'reader', email: 'private@example.test', alamat: 'Private', noTelp: '123', banReason: 'Private', invitationCodeId: 'secret' });
  assert.deepEqual(profile, { nama: 'Reader', username: 'reader' });
  assert.equal(publicProfile(null), null);
});

test('public catalog excludes downloadable files and unknown private fields', () => {
  assert.deepEqual(publicBook({ judul: 'Book', hargaSewaPerHari: 1000, pdfUrl: 'private', storagePath: 'private', internalNote: 'private' }), { judul: 'Book' });
});

test('WIB date, fine tiers and levels match the existing policy', () => {
  assert.equal(wibDate(Date.parse('2026-10-09T18:00:00Z')), '2026-10-10');
  assert.deepEqual([1, 5, 6, 10, 11, 14, 15].map(fineRate), [2000, 2000, 5000, 5000, 10000, 10000, 15000]);
  assert.deepEqual([0, 50, 100, 500, 501, 1500, 1501, 5000, 5001, 10000].map(level), [1, 5, 6, 10, 11, 20, 21, 35, 36, 50]);
});

test('CSV export neutralizes formulas with whitespace and escapes quotes', () => {
  const context = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/admin/shared/csvExport.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  const { sanitizeCsvCell } = context.exports;
  for (const value of ['=1+1', '  =1+1', '\t=1+1', '+cmd', '-cmd', '@cmd', '\rtext']) assert.equal(sanitizeCsvCell(value), `"'${value}"`);
  assert.equal(sanitizeCsvCell('a"b'), '"a""b"');
  assert.equal(sanitizeCsvCell(null), '""');
});

test('HTTP API rejects missing identity, wrong origin, wrong method and oversized body', async () => {
  process.env.FRONTEND_ORIGIN = 'https://example.test';
  delete process.env.ALLOWED_ORIGINS;
  const handler = endpoint(() => { throw Error('must not execute'); });
  const check = async (req, expected) => {
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.body = data; return this; }, end() { return this; } };
    await handler({ headers: { 'content-type': 'application/json' }, method: 'POST', body: {}, ...req }, res);
    assert.equal(res.code, expected);
  };
  await check({}, 401);
  await check({ headers: { origin: 'https://evil.test' } }, 403);
  await check({ method: 'GET' }, 405);
  await check({ body: { value: 'x'.repeat(17000) } }, 413);
});
