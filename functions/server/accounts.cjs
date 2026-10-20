const { ServiceError, requireMember } = require('./errors.cjs');
const crypto = require('node:crypto');
const { closeMemberActions, reopenMemberActions } = require('./member-actions.cjs');

async function finishDeletion(db, auth, uid, deletePhoto = async () => {}) {
  const request = (await db.ref(`account_deletions/${uid}`).get()).val();
  if (!request || request.status === 'done') return;
  try {
    await auth.updateUser(uid, { disabled: true });
    await auth.revokeRefreshTokens(uid);
  } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  await deletePhoto(db, uid);
  const anonymousId = `deleted_${crypto.createHash('sha256').update(uid).digest('hex').slice(0, 24)}`;
  const updates = {};
  const personal = ['anggota', 'public_profiles', 'user_points', 'point_wallets', 'user_likes_count', 'profile_like_counts', 'reading_goals', 'reading_notes', 'user_quests', 'user_stamps',
    'pencapaian', 'online', 'typing', 'notifikasi', 'user_saved_quotes', 'user_active_borrows', 'payment_intents'];
  for (const node of personal) updates[`${node}/${uid}`] = null;
  const likeDays = (await db.ref('profile_like_claims').get()).val() || {};
  for (const [day, senders] of Object.entries(likeDays)) for (const [sender, claim] of Object.entries(senders)) {
    if (sender === uid) updates[`profile_like_claims/${day}/${sender}`] = null;
    else if (claim.targets?.[uid]) updates[`profile_like_claims/${day}/${sender}/targets/${uid}`] = null;
  }
  const collections = ['daftar_hadir', 'ulasan', 'favorit_buku', 'wishlists', 'club_members', 'aktivitas',
    'user_challenges', 'user_event_progress', 'book_reservations', 'availability_subscriptions', 'book_discussions'];
  for (const node of collections) {
    const records = (await db.ref(node).orderByChild('userId').equalTo(uid).get()).val() || {};
    for (const id of Object.keys(records)) updates[`${node}/${id}`] = null;
  }
  // Keep financial/circulation records for reconciliation while removing the member identity.
  for (const node of ['peminjaman', 'payment_orders', 'reward_redemptions']) {
    const records = (await db.ref(node).orderByChild('userId').equalTo(uid).get()).val() || {};
    for (const id of Object.keys(records)) {
      updates[`${node}/${id}/userId`] = anonymousId;
      if (node !== 'payment_orders') updates[`${node}/${id}/userName`] = 'Akun dihapus';
    }
  }
  const usernames = (await db.ref('usernames').get()).val() || {};
  for (const [name, value] of Object.entries(usernames)) if (value === uid || value?.uid === uid) updates[`usernames/${name}`] = null;
  // Existing chat data is nested by room, so it needs an explicit cleanup rather than a flat userId query.
  for (const node of ['pesan', 'pertemanan', 'komunitas_post', 'komunitas_balasan', 'club_messages']) {
    const records = (await db.ref(node).get()).val() || {};
    for (const [id, value] of Object.entries(records)) {
      if (value?.userId === uid || value?.senderId === uid || value?.receiverId === uid || value?.fromUserId === uid || value?.toUserId === uid) updates[`${node}/${id}`] = null;
      else for (const [childId, child] of Object.entries(value || {})) {
        if (child?.userId === uid || child?.senderId === uid || child?.receiverId === uid || child?.fromUserId === uid || child?.toUserId === uid) updates[`${node}/${id}/${childId}`] = null;
      }
    }
  }
  const lists = (await db.ref('reading_lists').orderByChild('createdBy').equalTo(uid).get()).val() || {};
  for (const id of Object.keys(lists)) updates[`reading_lists/${id}`] = null;
  const posts = (await db.ref('komunitas_post').orderByChild('userId').equalTo(uid).get()).val() || {};
  for (const id of Object.keys(posts)) updates[`komunitas_balasan/${id}`] = null;
  const clubs = (await db.ref('book_clubs').orderByChild('createdBy').equalTo(uid).get()).val() || {};
  for (const id of Object.keys(clubs)) updates[`book_clubs/${id}/createdBy`] = 'system';
  // A deleted parent already removes its children; RTDB rejects overlapping update paths.
  const paths = Object.keys(updates).sort((a, b) => a.length - b.length);
  const compact = {};
  for (const item of paths) if (!Object.keys(compact).some(parent => item.startsWith(parent + '/'))) compact[item] = updates[item];
  await db.ref().update(compact);
  try { await auth.deleteUser(uid); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  await db.ref(`account_deletions/${uid}`).set({ status: 'done', requestedAt: request.requestedAt, completedAt: Date.now() });
}

async function deleteAccount(db, auth, uid, cleanup = finishDeletion) {
  const member = await requireMember(db, uid);
  if (['admin', 'librarian'].includes(member.role)) throw new ServiceError(409, 'Alihkan peran petugas sebelum menghapus akun.');
  await closeMemberActions(db, uid);
  let queued = false;
  try {
  const loans = (await db.ref('peminjaman').orderByChild('userId').equalTo(uid).get()).val() || {};
  if (Object.values(loans).some(loan => ['Menunggu Pengambilan', 'Dipinjam', 'Terlambat'].includes(loan.status) || (loan.denda > 0 && !['lunas', 'waived'].includes(loan.dendaStatus)))) {
    throw new ServiceError(409, 'Selesaikan peminjaman dan denda sebelum menghapus akun.');
  }
  const orders = (await db.ref('payment_orders').orderByChild('userId').equalTo(uid).get()).val() || {};
  if (Object.values(orders).some(order => ['creating', 'pending'].includes(order.status))) throw new ServiceError(409, 'Selesaikan transaksi pembayaran sebelum menghapus akun.');
  const claims = (await db.ref('reward_redemptions').orderByChild('userId').equalTo(uid).get()).val() || {};
  if (Object.values(claims).some(claim => ['pending', 'approved'].includes(claim.status))) throw new ServiceError(409, 'Selesaikan klaim hadiah sebelum menghapus akun.');
  await db.ref().update({ [`anggota/${uid}/status`]: 'deactivated', [`account_deletions/${uid}`]: { status: 'pending', requestedAt: Date.now() } });
  queued = true;
  try {
    await auth.updateUser(uid, { disabled: true });
    await auth.revokeRefreshTokens(uid);
    await cleanup(db, auth, uid);
    return { pending: false };
  } catch (error) {
    console.error('[account-deletion]', error.code || error.name);
    return { pending: true };
  }
  } catch (error) {
    if (!queued) await reopenMemberActions(db, uid);
    throw error;
  }
}

module.exports = { deleteAccount, finishDeletion };
