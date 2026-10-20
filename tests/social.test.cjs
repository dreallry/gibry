const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
if (host !== '127.0.0.1:9018') throw Error('Pengujian sosial hanya boleh memakai emulator lokal 127.0.0.1:9018 dengan proyek demo-digipus.');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const firebase = require('firebase/app');
const client = require('firebase/database');
const { giveLike } = require('../functions/server/social.cjs');
const { wibDate } = require('../functions/server/circulation.cjs');
const app = initializeApp({ projectId: 'demo-digipus', databaseURL: 'https://demo-digipus.firebaseio.com' }, 'social-integration');
const db = getDatabase(app);
const apps = [], clients = {};
const member = uid => ({ nama: uid, username: uid, email: `${uid}@example.test`, role: 'user', banned: false, totalPoints: 30, level: 1, walletRevision: 2 });
const read = async path => (await db.ref(path).get()).val();
const denied = operation => assert.rejects(operation, /permission|denied/i);

function clubs(database) {
  const context = { exports: {}, require: name => name === 'firebase/database' ? client : name === './firebase' ? { db: database } : {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/clubs.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context.exports;
}

before(async () => {
  const response = await fetch(`http://${host}/.settings/rules.json?ns=demo-digipus`, {
    method: 'PUT', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: fs.readFileSync('database.rules.json', 'utf8'), signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200, await response.text());
  for (const uid of ['alice', 'bob', 'banned']) {
    const instance = firebase.initializeApp({ projectId: 'demo-digipus', databaseURL: 'https://demo-digipus.firebaseio.com', apiKey: 'demo-key' }, `social-${uid}`);
    apps.push(instance);
    const database = client.getDatabase(instance);
    client.connectDatabaseEmulator(database, '127.0.0.1', 9018, { mockUserToken: { sub: uid, email_verified: true, email: `${uid}@example.test` } });
    clients[uid] = database;
  }
});

beforeEach(async () => {
  const members = Object.fromEntries(['alice', 'bob', 'banned', ...Array.from({ length: 11 }, (_, index) => `target${index}`)].map(uid => [uid, member(uid)]));
  members.banned.banned = true;
  await db.ref().set({
    anggota: members,
    user_points: { alice: { totalPoints: 30, level: 1 }, bob: { totalPoints: 30, level: 1 } },
    point_wallets: { alice: { totalPoints: 30, revision: 2 }, bob: { totalPoints: 30, revision: 2 } },
    book_clubs: { club: { createdBy: 'alice', name: 'Book Club', memberCount: 2 }, other: { createdBy: 'bob', name: 'Other Club' } },
    club_members: { memberA: { userId: 'alice', clubId: 'club', role: 'admin' }, memberB: { userId: 'bob', clubId: 'club', role: 'member' } },
    club_messages: { messageB: { userId: 'bob', clubId: 'club', text: 'Hello', createdAt: 1 } },
  });
});

after(async () => { for (const instance of apps) await firebase.deleteApp(instance); await deleteApp(app); });

test('concurrent duplicate likes count once and preserve the notification read state on retry', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, () => giveLike(db, 'alice', { targetUserId: 'bob' })));
  assert.equal(results.filter(result => result.success).length, 1);
  assert.equal((await read('user_likes_count/bob')).count, 1);
  assert.equal((await read('profile_like_counts/bob')).count, 1);
  const notifications = await read('notifikasi/bob');
  assert.equal(Object.keys(notifications).length, 1);
  const noticeId = Object.keys(notifications)[0];
  await client.update(client.ref(clients.bob, `notifikasi/bob/${noticeId}`), { read: true });
  const repeat = await giveLike(db, 'alice', { targetUserId: 'bob' });
  assert.equal(repeat.success, false);
  assert.equal(repeat.newLikes, 1);
  assert.equal((await read(`notifikasi/bob/${noticeId}`)).read, true);
  assert.equal((await read('user_likes_count/bob')).awards, undefined);
});

test('a sender can like at most ten distinct recipients per WIB day', async () => {
  for (let index = 0; index < 10; index++) await giveLike(db, 'alice', { targetUserId: `target${index}` });
  await assert.rejects(giveLike(db, 'alice', { targetUserId: 'target10' }), /Batas 10 like/);
  assert.equal(Object.keys((await read(`profile_like_claims/${wibDate()}/alice`)).targets).length, 10);
  assert.equal((await giveLike(db, 'alice', { targetUserId: 'target0' })).success, false);
  assert.equal(await read('user_likes_count/target10'), null);
});

test('banned members and self likes are rejected before a proof is recorded', async () => {
  await assert.rejects(giveLike(db, 'banned', { targetUserId: 'bob' }), /diblokir/);
  await assert.rejects(giveLike(db, 'alice', { targetUserId: 'banned' }), /diblokir/);
  await assert.rejects(giveLike(db, 'alice', { targetUserId: 'alice' }), /profil sendiri/);
  assert.equal(await read('profile_like_claims'), null);
  assert.equal(await read('user_likes_count'), null);
});

test('likes do not award or spend points in wallets, private profiles, or their public projection', async () => {
  const before = await Promise.all(['point_wallets', 'user_points', 'anggota'].map(read));
  await giveLike(db, 'alice', { targetUserId: 'bob' });
  const after = await Promise.all(['point_wallets', 'user_points', 'anggota'].map(read));
  assert.deepEqual(after, before);
});

