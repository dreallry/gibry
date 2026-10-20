const { ServiceError, requireId, requireMember } = require('./errors.cjs');
const { wibDate, availableAfter } = require('./circulation.cjs');
const { withMemberAction } = require('./member-actions.cjs');
const { publishProfile } = require('./projections.cjs');

const thresholds = [
  { level: 1, minPoints: 0 },
  { level: 5, minPoints: 50 },
  { level: 6, minPoints: 100 },
  { level: 10, minPoints: 500 },
  { level: 11, minPoints: 501 },
  { level: 20, minPoints: 1500 },
  { level: 21, minPoints: 1501 },
  { level: 35, minPoints: 5000 },
  { level: 36, minPoints: 5001 },
  { level: 50, minPoints: 10000 },
];
const level = points => thresholds.filter(item => points >= item.minPoints).at(-1)?.level || 1;
async function publish(db, uid, wallet) {
  const revision = wallet.revision || 0;
  const projection = { totalPoints: wallet.totalPoints, level: level(wallet.totalPoints), revision, updatedAt: Date.now() };
  await db.ref(`user_points/${uid}`).transaction(current => (current?.revision || 0) > revision ? undefined : projection);
  await db.ref(`anggota/${uid}`).transaction(profile => {
    if (!profile) return null;
    if (profile.status === 'deactivated' || (profile.walletRevision || 0) > revision) return;
    return { ...profile, totalPoints: projection.totalPoints, level: projection.level, walletRevision: revision,
      ...(wallet.lastDailyClaim ? { lastClaimedDailyXPDate: wallet.lastDailyClaim } : {}) };
  });
  await publishProfile(db, uid);
}

async function resetProgress(db, uid) {
  await requireMember(db, uid);
  // Retain award proofs and claim history so a reset cannot farm points again.
  await syncPoints(db, uid);
  const result = await db.ref(`point_wallets/${uid}`).transaction(wallet => {
    if (!wallet) return null;
    if (wallet.pendingRedemption) return;
    return { ...wallet, totalPoints: 0, revision: (wallet.revision || 0) + 1 };
  });
  if (!result.committed || !result.snapshot.val()) throw new ServiceError(409, 'Selesaikan klaim hadiah sebelum mereset poin.');
  await publish(db, uid, result.snapshot.val());
  return { success: true };
}

async function syncPoints(db, actor, input = {}) {
  const profile = await requireMember(db, actor);
  const uid = requireId(input.userId || actor, 'User ID');
  if (uid !== actor) throw new ServiceError(403, 'Saldo bukan milik Anda.');
  const [loansSnap, reviewsSnap] = await Promise.all([
    db.ref('peminjaman').orderByChild('userId').equalTo(uid).get(),
    db.ref('ulasan').orderByChild('userId').equalTo(uid).get(),
  ]);
  const awards = {}, borrowedBooks = new Set();
  for (const [id, loan] of Object.entries(loansSnap.val() || {})) {
    if (!['Menunggu Pengambilan', 'Dipinjam', 'Terlambat', 'Dikembalikan', 'Kadaluarsa'].includes(loan.status)) continue;
    borrowedBooks.add(loan.bookId);
    // Reborrowing one book cannot be used to farm redeemable points.
    awards[`borrow_${loan.bookId}`] = 10;
    if (loan.status === 'Dikembalikan') awards[`return_${loan.bookId}`] = 5;
  }
  for (const review of Object.values(reviewsSnap.val() || {})) {
    if (borrowedBooks.has(review.bookId)) awards[`review_${review.bookId}`] = 15;
  }
  const result = await db.ref(`point_wallets/${uid}`).transaction(current => {
    const wallet = current || { totalPoints: 0, awards: {} };
    wallet.awards ||= {};
    for (const [key, amount] of Object.entries(awards)) if (!wallet.awards[key]) {
      wallet.awards[key] = amount;
      wallet.totalPoints += amount;
    }
    return { ...wallet, revision: (wallet.revision || 0) + 1 };
  });
  await publish(db, uid, result.snapshot.val());
  return { totalPoints: result.snapshot.val().totalPoints, name: profile.nama };
}

async function claimDaily(db, uid) {
  await requireMember(db, uid);
  const day = wibDate();
  const result = await db.ref(`point_wallets/${uid}`).transaction(current => {
    const wallet = current || { totalPoints: 0, awards: {} };
    if (wallet.lastDailyClaim === day) return;
    return { ...wallet, totalPoints: wallet.totalPoints + 15, lastDailyClaim: day, revision: (wallet.revision || 0) + 1 };
  });
  if (!result.committed) return { success: false, alreadyClaimed: true, pointsAwarded: 0 };
  await publish(db, uid, result.snapshot.val());
  return { success: true, alreadyClaimed: false, pointsAwarded: 15 };
}

