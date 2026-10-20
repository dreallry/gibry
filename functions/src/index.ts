import { setGlobalOptions } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onValueWritten } from 'firebase-functions/v2/database';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';

const payments = require('../server/payments.cjs');
const circulation = require('../server/circulation.cjs');
const points = require('../server/points.cjs');
const accounts = require('../server/accounts.cjs');
const social = require('../server/social.cjs');
const { requireMember, requireId, ServiceError } = require('../server/errors.cjs');
const { endpoint } = require('../server/http.cjs');
const { publicProfile } = require('../server/public-profiles.cjs');
const { publicBook } = require('../server/catalog.cjs');

initializeApp();
const db = getDatabase();
const serverKey = defineSecret('MIDTRANS_SERVER_KEY');
setGlobalOptions({ maxInstances: 10, region: 'asia-southeast1' });
const paymentOptions = { secrets: [serverKey] };

export const syncPublicProfile = onValueWritten('/anggota/{uid}', async event => {
  // Read current data so a retried, older event cannot restore a deleted profile.
  const profile = (await db.ref(`anggota/${event.params.uid}`).get()).val();
  await db.ref(`public_profiles/${event.params.uid}`).set(publicProfile(profile));
  if (event.data.before.exists() !== event.data.after.exists()) {
    const profiles = await db.ref('public_profiles').get();
    await db.ref('public_stats/members').set(profiles.numChildren());
  }
});

export const syncReplyCount = onValueWritten('/komunitas_balasan/{postId}/{replyId}', async event => {
  const replies = await db.ref(`komunitas_balasan/${event.params.postId}`).get();
  await db.ref(`komunitas_post/${event.params.postId}`).transaction(post => post ? { ...post, repliesCount: replies.numChildren() } : null);
});

export const syncClubCount = onValueWritten('/club_members/{memberId}', async event => {
  const clubIds = new Set([event.data.before.child('clubId').val(), event.data.after.child('clubId').val()]);
  for (const clubId of clubIds) {
    if (typeof clubId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(clubId)) continue;
    const members = (await db.ref('club_members').orderByChild('clubId').equalTo(clubId).get()).val() || {};
    const uniqueUsers = new Set(Object.values(members).map(member => (member as { userId: string }).userId));
    await db.ref(`book_clubs/${clubId}`).transaction(club => club ? { ...club, memberCount: uniqueUsers.size } : null);
  }
});

export const syncPublicBook = onValueWritten('/daftar_buku/{bookId}', async event => {
  const book = (await db.ref(`daftar_buku/${event.params.bookId}`).get()).val();
  await db.ref(`public_books/${event.params.bookId}`).set(publicBook(book));
});

function authenticated(request: { auth?: { uid: string; token: { email_verified?: boolean } } }): string {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Silakan login terlebih dahulu.');
  if (!request.auth.token.email_verified) throw new HttpsError('permission-denied', 'Email belum diverifikasi.');
  return request.auth.uid;
}

async function callable<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch (error) {
    if (error instanceof ServiceError) {
      const status = (error as Error & { status: number }).status;
      const code = status === 400 ? 'invalid-argument' : status === 403 ? 'permission-denied' :
        status === 404 ? 'not-found' : status === 409 ? 'failed-precondition' : 'unavailable';
      throw new HttpsError(code, (error as Error).message);
    }
    console.error('[Callable]', error instanceof Error ? error.name : 'UnknownError');
    throw new HttpsError('internal', 'Terjadi kesalahan server.');
  }
}

export const createSnapTransaction = onCall(paymentOptions, request =>
  callable(() => payments.createPayment(db, authenticated(request), request.data)));

export const processMidtransPayment = onCall(paymentOptions, request => callable(async () => {
  const uid = authenticated(request);
  const borrowId = requireId(request.data?.borrowId, 'Peminjaman');
  const borrow = (await db.ref(`peminjaman/${borrowId}`).get()).val();
  if (!borrow || borrow.userId !== uid) throw new ServiceError(403, 'Peminjaman bukan milik Anda.');
  return payments.confirmPayment(db, uid, borrow.midtransOrderId);
}));

