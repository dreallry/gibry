const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
if (!host || !/^127\.0\.0\.1:\d+$/.test(host)) throw new Error('Gunakan emulator lokal dengan project demo-digipus; pengujian tidak boleh mengakses produksi.');
process.env.MIDTRANS_SERVER_KEY = 'test-only-secret';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
process.env.MIDTRANS_IS_PRODUCTION = 'false';
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const clientApp = require('firebase/app');
const client = require('firebase/database');
const payment = require('../functions/server/payments.cjs');
const circulation = require('../functions/server/circulation.cjs');
const points = require('../functions/server/points.cjs');
const accounts = require('../functions/server/accounts.cjs');
const { withMemberAction } = require('../functions/server/member-actions.cjs');
const { planMigration } = require('../scripts/migrate-data.cjs');
const { publicBook } = require('../functions/server/catalog.cjs');
const operations = require('../functions/server/operations.cjs');
const { syncProfile } = require('../functions/server/projections.cjs');
const { runMaintenance } = require('../functions/server/maintenance.cjs');
const app = initializeApp({ projectId: 'demo-digipus', databaseURL: 'https://demo-digipus.firebaseio.com' }, 'integration');
const db = getDatabase(app);
const apps = [], clients = {};
const member = (name, role = 'user') => ({ nama: name, username: name.toLowerCase(), email: `${name}@example.test`, role, banned: false, totalPoints: 0, level: 1 });
const book = (name, type = 'digital', price = 0) => ({ judul: name, type, hargaSewaPerHari: price });
const loan = (userId = 'alice', bookId = 'physical') => ({ userId, bookId, bookType: 'fisik', bookTitle: bookId, status: 'Dikembalikan', denda: 2000, dendaStatus: 'belum', batasKembali: '2026-10-09', deadlineDays: 5 });
const read = async path => (await db.ref(path).get()).val();
const denied = operation => assert.rejects(operation, /permission|denied/i);
const gateway = data => async () => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
const status = (orderId, amount, state = 'settlement') => gateway({ order_id: orderId, gross_amount: `${amount}.00`, transaction_status: state, transaction_id: `tx_${orderId}`, payment_type: 'bank_transfer' });

