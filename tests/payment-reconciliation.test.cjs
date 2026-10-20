const test = require('node:test');
const assert = require('node:assert/strict');
const { createPayment, confirmPayment, reconcilePendingPayments } = require('../functions/server/payments.cjs');

process.env.MIDTRANS_SERVER_KEY = 'test-reconciliation-only';
process.env.MIDTRANS_IS_PRODUCTION = 'false';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

// These tests check gateway decisions. Real concurrent RTDB behavior is covered by database.test.cjs.
function database(seed) {
  const data = structuredClone(seed);
  let sequence = 0;
  const snapshot = value => ({ val: () => structuredClone(value ?? null) });
  const read = path => path.split('/').filter(Boolean).reduce((value, key) => value?.[key], data);
  const write = (path, value) => {
    const parts = path.split('/').filter(Boolean);
    let node = data;
    for (const key of parts.slice(0, -1)) node = node[key] ||= {};
    if (value === null) delete node[parts.at(-1)];
    else node[parts.at(-1)] = structuredClone(value);
  };
  function ref(path = '', filters = {}) {
    return {
      key: path.split('/').at(-1),
      child: key => ref(`${path}/${key}`),
      push: () => ref(`${path}/test-order-${++sequence}`),
      async get() {
        let value = read(path);
        if (filters.child) {
          value = Object.fromEntries(Object.entries(value || {}).filter(([, item]) =>
            (filters.equal === undefined || item[filters.child] === filters.equal) &&
            (filters.start === undefined || item[filters.child] >= filters.start) &&
            (filters.end === undefined || item[filters.child] <= filters.end))
            .sort((a, b) => a[1][filters.child] - b[1][filters.child])
            .slice(0, filters.limit || Infinity));
        }
        return snapshot(value);
      },
      async update(changes) {
        for (const [key, value] of Object.entries(changes)) write(path ? `${path}/${key}` : key, value);
      },
      async set(value) { write(path, value); },
      async remove() { write(path, null); },
      async transaction(fn) {
        const result = fn(structuredClone(read(path) ?? null));
        if (result === undefined) return { committed: false, snapshot: snapshot(read(path)) };
        write(path, result);
        return { committed: true, snapshot: snapshot(read(path)) };
      },
      orderByChild: child => ref(path, { ...filters, child }),
      equalTo: equal => ref(path, { ...filters, equal }),
      startAt: start => ref(path, { ...filters, start }),
      endAt: end => ref(path, { ...filters, end }),
      limitToFirst: limit => ref(path, { ...filters, limit }),
    };
  }
  return { ref, data };
}

const now = Date.UTC(2026, 9, 10, 6);
function fixture(overrides = {}) {
  return database({
    anggota: { reader: { nama: 'Pembaca', role: 'user', banned: false } },
    daftar_buku: { book: { judul: 'Buku Uji', type: 'digital', hargaSewaPerHari: 1000 } },
    payment_orders: { order: { userId: 'reader', kind: 'rental', targetId: 'book', amount: 1000,
      deadlineDays: 1, token: 'test-snap-token', status: 'pending', createdAt: now - 3600000,
      paymentExpiresAt: now - 1000, reconcileAt: now - 500, ...overrides } },
    book_locks: { book: { userId: 'reader', borrowId: 'order' } },
    user_active_borrows: { reader: { active: { order: { bookId: 'book', reservedAt: now - 3600000 } }, count: 1 } },
  });
}
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const core = status => ({ order_id: 'order', gross_amount: '1000.00', transaction_id: 'transaction', transaction_status: status });

test('Core 404 cannot release an unknown Snap session after an ambiguous creation', async () => {
  const db = fixture({ token: undefined, status: 'creating' });
  const summary = await reconcilePendingPayments(db, async () => response({ status_code: '404' }, 404), now);
  assert.equal(summary.released, 0);
  assert.equal(summary.review, 1);
  assert.equal(db.data.book_locks.book.borrowId, 'order');
  assert.equal(db.data.payment_orders.order.needsReview, true);
});

test('abandoned checkout releases only after verified Snap cancellation and fresh Core 404', async () => {
  const db = fixture();
  const methods = [];
  const summary = await reconcilePendingPayments(db, async (url, options) => {
    methods.push([url.endsWith('/cancel') ? 'cancel' : 'status', options.method]);
    if (url.includes('/snap/')) {
      assert.equal(options.headers.Authorization, 'test-reconciliation-only');
      return response({ canceled_at: new Date(now).toISOString() });
    }
    return response({ status_code: '404' }, 404);
  }, now);
  assert.deepEqual(methods, [['status', 'GET'], ['cancel', 'POST'], ['status', 'GET']]);
  assert.equal(summary.released, 1);
  assert.equal(db.data.book_locks.book, undefined);
  assert.equal(db.data.user_active_borrows.reader.count, 0);
  assert.equal(db.data.payment_orders.order.status, 'cancel');
  assert.equal(db.data.payment_orders.order.reconcileAt ?? null, null);
});

