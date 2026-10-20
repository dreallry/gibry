const { timingSafeEqual } = require('node:crypto');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const { adminApp } = require('./http.cjs');
const circulation = require('./circulation.cjs');
const payments = require('./payments.cjs');
const accounts = require('./accounts.cjs');
const { updateMemberCount } = require('./projections.cjs');

async function runMaintenance(db, auth, now = Date.now()) {
  const deadline = Date.now() + 25000;
  const summary = { loans: 0, reservations: 0, deletions: 0 };
  const loans = (await db.ref('peminjaman').orderByChild('status').equalTo('Dipinjam').get()).val() || {};
  const today = circulation.wibDate(now);
  for (const [id, loan] of Object.entries(loans)) {
    if (Date.now() >= deadline) break;
    if (today <= loan.batasKembali) continue;
    if (loan.bookType === 'fisik') await db.ref(`peminjaman/${id}`).transaction(current => {
      if (!current) return null;
      if (current.status !== 'Dipinjam' || current.batasKembali >= today) return;
      return { ...current, status: 'Terlambat' };
    });
    else await circulation.returnLoan(db, null, id, now);
    summary.loans++;
  }
  const reservations = (await db.ref('book_reservations').orderByChild('status').equalTo('waiting').get()).val() || {};
  for (const [id, reservation] of Object.entries(reservations)) {
    if (Date.now() >= deadline) break;
    if (reservation.expiresAt && reservation.expiresAt < now) {
      await db.ref(`book_reservations/${id}`).transaction(current => {
        if (!current) return null;
        if (current.status !== 'waiting' || current.expiresAt >= now) return;
        return { ...current, status: 'expired' };
      });
      summary.reservations++;
    }
  }
  const pending = (await db.ref('account_deletions').orderByChild('status').equalTo('pending').limitToFirst(10).get()).val() || {};
  for (const uid of Object.keys(pending)) {
    if (Date.now() >= deadline) break;
    try { await accounts.finishDeletion(db, auth, uid); summary.deletions++; }
    catch (error) { console.error('[maintenance] Penghapusan akan diulang:', error.code || error.name); }
  }
  await updateMemberCount(db);
  if (process.env.MIDTRANS_SERVER_KEY) summary.payments = await payments.reconcilePendingPayments(db, fetch, now, 20000);
  return summary;
}

async function maintenance(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ''}`);
  const actual = Buffer.from(req.headers.authorization || '');
  if (!process.env.CRON_SECRET || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return res.status(401).json({ error: 'Cron tidak diizinkan.' });
  try {
    const app = adminApp();
    return res.status(200).json(await runMaintenance(getDatabase(app), getAuth(app)));
  } catch (error) {
    console.error('[maintenance]', error.code || error.name);
    return res.status(error.status || 500).json({ error: 'Pemeliharaan belum selesai; periksa konfigurasi dan log server.' });
  }
}

module.exports = { maintenance, runMaintenance };
