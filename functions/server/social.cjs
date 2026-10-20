const crypto = require('node:crypto');
const { ServiceError, requireId, requireMember } = require('./errors.cjs');
const { wibDate } = require('./circulation.cjs');
const { withMemberAction } = require('./member-actions.cjs');

async function giveLike(db, actor, input) {
  const sender = await requireMember(db, actor);
  const target = requireId(input?.targetUserId, 'Penerima like');
  if (actor === target) throw new ServiceError(400, 'Anda tidak bisa menyukai profil sendiri.');
  await requireMember(db, target);
  const day = wibDate();
  const claim = await db.ref(`profile_like_claims/${day}/${actor}`).transaction(current => {
    const targets = current?.targets || {};
    if (targets[target]) return;
    if (Object.keys(targets).length >= 10) return;
    return { ...current, targets: { ...targets, [target]: true } };
  });
  if (!claim.snapshot.val()?.targets?.[target]) throw new ServiceError(409, 'Batas 10 like harian telah tercapai. Coba lagi besok!');

  // A persisted proof lets a retry finish a partially completed request without counting it twice.
  const proof = crypto.createHash('sha256').update(`${day}:${actor}`).digest('hex');
  const publicCounter = db.ref(`user_likes_count/${target}`);
  const legacy = (await publicCounter.get()).val();
  const oldCount = typeof legacy === 'number' ? legacy : legacy?.count || 0;
  const baseline = Number.isSafeInteger(oldCount) && oldCount >= 0 ? oldCount : 0;
  const counter = await db.ref(`profile_like_counts/${target}`).transaction(current => {
    const count = current?.count ?? baseline;
    const awards = current?.awards || {};
    if (awards[proof]) return current;
    if (!Number.isSafeInteger(count) || count < 0 || count === Number.MAX_SAFE_INTEGER) return;
    return { count: count + 1, awards: { ...awards, [proof]: true }, updatedAt: Date.now() };
  });
  if (!counter.snapshot.val()?.awards?.[proof]) throw new ServiceError(409, 'Jumlah like belum dapat diperbarui. Silakan coba kembali.');
  const newLikes = counter.snapshot.val().count;
  await publicCounter.transaction(current => {
    const count = typeof current === 'number' ? current : current?.count;
    const prior = Number.isSafeInteger(count) && count >= 0 ? count : 0;
    return { count: Math.max(prior, newLikes), updatedAt: Date.now() };
  });
  const message = `${sender.nama || 'Seorang pembaca'} menyukai profil membaca Anda.`.slice(0, 300);
  await db.ref(`notifikasi/${target}/like_${proof}`).transaction(current => current || {
    userId: target, fromUserId: actor, type: 'like', title: 'Like Diterima!',
    message, body: message, link: '/leaderboard', read: false, createdAt: Date.now(),
  });
  return { success: claim.committed, newLikes };
}

module.exports = { giveLike: (db, actor, input) => withMemberAction(db, [actor, requireId(input?.targetUserId, 'Penerima like')], () => giveLike(db, actor, input)) };
