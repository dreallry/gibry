const test = require('node:test');
const assert = require('node:assert/strict');
const { processRedemption } = require('../functions/server/points.cjs');

function database(seed) {
  const data = structuredClone(seed);
  const hooks = {};
  const snapshot = value => ({ val: () => structuredClone(value ?? null) });
  const read = path => path.split('/').filter(Boolean).reduce((value, key) => value?.[key], data);
  const write = (path, value) => {
    const keys = path.split('/').filter(Boolean);
    let node = data;
    for (const key of keys.slice(0, -1)) node = node[key] ||= {};
    if (value === null) delete node[keys.at(-1)];
    else node[keys.at(-1)] = structuredClone(value);
  };
  function ref(path, child, equal) {
    return {
      async get() {
        const value = read(path);
        return snapshot(child ? Object.fromEntries(Object.entries(value || {}).filter(([, item]) => item[child] === equal)) : value);
      },
      async transaction(fn) {
        if (hooks.transaction) await hooks.transaction(path);
        const next = fn(structuredClone(read(path) ?? null));
        if (next === undefined) return { committed: false, snapshot: snapshot(read(path)) };
        write(path, next);
        return { committed: true, snapshot: snapshot(read(path)) };
      },
      async update(changes) { for (const [key, value] of Object.entries(changes)) write(`${path}/${key}`, value); },
      async set(value) { write(path, value); },
      child: key => ref(`${path}/${key}`),
      orderByChild: key => ref(path, key),
      equalTo: value => ref(path, child, value),
    };
  }
  return { ref, data, hooks };
}

function fixture(loans = { original: { userId: 'reader', status: 'Dipinjam', batasKembali: '2026-10-20' } }) {
  return database({
    anggota: { staff: { nama: 'Petugas', role: 'admin', banned: false }, reader: { nama: 'Pembaca', role: 'user', banned: false } },
    rewards: { reward: { type: 'extended_deadline', stock: 1 } },
    reward_redemptions: { claim: { userId: 'reader', rewardId: 'reward', status: 'pending', pointsSpent: 20 } },
    point_wallets: { reader: { totalPoints: 50, revision: 0, redemptions: { claim: { cost: 20, rewardId: 'reward' } } } },
    peminjaman: loans,
  });
}
const process = (db, status) => processRedemption(db, 'staff', { redemptionId: 'claim', status });
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('fulfillment and later approval retries cannot extend newly borrowed books', async () => {
  const db = fixture();
  await process(db, 'approved');
  db.data.peminjaman.later = { userId: 'reader', status: 'Dipinjam', batasKembali: '2026-10-22' };
  await process(db, 'fulfilled');
  await process(db, 'approved');
  await process(db, 'fulfilled');
  assert.equal(db.data.reward_redemptions.claim.status, 'fulfilled');
  assert.equal(db.data.peminjaman.original.batasKembali, '2026-10-27');
  assert.equal(db.data.peminjaman.later.batasKembali, '2026-10-22');
  assert.deepEqual(db.data.redemption_actions.claim.targetLoans, { original: true });
});

test('a slow approval cannot regress a concurrently fulfilled claim', async () => {
  const db = fixture();
  const approvalReached = deferred(), resumeApproval = deferred();
  let paused = false;
  db.hooks.transaction = async path => {
    if (path === 'reward_redemptions/claim' && !paused) {
      paused = true;
      approvalReached.resolve();
      await resumeApproval.promise;
    }
  };
  const approval = process(db, 'approved');
  await approvalReached.promise;
  await process(db, 'fulfilled');
  assert.equal(db.data.reward_redemptions.claim.status, 'fulfilled');
  resumeApproval.resolve();
  await approval;
  assert.equal(db.data.reward_redemptions.claim.status, 'fulfilled');
  assert.equal(db.data.peminjaman.original.batasKembali, '2026-10-27');
});

test('approval retry recovers partial failure using only the original persisted targets', async () => {
  const db = fixture({
    first: { userId: 'reader', status: 'Dipinjam', batasKembali: '2026-10-20' },
    second: { userId: 'reader', status: 'Dipinjam', batasKembali: '2026-10-21' },
  });
  let failed = false;
  db.hooks.transaction = async path => {
    if (path === 'peminjaman/second' && !failed) { failed = true; throw new Error('Simulated connection failure'); }
  };
  await assert.rejects(process(db, 'approved'), /Simulated connection failure/);
  assert.equal(db.data.reward_redemptions.claim.status, 'pending');
  assert.equal(db.data.peminjaman.first.batasKembali, '2026-10-27');
  db.data.peminjaman.later = { userId: 'reader', status: 'Dipinjam', batasKembali: '2026-10-22' };
  await process(db, 'approved');
  await process(db, 'fulfilled');
  assert.deepEqual(db.data.redemption_actions.claim.targetLoans, { first: true, second: true });
  assert.equal(db.data.peminjaman.first.batasKembali, '2026-10-27');
  assert.equal(db.data.peminjaman.second.batasKembali, '2026-10-28');
  assert.equal(db.data.peminjaman.later.batasKembali, '2026-10-22');
});

test('an empty approval target set stays empty after later borrowing', async () => {
  const db = fixture({});
  await process(db, 'approved');
  db.data.peminjaman.later = { userId: 'reader', status: 'Dipinjam', batasKembali: '2026-10-22' };
  await process(db, 'fulfilled');
  assert.equal(db.data.redemption_actions.claim.targetsSelected, true);
  assert.equal(db.data.peminjaman.later.batasKembali, '2026-10-22');
});

test('approved and rejected decisions remain mutually exclusive', async () => {
  const db = fixture();
  await process(db, 'approved');
  await assert.rejects(process(db, 'rejected'), /status lain/);
  assert.equal(db.data.point_wallets.reader.totalPoints, 50);
  assert.equal(db.data.rewards.reward.stock, 1);
  assert.equal(db.data.reward_redemptions.claim.status, 'approved');
});