const webhook = endpoint((database: unknown, uid: unknown, body: unknown) => payments.processNotification(database, body), { webhook: true });
export const midtransNotification = onRequest(paymentOptions, async (req, res) => { await webhook(req, res); });

const routes: Record<string, ReturnType<typeof endpoint>> = {
  'create-snap': endpoint((database: unknown, uid: string, body: unknown) => payments.createPayment(database, uid, body)),
  'confirm-payment': endpoint((database: unknown, uid: string, body: { orderId: string }) => payments.confirmPayment(database, uid, body.orderId)),
  'midtrans-webhook': webhook,
  'borrow-book': endpoint((database: unknown, uid: string, body: unknown) => circulation.borrowLoan(database, uid, body)),
  'borrow-books': endpoint((database: unknown, uid: string, body: unknown) => circulation.borrowLoans(database, uid, body)),
  'return-book': endpoint((database: unknown, uid: string, body: { borrowId: string }) => circulation.returnLoan(database, uid, body.borrowId)),
  'sync-points': endpoint((database: unknown, uid: string, body: unknown) => points.syncPoints(database, uid, body)),
  'claim-daily-xp': endpoint((database: unknown, uid: string) => points.claimDaily(database, uid)),
  'spend-points': endpoint((database: unknown, uid: string, body: { amount: number }) => points.spendPoints(database, uid, body.amount)),
  'redeem-reward': endpoint((database: unknown, uid: string, body: unknown) => points.redeemReward(database, uid, body)),
  'process-redemption': endpoint((database: unknown, uid: string, body: unknown) => points.processRedemption(database, uid, body)),
  'delete-account': endpoint((database: unknown, uid: string) => accounts.deleteAccount(database, getAuth(), uid), { recentAuth: true }),
  'give-like': endpoint((database: unknown, uid: string, body: unknown) => social.giveLike(database, uid, body)),
};
export const libraryApi = onRequest(paymentOptions, async (req, res) => {
  const handler = routes[req.path.replace(/^\/api\//, '').replace(/^\//, '')];
  if (!handler) { res.status(404).json({ error: 'Endpoint tidak ditemukan.' }); return; }
  await handler(req, res);
});

export const adminBanUser = onCall(request => callable(async () => {
  const uid = authenticated(request);
  await requireMember(db, uid, true);
  const userId = requireId(request.data?.userId, 'User ID');
  const target = (await db.ref(`anggota/${userId}`).get()).val();
  const actor = await requireMember(db, uid, true);
  if (target?.role === 'admin' && actor.role !== 'admin') throw new ServiceError(403, 'Hanya admin dapat memoderasi admin.');
  const reason = request.data?.reason;
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 300) throw new ServiceError(400, 'Alasan tidak valid.');
  await db.ref(`anggota/${userId}`).update({ banned: true, banReason: reason.trim() });
  await db.ref('user_bans').push({ userId, reason, bannedBy: uid, bannedAt: Date.now() });
  return { success: true };
}));

export const adminUnbanUser = onCall(request => callable(async () => {
  const actor = await requireMember(db, authenticated(request), true);
  const userId = requireId(request.data?.userId, 'User ID');
  const target = (await db.ref(`anggota/${userId}`).get()).val();
  if (target?.role === 'admin' && actor.role !== 'admin') throw new ServiceError(403, 'Hanya admin dapat memoderasi admin.');
  await db.ref(`anggota/${userId}`).update({ banned: false, banReason: null });
  return { success: true };
}));

export const adminUpdateUserRole = onCall(request => callable(async () => {
  await requireMember(db, authenticated(request), true, true);
  const userId = requireId(request.data?.userId, 'User ID');
  const role = request.data?.role;
  if (!['admin', 'librarian', 'viewer', 'user'].includes(role)) throw new ServiceError(400, 'Role tidak valid.');
  await db.ref(`anggota/${userId}`).update({ role });
  return { success: true };
}));

export const adminWaiveFine = onCall(request => callable(async () => {
  await requireMember(db, authenticated(request), true);
  const borrowId = requireId(request.data?.borrowId, 'Peminjaman');
  const reason = request.data?.reason;
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 300) throw new ServiceError(400, 'Alasan tidak valid.');
  const borrow = (await db.ref(`peminjaman/${borrowId}`).get()).val();
  if (!borrow) throw new ServiceError(404, 'Peminjaman tidak ditemukan.');
  await db.ref(`peminjaman/${borrowId}`).update({ dendaStatus: 'waived', dendaWaivedReason: reason.trim() });
  await circulation.notify(db, borrow.userId, { type: 'return', title: 'Denda Dibebaskan', body: `Denda dibebaskan petugas: ${reason.trim()}` });
  return { success: true };
}));

