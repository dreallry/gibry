require('dotenv').config({ quiet: true });
const { initializeApp, cert, applicationDefault, deleteApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { publicProfile } = require('../functions/server/public-profiles.cjs');
const { publicBook } = require('../functions/server/catalog.cjs');
const { level } = require('../functions/server/points.cjs');
const { availableAfter } = require('../functions/server/circulation.cjs');

async function planMigration(db, pointsPolicy) {
  const paths = ['anggota', 'user_points', 'point_wallets', 'peminjaman', 'ulasan', 'reward_redemptions', 'payment_orders', 'book_discussions', 'daftar_buku', 'book_locks', 'user_active_borrows'];
  const entries = await Promise.all(paths.map(async node => [node, (await db.ref(node).get()).val() || {}]));
  const data = Object.fromEntries(entries), updates = {}, conflicts = [];
  let missingWallets = 0;
  for (const [uid, profile] of Object.entries(data.anggota)) {
    const wallet = data.point_wallets[uid];
    const oldBalance = data.user_points[uid]?.totalPoints ?? profile.totalPoints ?? 0;
    if (!Number.isSafeInteger(oldBalance) || oldBalance < 0 || oldBalance > 1000000000) {
      conflicts.push(`Saldo anggota ${uid} tidak valid; tinjau sebelum migrasi.`);
      continue;
    }
    const balance = wallet?.totalPoints ?? (pointsPolicy === 'reset' ? 0 : oldBalance);
    updates[`public_profiles/${uid}`] = publicProfile({ ...profile, totalPoints: balance, level: level(balance) });
    if (!wallet) {
      missingWallets++;
      if (pointsPolicy) {
        const awards = {}, borrowed = new Set(), redemptions = {};
        if (pointsPolicy === 'reviewed') for (const record of Object.values(data.peminjaman)) {
          if (record.userId !== uid || !['Menunggu Pengambilan', 'Dipinjam', 'Terlambat', 'Dikembalikan', 'Kadaluarsa'].includes(record.status)) continue;
          borrowed.add(record.bookId);
          awards[`borrow_${record.bookId}`] = 10;
          if (record.status === 'Dikembalikan') awards[`return_${record.bookId}`] = 5;
        }
        if (pointsPolicy === 'reviewed') {
          for (const review of Object.values(data.ulasan)) if (review.userId === uid && borrowed.has(review.bookId)) awards[`review_${review.bookId}`] = 15;
          for (const [id, claim] of Object.entries(data.reward_redemptions)) if (claim.userId === uid && ['pending', 'approved'].includes(claim.status)) {
            if (!Number.isSafeInteger(claim.pointsSpent) || claim.pointsSpent <= 0) conflicts.push(`Biaya klaim ${id} tidak valid.`);
            else redemptions[id] = { cost: claim.pointsSpent, rewardId: claim.rewardId };
          }
        }
        if (pointsPolicy === 'reset' && Object.values(data.reward_redemptions).some(claim => claim.userId === uid && ['pending', 'approved'].includes(claim.status))) conflicts.push(`Selesaikan klaim hadiah anggota ${uid} sebelum mereset saldo.`);
        const lastDailyClaim = data.user_points[uid]?.lastDailyClaim || profile.lastClaimedDailyXPDate;
        updates[`point_wallets/${uid}`] = { totalPoints: balance, awards, redemptions, revision: 1, migratedAt: Date.now(), ...(pointsPolicy === 'reviewed' && lastDailyClaim ? { lastDailyClaim } : {}) };
        updates[`user_points/${uid}`] = { totalPoints: balance, level: level(balance), revision: 1, updatedAt: Date.now() };
        updates[`anggota/${uid}/totalPoints`] = balance;
        updates[`anggota/${uid}/level`] = level(balance);
        updates[`anggota/${uid}/walletRevision`] = 1;
      }
    }
  }
  for (const [id, book] of Object.entries(data.daftar_buku)) updates[`public_books/${id}`] = publicBook(book);
  for (const [id, order] of Object.entries(data.payment_orders)) if (['creating', 'pending'].includes(order.status) || (order.status === 'paid' && order.kind === 'rental' && !data.peminjaman[id])) {
    if (!order.reconcileAt) updates[`payment_orders/${id}/reconcileAt`] = Date.now();
  }
  updates['public_stats/members'] = Object.keys(data.anggota).length;
  for (const [id, discussion] of Object.entries(data.book_discussions)) if (Array.isArray(discussion.likedBy)) {
    updates[`book_discussions/${id}/likedBy`] = Object.fromEntries(discussion.likedBy.filter(uid => typeof uid === 'string').map(uid => [uid, true]));
  }
  const owners = {}, activeByUser = {};
  for (const [id, loan] of Object.entries(data.peminjaman)) {
    if (!['Menunggu Pengambilan', 'Dipinjam', 'Terlambat'].includes(loan.status)) continue;
    if (owners[loan.bookId] && owners[loan.bookId] !== id) conflicts.push(`Buku ${loan.bookId} memiliki beberapa peminjaman aktif.`);
    owners[loan.bookId] = id;
    activeByUser[loan.userId] ||= { ...(data.user_active_borrows[loan.userId]?.active || {}) };
    activeByUser[loan.userId][id] = { bookId: loan.bookId, reservedAt: loan.createdAt || Date.now() };
    const lock = data.book_locks[loan.bookId];
    if (lock && lock.borrowId !== id) conflicts.push(`Kunci buku ${loan.bookId} tidak cocok dengan peminjaman aktif.`);
    else updates[`book_locks/${loan.bookId}`] = { borrowId: id, userId: loan.userId };
    updates[`book_status/${loan.bookId}`] = { status: 'Dipinjam', updatedAt: Date.now(), ...(loan.bookType !== 'fisik' ? { availableAfter: availableAfter(loan.batasKembali) } : {}) };
  }
  for (const [uid, active] of Object.entries(activeByUser)) updates[`user_active_borrows/${uid}`] = { active, count: Object.keys(active).length };
  return { updates, conflicts, missingWallets, members: Object.keys(data.anggota).length, books: Object.keys(data.daftar_buku).length };
}

async function main() {
  const args = process.argv.slice(2);
  const option = name => args.find(arg => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
  const projectId = option('project');
  if (!projectId) throw Error('Tuliskan --project=ID_PROYEK agar tujuan migrasi jelas.');
  const pointsPolicy = option('points');
  if (pointsPolicy && !['reviewed', 'reset'].includes(pointsPolicy)) throw Error('Pilih --points=reviewed atau --points=reset.');
  const emulator = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  if (emulator && (!/^127\.0\.0\.1:\d+$/.test(emulator) || projectId !== 'demo-digipus')) throw Error('Pengujian migrasi hanya di emulator demo-digipus.');
  const databaseURL = emulator ? 'https://demo-digipus.firebaseio.com' : process.env.FIREBASE_DATABASE_URL;
  if (!databaseURL || (!emulator && !new URL(databaseURL).hostname.startsWith(projectId + '-default-rtdb.') && new URL(databaseURL).hostname !== projectId + '.firebaseio.com')) throw Error('FIREBASE_DATABASE_URL tidak cocok dengan proyek tujuan.');
  const credential = process.env.FIREBASE_SERVICE_ACCOUNT ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) : applicationDefault();
  const app = initializeApp({ projectId, databaseURL, ...(emulator ? {} : { credential }) }, 'migration');
  try {
    const plan = await planMigration(getDatabase(app), pointsPolicy);
    console.log(JSON.stringify({ mode: args.includes('--apply') ? 'apply' : 'dry-run', members: plan.members, books: plan.books, missingWallets: plan.missingWallets, changes: Object.keys(plan.updates).length, conflicts: plan.conflicts }, null, 2));
    if (!args.includes('--apply')) return;
    if (!args.includes('--maintenance')) throw Error('Hentikan penulisan aplikasi, backup database, lalu gunakan --maintenance.');
    if (plan.conflicts.length) throw Error('Selesaikan konflik data sebelum migrasi.');
    if (plan.missingWallets && !pointsPolicy) throw Error('Tinjau saldo lama lalu pilih kebijakan --points=reviewed atau --points=reset.');
    await getDatabase(app).ref().update(plan.updates);
    console.log('Migrasi selesai.');
  } finally { await deleteApp(app); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { planMigration };