async function spendPoints(db, uid, amount) {
  await requireMember(db, uid);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new ServiceError(400, 'Jumlah poin tidak valid.');
  const walletRef = db.ref(`point_wallets/${uid}`);
  await walletRef.get();
  const result = await walletRef.transaction(wallet => {
    if (!wallet) return null;
    if (wallet.totalPoints < amount) return;
    return { ...wallet, totalPoints: wallet.totalPoints - amount, revision: (wallet.revision || 0) + 1 };
  });
  if (!result.committed || !result.snapshot.val()) throw new ServiceError(409, 'Poin tidak cukup.');
  await publish(db, uid, result.snapshot.val());
  return { totalPoints: result.snapshot.val().totalPoints };
}

async function redeemReward(db, uid, input) {
  const profile = await requireMember(db, uid);
  const rewardId = requireId(input.rewardId, 'Hadiah');
  const reward = (await db.ref(`rewards/${rewardId}`).get()).val();
  if (!reward?.isActive || !Number.isSafeInteger(reward.pointsCost) || reward.pointsCost <= 0) throw new ServiceError(400, 'Hadiah tidak tersedia.');
  await syncPoints(db, uid);
  const id = db.ref('reward_redemptions').push().key;
  const walletRef = db.ref(`point_wallets/${uid}`);
  const debit = await walletRef.transaction(wallet => {
    if (!wallet) return null;
    if (wallet.totalPoints < reward.pointsCost || wallet.pendingRedemption) return;
    return { ...wallet, totalPoints: wallet.totalPoints - reward.pointsCost, revision: (wallet.revision || 0) + 1,
      pendingRedemption: { id, rewardId, cost: reward.pointsCost, createdAt: Date.now() } };
  });
  if (!debit.committed || !debit.snapshot.val()) throw new ServiceError(409, 'Poin tidak cukup atau klaim sedang diproses.');
  let reserved = false;
  try {
    const stockRef = db.ref(`rewards/${rewardId}/stock`);
    await stockRef.get();
    const stock = await stockRef.transaction(value => value === null ? null : Number.isInteger(value) && value > 0 ? value - 1 : undefined);
    if (!stock.committed || stock.snapshot.val() === null) throw new ServiceError(409, 'Stok hadiah habis.');
    reserved = true;
    await db.ref(`reward_redemptions/${id}`).set({ userId: uid, userName: profile.nama, rewardId,
      rewardTitle: reward.title, pointsSpent: reward.pointsCost, status: 'pending', redeemedAt: Date.now() });
  } catch (error) {
    if (reserved) await db.ref(`rewards/${rewardId}/stock`).transaction(value => Number(value || 0) + 1);
    await walletRef.transaction(wallet => {
      if (!wallet) return null;
      if (wallet?.pendingRedemption?.id !== id) return;
      const { pendingRedemption, ...rest } = wallet;
      return { ...rest, totalPoints: wallet.totalPoints + pendingRedemption.cost, revision: (wallet.revision || 0) + 1 };
    });
    throw error;
  }
  const committed = await walletRef.transaction(wallet => {
    if (!wallet) return null;
    if (wallet.pendingRedemption?.id !== id) return;
    const { pendingRedemption, ...rest } = wallet;
    return { ...rest, revision: (wallet.revision || 0) + 1, redemptions: { ...wallet.redemptions, [id]: { cost: pendingRedemption.cost, rewardId } } };
  });
  if (!committed.committed || !committed.snapshot.val()) throw new ServiceError(503, 'Klaim sudah tercatat; saldo perlu direkonsiliasi petugas.');
  await publish(db, uid, committed.snapshot.val());
  return { id };
}