test('clients cannot forge like counts, private proofs, or lifecycle fences', async () => {
  await denied(client.set(client.ref(clients.alice, 'user_likes_count/bob'), { count: 999 }));
  await denied(client.set(client.ref(clients.alice, 'profile_like_counts/bob'), { count: 999, awards: { fake: true } }));
  await denied(client.set(client.ref(clients.alice, `profile_like_claims/${wibDate()}/alice`), { targets: { bob: true } }));
  await denied(client.set(client.ref(clients.alice, 'user_likes/fake'), { from: 'alice', to: 'bob' }));
  await denied(client.get(client.ref(clients.alice, 'profile_like_counts')));
  await denied(client.set(client.ref(clients.alice, 'member_actions/alice'), { closed: false }));
});

test('club members may leave but cannot promote themselves, rewrite identities, or edit the owner count', async () => {
  await denied(client.update(client.ref(clients.bob, 'club_members/memberB'), { role: 'admin' }));
  await denied(client.update(client.ref(clients.bob, 'club_members/memberB'), { clubId: 'other' }));
  await denied(client.update(client.ref(clients.bob, 'club_members/memberB'), { userId: 'alice' }));
  await denied(client.update(client.ref(clients.bob, 'book_clubs/club'), { memberCount: 999 }));
  await client.remove(client.ref(clients.bob, 'club_members/memberB'));
  assert.equal(await read('club_members/memberB'), null);
});

test('concurrent joins create one membership, and leaving removes legacy duplicates', async () => {
  const library = clubs(clients.bob);
  await client.remove(client.ref(clients.bob, 'club_members/memberB'));
  await Promise.all([library.joinBookClub('club', 'bob'), library.joinBookClub('club', 'bob')]);
  const memberships = Object.values(await read('club_members')).filter(member => member.userId === 'bob' && member.clubId === 'club');
  assert.equal(memberships.length, 1);
  await db.ref('club_members/legacyDuplicate').set({ userId: 'bob', clubId: 'club', role: 'member' });
  await library.leaveBookClub('club', 'bob');
  assert.ok(Object.values(await read('club_members')).every(member => member.userId !== 'bob'));
});

test('club creation commits the club and creator membership together', async () => {
  const id = await clubs(clients.alice).createBookClub('New Club', 'Description', 'alice');
  assert.equal((await read(`book_clubs/${id}`)).createdBy, 'alice');
  assert.equal(Object.values(await read('club_members')).filter(member => member.clubId === id && member.userId === 'alice' && member.role === 'admin').length, 1);
});

test('achievement awards use the member-owned path and cannot duplicate on retry', async () => {
  await db.ref('peminjaman/borrowed').set({ userId: 'alice', bookId: 'book', status: 'Dipinjam' });
  const context = { exports: {}, require: name => name === 'firebase/database' ? client : name === './firebase' ? { db: clients.alice } : name === './profiles' ? { getUserProfile: uid => read(`anggota/${uid}`) } : {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/gamification.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  const library = context.exports;
  assert.equal((await library.checkAndAwardAchievements('alice'))[0].type, 'first_borrow');
  assert.equal((await library.checkAndAwardAchievements('alice')).length, 0);
  assert.equal((await library.getUserAchievements('alice')).length, 1);
  await denied(client.set(client.ref(clients.bob, 'pencapaian/alice/forged'), { type: 'forged', title: 'Forged' }));
});

test('an owner can transfer the club and member roles atomically, then loses ownership privileges', async () => {
  await client.update(client.ref(clients.alice), {
    'book_clubs/club/createdBy': 'bob', 'club_members/memberB/role': 'admin', 'club_members/memberA/role': 'member',
  });
  assert.equal((await read('book_clubs/club')).createdBy, 'bob');
  assert.equal((await read('club_members/memberA')).role, 'member');
  assert.equal((await read('club_members/memberB')).role, 'admin');
  await denied(client.update(client.ref(clients.alice, 'book_clubs/club'), { name: 'Old owner' }));
  await client.update(client.ref(clients.bob, 'book_clubs/club'), { name: 'New owner' });
});

test('club messages keep author and club IDs; the owner can delete the whole club with its records atomically', async () => {
  await denied(client.update(client.ref(clients.bob, 'club_messages/messageB'), { userId: 'alice' }));
  await denied(client.update(client.ref(clients.bob, 'club_messages/messageB'), { clubId: 'other' }));
  await denied(client.update(client.ref(clients.alice, 'club_messages/messageB'), { text: 'Owner editing another author' }));
  await client.update(client.ref(clients.alice), { 'book_clubs/club': null, 'club_members/memberA': null, 'club_members/memberB': null, 'club_messages/messageB': null });
  assert.equal(await read('book_clubs/club'), null);
  assert.equal(await read('club_members'), null);
  assert.equal(await read('club_messages'), null);
});

test('a lifecycle fence and deletion tombstone prevent old tokens from recreating a profile', async () => {
  await db.ref('member_actions/alice').set({ closed: true });
  await denied(client.update(client.ref(clients.alice, 'anggota/alice'), { nama: 'Changed while closing' }));
  await db.ref().update({ 'anggota/alice': null, 'member_actions/alice': null, 'account_deletions/alice': { status: 'done' } });
  await denied(client.set(client.ref(clients.alice, 'anggota/alice'), { ...member('alice'), totalPoints: 0, level: 1, walletRevision: 0 }));
  assert.equal(await read('anggota/alice'), null);
});

test('members cannot overwrite or remove point display fields and wallet revision with a whole-profile write', async () => {
  const own = await read('anggota/alice');
  for (const field of ['totalPoints', 'level', 'walletRevision']) {
    const without = { ...own };
    delete without[field];
    await denied(client.set(client.ref(clients.alice, 'anggota/alice'), without));
  }
  await denied(client.update(client.ref(clients.alice, 'anggota/alice'), { walletRevision: 1000 }));
  await denied(client.update(client.ref(clients.alice, 'anggota/alice'), { totalPoints: 1000 }));
  await denied(client.update(client.ref(clients.alice, 'anggota/alice'), { bio: 'Bypass API' }));
});