export const checkOverdueBooks = onSchedule({ schedule: '0 8 * * *', timeZone: 'Asia/Jakarta' }, async () => {
  const snapshot = await db.ref('peminjaman').orderByChild('status').equalTo('Dipinjam').get();
  const today = circulation.wibDate();
  for (const [id, value] of Object.entries(snapshot.val() || {})) {
    const loan = value as { batasKembali: string; bookType: string };
    if (today <= loan.batasKembali) continue;
    if (loan.bookType === 'fisik') await db.ref(`peminjaman/${id}`).transaction(current => {
      if (!current) return null;
      return current.status === 'Dipinjam' && current.batasKembali < today ? { ...current, status: 'Terlambat' } : current;
    });
    else await circulation.returnLoan(db, null, id);
  }
});

export const cleanupExpiredReservations = onSchedule('0 * * * *', async () => {
  const snapshot = await db.ref('book_reservations').orderByChild('status').equalTo('waiting').get();
  const changes: Record<string, unknown> = {};
  for (const [id, value] of Object.entries(snapshot.val() || {})) {
    const reservation = value as { expiresAt?: number };
    if (reservation.expiresAt && reservation.expiresAt < Date.now()) changes[`book_reservations/${id}/status`] = 'expired';
  }
  if (Object.keys(changes).length) await db.ref().update(changes);
});

export const reconcilePayments = onSchedule({ schedule: 'every 5 minutes', timeZone: 'Asia/Jakarta', secrets: [serverKey], timeoutSeconds: 120 }, async () => {
  const result = await payments.reconcilePendingPayments(db);
  console.info('[PaymentReconciliation]', result);
});

export const retryAccountDeletions = onSchedule('15 * * * *', async () => {
  const requests = (await db.ref('account_deletions').orderByChild('status').equalTo('pending').limitToFirst(100).get()).val() || {};
  for (const uid of Object.keys(requests)) {
    try {
      await getAuth().updateUser(uid, { disabled: true });
      await getAuth().revokeRefreshTokens(uid);
    } catch (error) { if ((error as { code?: string }).code !== 'auth/user-not-found') throw error; }
    await accounts.finishDeletion(db, getAuth(), uid);
  }
});

export const sendAnnouncement = onCall(request => callable(async () => {
  const uid = authenticated(request);
  await requireMember(db, uid, true);
  const { title, body } = request.data || {};
  if (typeof title !== 'string' || !title.trim() || title.length > 200 || typeof body !== 'string' || !body.trim() || body.length > 300) {
    throw new ServiceError(400, 'Judul atau isi tidak valid.');
  }
  await db.ref('announcements').push({ title, body, createdBy: uid, createdAt: Date.now() });
  const users = (await db.ref('anggota').get()).val() || {};
  for (const [userId, value] of Object.entries(users)) {
    const user = value as { role?: string; banned?: boolean };
    if (!user.banned && !['admin', 'librarian'].includes(user.role || '')) await circulation.notify(db, userId, { type: 'system', title, body });
  }
  return { success: true };
}));