async function processRedemption(db, actorId, input) {
  await requireMember(db, actorId, true);
  const id = requireId(input.redemptionId, 'Klaim hadiah');
  if (!['approved', 'rejected', 'fulfilled'].includes(input.status)) throw new ServiceError(400, 'Status tidak valid.');
  const recordRef = db.ref(`reward_redemptions/${id}`);
  const record = (await recordRef.get()).val();
  if (!record) throw new ServiceError(404, 'Klaim hadiah tidak ditemukan.');
  if ((record.status === 'rejected') !== (input.status === 'rejected') && record.status !== 'pending') {
    throw new ServiceError(409, 'Klaim sudah diproses dengan status lain.');
  }
  const reward = input.status === 'rejected' ? null : (await db.ref(`rewards/${record.rewardId}`).get()).val();
  const loans = reward?.type === 'extended_deadline'
    ? (await db.ref('peminjaman').orderByChild('userId').equalTo(record.userId).get()).val() || {} : {};
  const targets = Object.fromEntries(Object.entries(loans).filter(([, loan]) =>
    record.status === 'pending' ? loan.status === 'Dipinjam' : loan.rewardExtensions?.[id]).map(([borrowId]) => [borrowId, true]));
  const operation = await db.ref(`redemption_actions/${id}`).transaction(value => {
    if (value && (value.status === 'rejected') !== (input.status === 'rejected')) return value;
    const selected = value?.targetsSelected ? value : { ...value, targetLoans: targets,
      targetsSelected: true, extensionDays: reward?.type === 'extended_deadline' ? 7 : 0 };
    return { ...selected, status: value?.status === 'fulfilled' ? 'fulfilled' : input.status,
      actorId: value?.actorId || actorId, approvedAt: value?.approvedAt || Date.now() };
  });
  const action = operation.snapshot.val();
  if (!action || (action.status === 'rejected') !== (input.status === 'rejected')) throw new ServiceError(409, 'Klaim sudah diproses dengan status lain.');
  if (input.status === 'rejected') {
    const wallet = await db.ref(`point_wallets/${record.userId}`).transaction(current => {
      if (!current) return null;
      const debit = current.redemptions?.[id];
      if (!debit || debit.refunded) return current;
      current.redemptions[id].refunded = true;
      current.totalPoints += debit.cost;
      current.revision = (current.revision || 0) + 1;
      return current;
    });
    if (!wallet.snapshot.val()?.redemptions?.[id]?.refunded) throw new ServiceError(409, 'Saldo klaim tidak ditemukan.');
    await publish(db, record.userId, wallet.snapshot.val());
    await db.ref(`reward_stock_refunds/${id}`).transaction(value => value || { rewardId: record.rewardId });
    // Recompute stock refunds in a transaction on the reward itself so retries cannot add stock twice.
    await db.ref(`rewards/${record.rewardId}`).transaction(reward => {
      if (!reward) return null;
      if (reward.refunds?.[id]) return reward;
      return { ...reward, stock: Number(reward.stock || 0) + 1, refunds: { ...reward.refunds, [id]: true } };
    });
  }
  if (action.extensionDays > 0 && action.status !== 'rejected') {
    // The first approval fixes eligible loans; fulfillment and retries cannot add later loans.
    for (const borrowId of Object.keys(action.targetLoans || {})) await db.ref(`peminjaman/${borrowId}`).transaction(loan => {
      if (!loan) return null;
      if (loan.userId !== record.userId || loan.status !== 'Dipinjam' || loan.rewardExtensions?.[id]) return loan;
      return { ...loan, batasKembali: new Date(Date.parse(loan.batasKembali) + action.extensionDays * 86400000).toISOString().slice(0, 10),
        rewardExtensions: { ...loan.rewardExtensions, [id]: true } };
    });
    for (const borrowId of Object.keys(action.targetLoans || {})) {
      const loan = (await db.ref(`peminjaman/${borrowId}`).get()).val();
      if (loan?.bookType === 'digital' && loan.status === 'Dipinjam') await db.ref(`book_status/${loan.bookId}`).transaction(status => {
        if (!status) return null;
        if (status.status !== 'Dipinjam') return;
        return { ...status, availableAfter: availableAfter(loan.batasKembali) };
      });
    }
  }
  const finished = await recordRef.transaction(current => {
    if (!current) return null;
    const rank = { pending: 0, approved: 1, fulfilled: 2 };
    if (current.status === 'rejected') return action.status === 'rejected' ? current : undefined;
    if (action.status === 'rejected') return current.status === 'pending'
      ? { ...current, status: 'rejected', processedBy: actorId, processedAt: Date.now() } : undefined;
    if (rank[current.status] === undefined) return;
    if (rank[current.status] >= rank[action.status]) return current;
    return { ...current, status: action.status, processedBy: actorId, processedAt: Date.now() };
  });
  if (!finished.committed || !finished.snapshot.val()) throw new ServiceError(409, 'Klaim sudah diproses dengan status lain.');
  return { success: true };
}
const protect = operation => (db, uid, ...args) => withMemberAction(db, uid, () => operation(db, uid, ...args));
module.exports = { syncPoints: protect(syncPoints), claimDaily: protect(claimDaily), spendPoints: protect(spendPoints), resetProgress: protect(resetProgress),
  redeemReward: protect(redeemReward), processRedemption: async (db, actor, input) => {
    const id = requireId(input?.redemptionId, 'Klaim hadiah');
    const record = (await db.ref(`reward_redemptions/${id}`).get()).val();
    return withMemberAction(db, record ? [actor, record.userId] : actor, () => processRedemption(db, actor, input));
  }, level };