test('failed Snap cancellation leaves reservation intact even when Core reports cancel', async () => {
  const db = fixture();
  const summary = await reconcilePendingPayments(db, async url => url.includes('/snap/')
    ? response({ error_messages: ['Transaction is on progress'] }, 409) : response(core('cancel')), now);
  assert.equal(summary.released, 0);
  assert.equal(summary.review, 1);
  assert.equal(db.data.book_locks.book.borrowId, 'order');
});

test('pending payment is canceled and both Core status and Snap closure are reverified', async () => {
  const db = fixture();
  let canceled = false;
  const calls = [];
  const summary = await reconcilePendingPayments(db, async (url, options) => {
    calls.push([url.includes('/snap/') ? 'snap' : 'core', options.method]);
    if (url.includes('/snap/')) return response({ canceled_at: new Date(now).toISOString() });
    if (options.method === 'POST') { canceled = true; return response(core('cancel')); }
    return response(core(canceled ? 'cancel' : 'pending'));
  }, now);
  assert.equal(summary.released, 1);
  assert.deepEqual(calls, [['core', 'GET'], ['core', 'POST'], ['core', 'GET'], ['snap', 'POST'], ['core', 'GET']]);
});

test('a signed rental status is rejected and cannot release its reservation', async () => {
  const db = fixture();
  await assert.rejects(confirmPayment(db, 'reader', 'order', async () => response(core('deny'))), /tidak didukung/);
  assert.equal(db.data.payment_orders.order.status, 'pending');
  assert.equal(db.data.book_locks.book.borrowId, 'order');
});

test('reconciliation completes a missed paid fine and removes its retry marker', async () => {
  const db = fixture({ kind: 'fine', targetId: 'loan', status: 'pending' });
  db.data.peminjaman = { loan: { userId: 'reader', denda: 1000, dendaStatus: 'belum', midtransOrderId: 'order' } };
  const summary = await reconcilePendingPayments(db, async () => response(core('settlement')), now);
  assert.equal(summary.paid, 1);
  assert.equal(db.data.peminjaman.loan.dendaStatus, 'lunas');
  assert.equal(db.data.payment_orders.order.status, 'paid');
  assert.equal(db.data.payment_orders.order.reconcileAt, undefined);
});

test('a paid rental that cannot yet be fulfilled keeps its reservation and recovery marker', async () => {
  const db = fixture({ status: 'paid' });
  db.data.anggota.reader.banned = true;
  const summary = await reconcilePendingPayments(db, async () => response(core('settlement')), now);
  assert.equal(summary.review, 1);
  assert.equal(summary.released, 0);
  assert.equal(db.data.payment_orders.order.status, 'paid');
  assert.equal(db.data.book_locks.book.borrowId, 'order');
  assert.equal(db.data.payment_orders.order.reconcileAt, now + 5 * 60000);
});

test('reconciliation refuses a paid rental order without creating a loan', async () => {
  const db = fixture({ status: 'paid' });
  const summary = await reconcilePendingPayments(db, async () => response(core('settlement')), now);
  assert.equal(summary.review, 1);
  assert.equal(db.data.peminjaman?.order, undefined);
  assert.equal(db.data.payment_orders.order.status, 'paid');
  assert.equal(db.data.payment_orders.order.needsReview, true);
});

test('new Snap transactions have a fixed WIB expiry and a separate page expiry', async () => {
  const db = database({ anggota: { reader: { nama: 'Pembaca', role: 'user', banned: false } },
    peminjaman: { loan: { userId: 'reader', denda: 2000, dendaStatus: 'belum' } } });
  let payload;
  await createPayment(db, 'reader', { kind: 'fine', borrowId: 'loan' }, async (_url, options) => {
    payload = JSON.parse(options.body);
    return response({ token: 'test-token', redirect_url: 'https://app.sandbox.midtrans.com/test-token' });
  });
  assert.equal(payload.expiry.duration, 30);
  assert.match(payload.expiry.start_time, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \+0700$/);
  assert.deepEqual(payload.page_expiry, { duration: 30, unit: 'minutes' });
  const order = db.data.payment_orders['test-order-1'];
  assert.equal(order.paymentExpiresAt - order.gatewayStartedAt, 30 * 60000);
  assert.ok(order.reconcileAt > 0);
});