before(async () => {
  const response = await fetch(`http://${host}/.settings/rules.json?ns=demo-digipus`, { method: 'PUT', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: fs.readFileSync('database.rules.json', 'utf8'), signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, await response.text());
  for (const [uid, verified] of [['alice', true], ['bob', true], ['staff', true], ['admin', true], ['newbie', false], ['banned', true]]) {
    const instance = clientApp.initializeApp({ projectId: 'demo-digipus', databaseURL: 'https://demo-digipus.firebaseio.com', apiKey: 'demo-key' }, `client-${uid}`);
    apps.push(instance);
    const database = client.getDatabase(instance);
    client.connectDatabaseEmulator(database, '127.0.0.1', Number(host.split(':')[1]), { mockUserToken: { sub: uid, email_verified: verified, email: `${uid}@example.test` } });
    clients[uid] = database;
  }
  const guest = clientApp.initializeApp({ projectId: 'demo-digipus', databaseURL: 'https://demo-digipus.firebaseio.com', apiKey: 'demo-key' }, 'client-guest');
  apps.push(guest);
  clients.guest = client.getDatabase(guest);
  client.connectDatabaseEmulator(clients.guest, '127.0.0.1', Number(host.split(':')[1]));
});
beforeEach(async () => {
  await db.ref().set({ anggota: { alice: member('Alice'), bob: member('Bob'), staff: member('Staff', 'librarian'), admin: member('Admin', 'admin'), banned: { ...member('Banned'), banned: true } }, public_profiles: { alice: { nama: 'Alice' }, bob: { nama: 'Bob' } }, daftar_buku: { free: book('Free'), paid: book('Paid', 'digital', 1000), physical: book('Physical', 'fisik'), two: book('Two'), three: book('Three'), four: book('Four') }, peminjaman: { fine: loan() }, komunitas_post: { post: { userId: 'bob', content: 'Original', likesCount: 0, createdAt: 1 } }, book_discussions: { discussion: { userId: 'bob', bookId: 'free', text: 'Original', createdAt: 1 } }, notifikasi: { alice: { notice: { userId: 'alice', fromUserId: 'bob', title: 'Hi', message: 'Hello', body: 'Hello', type: 'social', read: false, createdAt: 1 } } } });
});
after(async () => { for (const instance of apps) await clientApp.deleteApp(instance); await deleteApp(app); });

test('guests can read public catalogue metadata but cannot forge it or read private reservations', async () => {
  await db.ref('public_books/one').set(publicBook({ judul: 'One', penulis: 'Author', pdfUrl: 'private-download', storagePath: 'private-path' }));
  const catalogue = await client.get(client.ref(clients.guest, 'public_books'));
  assert.deepEqual(catalogue.val(), { one: { judul: 'One', penulis: 'Author' } });
  await denied(client.set(client.ref(clients.guest, 'public_books/one'), { judul: 'Forged' }));
  await denied(client.set(client.ref(clients.alice, 'public_books/one'), { judul: 'Forged' }));
  await denied(client.get(client.ref(clients.guest, 'book_reservations')));
});

test('guest reading-list queries and details expose only explicitly public lists', async () => {
  await db.ref('reading_lists').set({ visible: { title: 'Visible', isPublic: true, createdBy: 'alice' }, hidden: { title: 'Hidden', isPublic: false, createdBy: 'alice' } });
  const publicQuery = client.query(client.ref(clients.guest, 'reading_lists'), client.orderByChild('isPublic'), client.equalTo(true));
  assert.deepEqual((await client.get(publicQuery)).val(), { visible: { title: 'Visible', isPublic: true, createdBy: 'alice' } });
  assert.equal((await client.get(client.ref(clients.guest, 'reading_lists/visible'))).val().title, 'Visible');
  await denied(client.get(client.ref(clients.guest, 'reading_lists')));
  await denied(client.get(client.ref(clients.guest, 'reading_lists/hidden')));
  await denied(client.get(client.query(client.ref(clients.guest, 'reading_lists'), client.orderByChild('isPublic'), client.equalTo(false))));
  await denied(client.set(client.ref(clients.guest, 'reading_lists/visible'), { title: 'Forged', isPublic: true }));
  assert.equal((await client.get(client.ref(clients.alice, 'reading_lists/hidden'))).val().title, 'Hidden');
});

test('member can read own contact data and queried loans, but cannot read other contacts or all loans', async () => {
  await client.get(client.ref(clients.alice, 'anggota/alice'));
  await client.get(client.ref(clients.alice, 'public_profiles/bob'));
  await client.get(client.query(client.ref(clients.alice, 'peminjaman'), client.orderByChild('userId'), client.equalTo('alice')));
  await denied(client.get(client.ref(clients.alice, 'anggota/bob')));
  await denied(client.get(client.ref(clients.alice, 'anggota')));
  await denied(client.get(client.ref(clients.alice, 'peminjaman')));
  await denied(client.get(client.ref(clients.alice, 'daftar_buku')));
  await denied(client.get(client.query(client.ref(clients.alice, 'peminjaman'), client.orderByChild('userId'), client.equalTo('bob'))));
});

test('member cannot promote, unban, delete privileged fields, forge payment or forge points', async () => {
  await denied(client.update(client.ref(clients.alice, 'anggota/alice'), { role: 'admin' }));
  await denied(client.remove(client.ref(clients.alice, 'anggota/alice/role')));
  await denied(client.update(client.ref(clients.banned, 'anggota/banned'), { banned: false }));
  await denied(client.update(client.ref(clients.alice, 'peminjaman/fine'), { dendaStatus: 'lunas', batasKembali: '2099-01-01' }));
  await denied(client.set(client.ref(clients.alice, 'user_points/alice'), { totalPoints: 9999, level: 50 }));
  await denied(client.set(client.ref(clients.alice, 'point_wallets/alice'), { totalPoints: 9999 }));
  await denied(client.remove(client.ref(clients.staff, 'anggota/admin/role')));
});

test('profile changes and deletion cannot bypass the API, even for administrators', async () => {
  await denied(client.update(client.ref(clients.admin, 'anggota/bob'), { role: 'admin' }));
  await denied(client.remove(client.ref(clients.admin, 'anggota/bob')));
  await denied(client.update(client.ref(clients.staff, 'anggota/bob'), { banned: true }));
  await denied(client.update(client.ref(clients.alice, 'anggota/alice'), { bio: 'Bypass API' }));
  await denied(client.update(client.ref(clients.alice, 'anggota/alice'), { email: 'bob@example.test', username: 'bob' }));
  await operations.updateProfile(db, 'alice', { data: { bio: 'Safe API update' } });
  assert.equal((await read('public_profiles/alice')).bio, 'Safe API update');
});

test('registration binds the email and username to the authenticated owner', async () => {
  await denied(client.update(client.ref(clients.newbie), {
    'anggota/newbie': { ...member('Newbie'), email: 'alice@example.test' }, 'usernames/newbie': 'newbie',
  }));
  await denied(client.set(client.ref(clients.newbie, 'anggota/newbie'), { ...member('Newbie'), username: 'alice' }));
  await denied(client.update(client.ref(clients.newbie), {
    'anggota/newbie': { ...member('Newbie'), unlockedFrames: ['forged'], readingStreak: 999 }, 'usernames/newbie': 'newbie',
  }));
});

test('private reading lists remain private to their owner and staff', async () => {
  await db.ref('reading_lists').set({ hidden: { title: 'Private', isPublic: false, createdBy: 'alice' }, public: { title: 'Public', isPublic: true, createdBy: 'bob' } });
  await denied(client.get(client.ref(clients.bob, 'reading_lists/hidden')));
  await denied(client.get(client.ref(clients.bob, 'reading_lists')));
  await denied(client.get(client.query(client.ref(clients.bob, 'reading_lists'), client.orderByChild('createdBy'), client.equalTo('alice'))));
  assert.equal((await client.get(client.ref(clients.alice, 'reading_lists/hidden'))).val().title, 'Private');
  assert.equal((await client.get(client.ref(clients.staff, 'reading_lists/hidden'))).val().title, 'Private');
  assert.equal((await client.get(client.query(client.ref(clients.alice, 'reading_lists'), client.orderByChild('createdBy'), client.equalTo('alice')))).size, 1);
  await denied(client.update(client.ref(clients.alice, 'reading_lists/hidden'), { createdBy: 'bob' }));
});

test('authors cannot fabricate or remove another reader reaction and closed accounts cannot react', async () => {
  await denied(client.update(client.ref(clients.bob, 'komunitas_post/post'), { likedBy: { alice: true }, savedBy: { alice: true } }));
  await denied(client.set(client.ref(clients.bob, 'book_discussions/discussion/likedBy/alice'), true));
  await client.set(client.ref(clients.alice, 'komunitas_post/post/likedBy/alice'), true);
  await client.set(client.ref(clients.alice, 'book_discussions/discussion/likedBy/alice'), true);
  await denied(client.remove(client.ref(clients.bob, 'komunitas_post/post/likedBy/alice')));
  await denied(client.remove(client.ref(clients.bob, 'book_discussions/discussion/likedBy/alice')));
  await client.remove(client.ref(clients.alice, 'komunitas_post/post/likedBy/alice'));
  await db.ref('member_actions/alice').set({ closed: true });
  await denied(client.set(client.ref(clients.alice, 'komunitas_post/post/likedBy/alice'), true));
  await denied(client.set(client.ref(clients.alice, 'komunitas_post/post/savedBy/alice'), true));
});

test('staff must transfer their privileged role before deactivating their own account', async () => {
  await assert.rejects(operations.updateProfile(db, 'admin', { data: { status: 'deactivated' } }), /peran|petugas/);
  await assert.rejects(operations.updateProfile(db, 'staff', { data: { status: 'deactivated' } }), /peran|petugas/);
  assert.equal((await read('anggota/admin')).status, undefined);
});

test('social users may change their own likes and read state, but cannot alter another author', async () => {
  await client.set(client.ref(clients.alice, 'book_discussions/discussion/likedBy/alice'), true);
  await denied(client.update(client.ref(clients.alice, 'book_discussions/discussion'), { text: 'Edited', likes: 1 }));
  await denied(client.set(client.ref(clients.alice, 'book_discussions/discussion/likedBy/bob'), true));
  await client.update(client.ref(clients.alice, 'notifikasi/alice/notice'), { read: true });
  await client.set(client.ref(clients.alice, 'komunitas_post/post/likedBy/alice'), true);
  await denied(client.set(client.ref(clients.alice, 'komunitas_post/post/likedBy/bob'), true));
  await denied(client.update(client.ref(clients.alice, 'notifikasi/alice/notice'), { fromUserId: 'alice', body: 'Spoof' }));
  await denied(client.set(client.ref(clients.banned, 'ulasan/spam'), { userId: 'banned', bookId: 'free', text: 'Spam' }));
});

test('username claims require the matching profile in the same atomic registration', async () => {
  await denied(client.set(client.ref(clients.newbie, 'usernames/reserved'), 'newbie'));
  await denied(client.set(client.ref(clients.alice, 'usernames/extra_alias'), 'alice'));
  await client.update(client.ref(clients.newbie), {
    'anggota/newbie': member('Newbie'), 'usernames/newbie': 'newbie',
    'user_points/newbie': { totalPoints: 0, level: 1 },
  });
  assert.equal(await read('usernames/newbie'), 'newbie');
});

test('invitation codes are consumed only together with the matching initial profile', async () => {
  await db.ref('invitation_codes/invite').set({ isActive: true, expiresAt: Date.now() + 60000 });
  await denied(client.set(client.ref(clients.newbie, 'invitation_codes/invite/usedBy'), 'newbie'));
  await denied(client.update(client.ref(clients.newbie, 'invitation_codes/invite'), { usedBy: 'newbie', usedAt: Date.now() }));
  const registration = {
    'anggota/newbie': { ...member('Newbie'), invitationCodeId: 'invite' },
    'usernames/newbie': 'newbie', 'user_points/newbie': { totalPoints: 0, level: 1 },
  };
  await denied(client.update(client.ref(clients.newbie), registration));
  await client.update(client.ref(clients.newbie), {
    ...registration, 'invitation_codes/invite/usedBy': 'newbie', 'invitation_codes/invite/usedAt': Date.now(),
  });
  assert.equal((await read('invitation_codes/invite')).usedBy, 'newbie');
});

test('unverified registration accepts a safe initial profile but no privileged role', async () => {
  await denied(client.set(client.ref(clients.newbie, 'user_points/newbie'), { totalPoints: 0, level: 99 }));
  await denied(client.set(client.ref(clients.newbie, 'anggota/newbie'), { ...member('Newbie'), walletRevision: 999 }));
  await client.update(client.ref(clients.newbie), { 'anggota/newbie': member('Newbie'), 'usernames/newbie': 'newbie', 'user_points/newbie': { totalPoints: 0, level: 1 } });
  await denied(client.set(client.ref(clients.newbie, 'daftar_buku/injected'), book('Injected')));
  await denied(client.update(client.ref(clients.newbie, 'anggota/newbie'), { role: 'librarian' }));
});

test('friend invitations bind participants and only the recipient may accept', async () => {
  const path = 'pertemanan/request';
  await client.set(client.ref(clients.alice, path), { fromUserId: 'alice', fromUserName: 'Alice', toUserId: 'bob', status: 'pending', createdAt: 1 });
  await denied(client.update(client.ref(clients.alice, path), { status: 'accepted' }));
  await denied(client.update(client.ref(clients.bob, path), { fromUserId: 'staff', status: 'accepted' }));
  await client.update(client.ref(clients.bob, path), { status: 'accepted' });
  await client.remove(client.ref(clients.alice, path));
});

test('chat recipients can acknowledge reading but cannot edit or spoof messages', async () => {
  const path = 'pesan/alice_bob/message';
  await client.set(client.ref(clients.alice, path), { senderId: 'alice', senderName: 'Alice', receiverId: 'bob', text: 'Hello', read: false, createdAt: 1 });
  await client.update(client.ref(clients.bob, path), { read: true });
  await denied(client.update(client.ref(clients.bob, path), { text: 'Tampered' }));
  await denied(client.set(client.ref(clients.bob, 'pesan/alice_bob/spoof'), { senderId: 'alice', receiverId: 'bob', text: 'Spoof', read: false, createdAt: 1 }));
  await denied(client.get(client.ref(clients.staff, 'pesan/alice_bob')));
});

test('reply ownership and atomic post deletion keep the community functional', async () => {
  const path = 'komunitas_balasan/post/reply';
  await client.set(client.ref(clients.alice, path), { userId: 'alice', postId: 'post', text: 'Reply', createdAt: 1 });
  await denied(client.update(client.ref(clients.bob, path), { text: 'Edited' }));
  await client.update(client.ref(clients.bob), { 'komunitas_post/post': null, 'komunitas_balasan/post': null });
});

test('server derives fine amount and ownership, reuses an order, and only official settlement pays it', async () => {
  const paid = await payment.createPayment(db, 'alice', { kind: 'fine', borrowId: 'fine', amount: 1, orderId: 'forged' }, gateway({ token: 'token', redirect_url: 'https://example.test/pay' }));
  assert.equal((await read(`payment_orders/${paid.orderId}`)).amount, 2000);
  assert.equal((await payment.createPayment(db, 'alice', { kind: 'fine', borrowId: 'fine' }, () => { throw Error('duplicate'); })).orderId, paid.orderId);
  await assert.rejects(payment.createPayment(db, 'bob', { kind: 'fine', borrowId: 'fine' }), /bukan milik/);
  assert.equal((await payment.confirmPayment(db, 'alice', paid.orderId, status(paid.orderId, 2000, 'pending'))).paid, false);
  assert.equal((await read('peminjaman/fine')).dendaStatus, 'belum');
  await assert.rejects(payment.confirmPayment(db, 'alice', paid.orderId, status(paid.orderId, 1)), /Nominal/);
  await payment.confirmPayment(db, 'alice', paid.orderId, status(paid.orderId, 2000));
  const first = await read('peminjaman/fine');
  await payment.confirmPayment(db, 'alice', paid.orderId, status(paid.orderId, 2000));
  assert.equal((await read('peminjaman/fine')).dendaPaidAt, first.dendaPaidAt);
  assert.equal(first.dendaStatus, 'lunas');
});

test('cash cannot settle a fine when online checkout starts after the cashier precheck', async () => {
  let checkout;
  const cashDb = { ref(path) {
    const reference = db.ref(path);
    return path === 'peminjaman/fine' ? {
      get: () => reference.get(),
      async transaction(callback) {
        checkout = await payment.createPayment(db, 'alice', { kind: 'fine', borrowId: 'fine' }, gateway({ token: 'token', redirect_url: 'https://example.test/pay' }));
        return reference.transaction(callback);
      },
    } : reference;
  } };
  await assert.rejects(operations.manageLoan(cashDb, 'staff', { action: 'cash', borrowId: 'fine' }), /berubah|checkout/);
  assert.equal((await read('peminjaman/fine')).dendaStatus, 'belum');
  assert.equal((await read(`payment_orders/${checkout.orderId}`)).status, 'pending');
});

test('checkout rechecks a fine paid by cash before requesting a gateway session', async () => {
  let requests = 0;
  const checkoutDb = { ref(path) {
    const reference = db.ref(path);
    return path === 'peminjaman/fine' ? {
      async get() {
        const stale = await reference.get();
        await operations.manageLoan(db, 'staff', { action: 'cash', borrowId: 'fine' });
        return stale;
      },
      transaction: callback => reference.transaction(callback),
      update: changes => reference.update(changes),
    } : reference;
  } };
  await assert.rejects(payment.createPayment(checkoutDb, 'alice', { kind: 'fine', borrowId: 'fine' }, async () => {
    requests++; return gateway({ token: 'token', redirect_url: 'https://example.test/pay' })();
  }), /berubah|diselesaikan/);
  assert.equal(requests, 0);
  assert.equal((await read('peminjaman/fine')).dendaStatus, 'lunas');
  assert.ok(Object.values(await read('payment_orders')).every(order => !['pending', 'creating'].includes(order.status)));
});

test('a signed webhook cannot turn a pending gateway status into paid', async () => {
  const result = await payment.createPayment(db, 'alice', { kind: 'fine', borrowId: 'fine' }, gateway({ token: 'token', redirect_url: 'https://example.test/pay' }));
  const payload = { order_id: result.orderId, status_code: '200', gross_amount: '2000.00', transaction_status: 'settlement' };
  payload.signature_key = crypto.createHash('sha512').update(payload.order_id + payload.status_code + payload.gross_amount + process.env.MIDTRANS_SERVER_KEY).digest('hex');
  assert.equal((await payment.processNotification(db, payload, status(result.orderId, 2000, 'pending'))).paid, false);
  await assert.rejects(payment.processNotification(db, { ...payload, signature_key: 'a'.repeat(128) }), /Signature/);
});

test('book rentals are rejected and catalog borrowing stays free', async () => {
  await assert.rejects(circulation.borrowLoan(db, 'alice', { bookId: 'paid', deadlineDays: 2, orderId: 'forged' }), /tidak membutuhkan pembayaran/);
  await assert.rejects(payment.createPayment(db, 'alice', { kind: 'rental', bookId: 'paid', deadlineDays: 2 }), /hanya untuk denda/);
  const result = await circulation.borrowLoans(db, 'alice', { bookIds: ['paid', 'physical'], deadlineDays: 2 });
  assert.equal(result.borrowIds.length, 2);
  for (const id of result.borrowIds) assert.equal((await read(`peminjaman/${id}`)).paymentMethod, 'Gratis');
});

test('batch borrowing rolls back all reservations when one book is unavailable', async () => {
  await circulation.borrowLoan(db, 'bob', { bookId: 'two' });
  await assert.rejects(circulation.borrowLoans(db, 'alice', { bookIds: ['free', 'two'] }), /sedang dipinjam/);
  assert.equal((await read('user_active_borrows/alice')).count, 0);
  assert.equal(await read('book_locks/free'), null);
  assert.ok(Object.values(await read('peminjaman')).every(record => record.bookId !== 'free'));
});

test('invalid batches and another student identity are rejected before reserving books', async () => {
  for (const bookIds of [[], ['free', 'free'], ['free', 'two', 'three', 'four'], ['../admin']]) {
    await assert.rejects(circulation.borrowLoans(db, 'alice', { bookIds }), { status: 400 });
  }
  await assert.rejects(circulation.borrowLoans(db, 'alice', { userId: 'bob', bookIds: ['free'] }), { status: 403 });
  assert.equal(await read('book_locks'), null);
  assert.equal(await read('user_active_borrows'), null);
});

test('a batch exceeding the remaining loan allowance does not keep its first book', async () => {
  await circulation.borrowLoans(db, 'alice', { bookIds: ['three', 'four'] });
  await assert.rejects(circulation.borrowLoans(db, 'alice', { bookIds: ['free', 'two'] }), /maksimal 3/);
  assert.equal((await read('user_active_borrows/alice')).count, 2);
  assert.equal(await read('book_locks/free'), null);
  assert.equal(await read('book_status/free'), null);
});

test('staff batch borrowing belongs to the selected student and physical books are picked up', async () => {
  const { borrowIds } = await circulation.borrowLoans(db, 'staff', { userId: 'alice', bookIds: ['physical', 'free'] });
  const records = await Promise.all(borrowIds.map(id => read(`peminjaman/${id}`)));
  assert.ok(records.every(record => record.userId === 'alice' && record.status === 'Dipinjam'));
  assert.equal(await read('user_active_borrows/staff'), null);
});

test('concurrent borrowers cannot double-book and a member cannot exceed three active loans', async () => {
  const twoUsers = await Promise.allSettled(['alice', 'bob'].map(uid => circulation.borrowLoan(db, uid, { bookId: 'free' })));
  assert.equal(twoUsers.filter(result => result.status === 'fulfilled').length, 1);
  await db.ref().update({ 'book_status/free': null, 'book_locks/free': null, user_active_borrows: null, peminjaman: null });
  const four = await Promise.allSettled(['free', 'two', 'three', 'four'].map(bookId => circulation.borrowLoan(db, 'alice', { bookId })));
  assert.equal(four.filter(result => result.status === 'fulfilled').length, 3);
  assert.equal((await read('user_active_borrows/alice')).count, 3);
});

test('legacy active loans still prevent borrowing even when availability is missing', async () => {
  await db.ref('peminjaman/legacy').set({ ...loan('bob', 'free'), bookType: 'digital', status: 'Dipinjam', batasKembali: '2099-01-01' });
  await assert.rejects(circulation.borrowLoan(db, 'alice', { bookId: 'free' }), /sedang dipinjam/);
});

test('physical returns require staff, charge calendar days and cannot charge twice', async () => {
  await db.ref('peminjaman/active').set({ ...loan(), status: 'Dipinjam' });
  await assert.rejects(circulation.returnLoan(db, 'alice', 'active'), /petugas/);
  assert.equal((await circulation.returnLoan(db, 'staff', 'active', Date.parse('2026-10-10T00:00:00Z'))).denda, 2000);
  assert.equal((await circulation.returnLoan(db, 'staff', 'active', Date.parse('2026-10-12T00:00:00Z'))).denda, 2000);
});

test('points are awarded from deduplicated proofs and daily claims cannot repeat', async () => {
  assert.equal((await points.syncPoints(db, 'alice', { amount: 100000 })).totalPoints, 15);
  assert.equal((await points.syncPoints(db, 'alice', { amount: 100000 })).totalPoints, 15);
  await db.ref('peminjaman/duplicate').set(loan());
  assert.equal((await points.syncPoints(db, 'alice')).totalPoints, 15);
  assert.equal((await points.claimDaily(db, 'alice')).pointsAwarded, 15);
  assert.equal((await points.claimDaily(db, 'alice')).alreadyClaimed, true);
  assert.equal((await read('point_wallets/alice')).totalPoints, 30);
  await assert.rejects(points.syncPoints(db, 'alice', { userId: 'bob' }), /bukan milik/);
  await assert.rejects(points.spendPoints(db, 'alice', -10), /tidak valid/);
});

test('reward stock and wallet cannot overspend; rejection refunds only once', async () => {
  await db.ref('point_wallets/alice').set({ totalPoints: 100, awards: { borrow_physical: 10, return_physical: 5 } });
  await db.ref('rewards/gift').set({ title: 'Gift', isActive: true, pointsCost: 60, stock: 1 });
  const results = await Promise.allSettled([points.redeemReward(db, 'alice', { rewardId: 'gift' }), points.redeemReward(db, 'alice', { rewardId: 'gift' })]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const id = results.find(result => result.status === 'fulfilled').value.id;
  assert.equal((await read('point_wallets/alice')).totalPoints, 40);
  await points.processRedemption(db, 'staff', { redemptionId: id, status: 'rejected' });
  await points.processRedemption(db, 'staff', { redemptionId: id, status: 'rejected' });
  assert.equal((await read('point_wallets/alice')).totalPoints, 100);
  assert.equal((await read('rewards/gift')).stock, 1);
  await assert.rejects(points.processRedemption(db, 'staff', { redemptionId: id, status: 'approved' }), /status lain/);
});

test('approved reward can be fulfilled and extends a deadline once', async () => {
  await db.ref('point_wallets/alice').set({ totalPoints: 100, awards: {} });
  await db.ref('rewards/extension').set({ title: 'Extension', type: 'extended_deadline', isActive: true, pointsCost: 20, stock: 1 });
  await db.ref('peminjaman/active').set({ ...loan(), status: 'Dipinjam' });
  const { id } = await points.redeemReward(db, 'alice', { rewardId: 'extension' });
  await points.processRedemption(db, 'staff', { redemptionId: id, status: 'approved' });
  await points.processRedemption(db, 'staff', { redemptionId: id, status: 'fulfilled' });
  assert.equal((await read('peminjaman/active')).batasKembali, '2026-10-16');
});

test('migration plans public projections without writes, preserves reviewed balances and is safe to repeat', async () => {
  await db.ref('anggota/alice/totalPoints').set(80);
  await db.ref('daftar_buku/paid/pdfUrl').set('https://example.test/private.pdf');
  await db.ref('book_discussions/discussion/likedBy').set(['alice']);
  const plan = await planMigration(db, 'reviewed');
  assert.equal(await read('public_books'), null);
  assert.equal(plan.updates['point_wallets/alice'].totalPoints, 80);
  assert.equal(plan.updates['public_books/paid'].pdfUrl, undefined);
  assert.deepEqual(plan.updates['book_discussions/discussion/likedBy'], { alice: true });
  await db.ref().update(plan.updates);
  const repeat = await planMigration(db, 'reviewed');
  assert.equal(repeat.updates['point_wallets/alice'], undefined);
  assert.equal((await client.get(client.ref(clients.alice, 'public_books/paid'))).val().pdfUrl, undefined);
});

test('account deletion blocks unresolved loans, queues failed cleanup and retries without losing financial history', async () => {
  const calls = [];
  const auth = { updateUser: async uid => calls.push(`disable:${uid}`), revokeRefreshTokens: async uid => calls.push(`revoke:${uid}`), deleteUser: async uid => calls.push(`delete:${uid}`) };
  await assert.rejects(accounts.deleteAccount(db, auth, 'alice'), /peminjaman dan denda/);
  assert.equal(calls.length, 0);
  await db.ref('peminjaman/fine/dendaStatus').set('lunas');
  delete process.env.FIREBASE_STORAGE_BUCKET;
  assert.equal((await accounts.deleteAccount(db, auth, 'alice', async () => { throw Error('Simulated cleanup failure'); })).pending, true);
  assert.equal((await read('anggota/alice')).status, 'deactivated');
  assert.equal((await read('account_deletions/alice')).status, 'pending');
  await accounts.finishDeletion(db, auth, 'alice', async () => {});
  assert.equal(await read('anggota/alice'), null);
  assert.equal((await read('peminjaman/fine')).userName, 'Akun dihapus');
  assert.notEqual((await read('peminjaman/fine')).userId, 'alice');
  await accounts.finishDeletion(db, auth, 'alice', async () => {});
  assert.equal(calls.filter(call => call === 'delete:alice').length, 1);
});

test('account deletion waits for an active request and prevents new points or loans after closure', async () => {
  await db.ref('peminjaman/fine').remove();
  const auth = { updateUser: async () => {}, revokeRefreshTokens: async () => {}, deleteUser: async () => {} };
  let release, entered;
  const ready = new Promise(resolve => { entered = resolve; });
  const held = withMemberAction(db, 'alice', async () => { entered(); await new Promise(resolve => { release = resolve; }); });
  await ready;
  await assert.rejects(accounts.deleteAccount(db, auth, 'alice', async () => {}), /tindakan lain/);
  assert.equal((await read('anggota/alice')).status, undefined);
  release();
  await held;
  await accounts.deleteAccount(db, auth, 'alice', async () => {});
  await accounts.finishDeletion(db, auth, 'alice', async () => {});
  await assert.rejects(points.claimDaily(db, 'alice'), /Penghapusan akun/);
  await assert.rejects(circulation.borrowLoan(db, 'alice', { bookId: 'free' }), /Penghapusan akun/);
  await denied(client.set(client.ref(clients.alice, 'anggota/alice'), member('Alice')));
  await denied(client.set(client.ref(clients.alice, 'ulasan/after-delete'), { userId: 'alice', bookId: 'free', text: 'Injected' }));
  assert.equal(await read('point_wallets/alice'), null);
  assert.equal(await read('anggota/alice'), null);
});

test('concurrent point mutations publish the newest wallet revision and balance', async () => {
  await db.ref('point_wallets/alice').set({ totalPoints: 100, revision: 1 });
  await Promise.all([points.spendPoints(db, 'alice', 10), points.spendPoints(db, 'alice', 20)]);
  assert.equal((await read('user_points/alice')).totalPoints, 70);
  assert.equal((await read('anggota/alice')).totalPoints, 70);
  assert.equal((await read('user_points/alice')).revision, (await read('point_wallets/alice')).revision);
});

test('account cleanup removes owned notes, lists, friendships, posts and private like data', async () => {
  await db.ref('peminjaman/fine').remove();
  await db.ref().update({ 'reading_notes/alice/note': { text: 'Private' }, 'reading_lists/list': { createdBy: 'alice' },
    'pertemanan/friend': { fromUserId: 'bob', toUserId: 'alice' }, 'komunitas_post/owned': { userId: 'alice' },
    'komunitas_balasan/owned/reply': { userId: 'bob' }, 'profile_like_counts/alice': { count: 1 },
    'profile_like_claims/2026-10-10/alice': { targets: { bob: true } },
    'profile_like_claims/2026-10-10/bob': { targets: { alice: true } } });
  const auth = { updateUser: async () => {}, revokeRefreshTokens: async () => {}, deleteUser: async () => {} };
  await accounts.deleteAccount(db, auth, 'alice', async () => {});
  await accounts.finishDeletion(db, auth, 'alice', async () => {});
  for (const path of ['reading_notes/alice', 'reading_lists/list', 'pertemanan/friend', 'komunitas_post/owned', 'komunitas_balasan/owned',
    'profile_like_counts/alice', 'profile_like_claims/2026-10-10/alice', 'profile_like_claims/2026-10-10/bob/targets/alice']) assert.equal(await read(path), null, path);
});


test('Vercel staff book writes synchronize public metadata atomically and keep PDF private', async () => {
  const input = { bookData: { judul: 'New', penulis: 'Author', cover: '/covers/algoritma.jpg', pdfUrl: 'https://example.test/private.pdf' } };
  await assert.rejects(operations.saveBook(db, 'alice', input), /izin/);
  const { bookId } = await operations.saveBook(db, 'staff', input);
  assert.equal((await read(`public_books/${bookId}`)).judul, 'New');
  assert.equal((await read(`public_books/${bookId}`)).pdfUrl, undefined);
  assert.equal((await read(`daftar_buku/${bookId}`)).pdfUrl, input.bookData.pdfUrl);
  await operations.saveBook(db, 'staff', { bookId, bookData: { judul: 'Edited' } });
  assert.equal((await read(`public_books/${bookId}`)).judul, 'Edited');
  await operations.deleteBook(db, 'staff', { bookId });
  for (const path of ['daftar_buku', 'public_books', 'book_status', 'book_locks']) assert.equal(await read(`${path}/${bookId}`), null);
});

test('staff cannot edit or delete a book with an active loan or checkout lock', async () => {
  const { borrowId } = await circulation.borrowLoan(db, 'alice', { bookId: 'free' });
  for (const operation of [operations.saveBook, operations.deleteBook]) await assert.rejects(operation(db, 'staff', { bookId: 'free', bookData: { status: 'Tersedia' } }), /peminjaman|checkout/);
  assert.equal((await read('book_locks/free')).borrowId, borrowId);
  await db.ref('book_locks/free').remove();
  await assert.rejects(operations.deleteBook(db, 'staff', { bookId: 'free' }), /peminjaman/);
  assert.equal((await read('peminjaman/' + borrowId)).status, 'Dipinjam');
});

test('own profile update publishes safe fields immediately and rejects privileged fields', async () => {
  await operations.updateProfile(db, 'alice', { data: { nama: 'Reader', bio: 'Hello', photoURL: 'data:image/jpeg;base64,YQ==' } });
  const profile = await read('public_profiles/alice');
  assert.equal(profile.nama, 'Reader'); assert.equal(profile.bio, 'Hello'); assert.equal(profile.email, undefined);
  for (const data of [{ role: 'admin' }, { totalPoints: 9000 }, { profileRevision: 9000 }, { photoURL: 'x'.repeat(24577) }, { email: 'other@example.test' }]) await assert.rejects(operations.updateProfile(db, 'alice', { data }));
  await denied(client.update(client.ref(clients.alice, 'anggota/alice'), { profileRevision: 0 }));
  await denied(client.remove(client.ref(clients.alice, 'anggota/alice/profileRevision')));
  await operations.updateProfile(db, 'alice', { data: { status: 'deactivated' } });
  await assert.rejects(operations.updateProfile(db, 'alice', { data: { nama: 'Hidden' } }), /aktif/);
  await operations.updateProfile(db, 'alice', { data: { status: 'active' } });
  assert.equal((await read('public_profiles/alice')).status, 'active');
});

test('moderation enforces staff roles and preserves the last active administrator', async () => {
  await assert.rejects(operations.manageUser(db, 'alice', { userId: 'bob', action: 'ban', reason: 'Spam' }), /izin/);
  await assert.rejects(operations.manageUser(db, 'staff', { userId: 'bob', action: 'role', role: 'admin' }), /izin/);
  await assert.rejects(operations.manageUser(db, 'staff', { userId: 'admin', action: 'ban', reason: 'Spam' }), /admin/);
  await assert.rejects(operations.manageUser(db, 'admin', { userId: 'admin', action: 'role', role: 'user' }), /satu admin/);
  await operations.manageUser(db, 'staff', { userId: 'bob', action: 'ban', reason: 'Spam' });
  assert.equal((await read('public_profiles/bob')).banned, true);
  await operations.manageUser(db, 'staff', { userId: 'bob', action: 'unban' });
  assert.equal((await read('public_profiles/bob')).banned, false);
});

test('concurrent demotions cannot remove both active admins', async () => {
  await db.ref('anggota/bob/role').set('admin');
  const result = await Promise.allSettled([
    operations.manageUser(db, 'admin', { userId: 'admin', action: 'role', role: 'user' }),
    operations.manageUser(db, 'bob', { userId: 'bob', action: 'role', role: 'user' }),
  ]);
  assert.equal(result.filter(item => item.status === 'fulfilled').length, 1);
  const members = await read('anggota');
  assert.equal(Object.values(members).filter(member => member.role === 'admin').length, 1);
});

test('cash and waiver are server actions and cannot bypass an online checkout', async () => {
  await assert.rejects(operations.manageLoan(db, 'alice', { borrowId: 'fine', action: 'cash' }), /izin/);
  await db.ref('payment_orders/pending').set({ userId: 'alice', kind: 'fine', targetId: 'fine', status: 'pending' });
  await assert.rejects(operations.manageLoan(db, 'staff', { borrowId: 'fine', action: 'cash' }), /checkout/);
  await db.ref('payment_orders/pending').remove();
  await operations.manageLoan(db, 'staff', { borrowId: 'fine', action: 'cash' });
  assert.equal((await read('peminjaman/fine')).dendaStatus, 'lunas');
  await assert.rejects(operations.manageLoan(db, 'staff', { borrowId: 'fine', action: 'waive', reason: 'Twice' }), /berubah/);
});

test('digital expiry is enforced at the next borrow without waiting for the daily cron', async () => {
  const { borrowId } = await circulation.borrowLoan(db, 'alice', { bookId: 'free' });
  await db.ref(`peminjaman/${borrowId}/batasKembali`).set('2000-01-01');
  await circulation.borrowLoan(db, 'bob', { bookId: 'free' });
  assert.equal((await read(`peminjaman/${borrowId}`)).status, 'Kadaluarsa');
  assert.equal((await read('book_locks/free')).userId, 'bob');
  assert.ok(Number.isFinite((await read('book_status/free')).availableAfter));
});

test('daily maintenance handles due loans, reservations and account cleanup without Storage', async () => {
  await db.ref('peminjaman').set({ digital: { ...loan('alice','free'), bookType: 'digital', status: 'Dipinjam' }, physical: { ...loan('bob','physical'), status: 'Dipinjam' } });
  await db.ref('book_reservations').set({ expired: { status: 'waiting', expiresAt: 1 }, waiting: { status: 'waiting', expiresAt: Date.now() + 86400000 } });
  await db.ref('account_deletions/empty').set({ status: 'pending', requestedAt: 1 });
  const auth = { updateUser: async () => {}, revokeRefreshTokens: async () => {}, deleteUser: async () => {} };
  const previous = process.env.MIDTRANS_SERVER_KEY; delete process.env.MIDTRANS_SERVER_KEY;
  try {
    const result = await runMaintenance(db, auth, Date.parse('2026-10-11T05:00:00Z'));
    assert.equal(result.loans, 2); assert.equal(result.reservations, 1); assert.equal(result.deletions, 1);
    assert.equal((await read('peminjaman/digital')).status, 'Kadaluarsa');
    assert.equal((await read('peminjaman/physical')).status, 'Terlambat');
    assert.equal((await read('book_reservations/expired')).status, 'expired');
    assert.equal((await read('account_deletions/empty')).status, 'done');
    const retry = await runMaintenance(db, auth, Date.parse('2026-10-11T05:00:00Z'));
    assert.equal(retry.loans, 0); assert.equal(retry.reservations, 0); assert.equal(retry.deletions, 0);
  } finally { process.env.MIDTRANS_SERVER_KEY = previous; }
});

test('point reset retains award proofs, daily claims and immediately updates the public balance', async () => {
  const { borrowId } = await circulation.borrowLoan(db, 'alice', { bookId: 'free' });
  await points.claimDaily(db, 'alice'); await points.syncPoints(db, 'alice');
  await points.resetProgress(db, 'alice');
  await points.syncPoints(db, 'alice');
  assert.equal((await read('point_wallets/alice')).totalPoints, 0);
  assert.equal((await read('public_profiles/alice')).totalPoints, 0);
  assert.equal((await points.claimDaily(db, 'alice')).alreadyClaimed, true);
  assert.equal((await read('peminjaman/' + borrowId)).userId, 'alice');
});

 test('a new member can publish a safe public profile without sending contact fields', async () => {
  await db.ref('anggota/newbie').set(member('Newbie'));
  await syncProfile(db, 'newbie');
  assert.equal((await read('public_profiles/newbie')).nama, 'Newbie');
  assert.equal((await read('public_profiles/newbie')).email, undefined);
});
