const { getAuth } = require('firebase-admin/auth');
const { endpoint } = require('../functions/server/http.cjs');
const payments = require('../functions/server/payments.cjs');
const circulation = require('../functions/server/circulation.cjs');
const points = require('../functions/server/points.cjs');
const accounts = require('../functions/server/accounts.cjs');
const social = require('../functions/server/social.cjs');
const operations = require('../functions/server/operations.cjs');
const { syncProfile } = require('../functions/server/projections.cjs');
const { maintenance } = require('../functions/server/maintenance.cjs');

const routes = new Map([
  ['create-snap', endpoint((db, uid, body) => payments.createPayment(db, uid, body))],
  ['confirm-payment', endpoint((db, uid, body) => payments.confirmPayment(db, uid, body.orderId))],
  ['midtrans-webhook', endpoint((db, uid, body) => payments.processNotification(db, body), { webhook: true })],
  ['borrow-book', endpoint(circulation.borrowLoan)],
  ['borrow-books', endpoint(circulation.borrowLoans)],
  ['return-book', endpoint((db, uid, body) => circulation.returnLoan(db, uid, body.borrowId))],
  ['sync-points', endpoint(points.syncPoints)],
  ['claim-daily-xp', endpoint(points.claimDaily)],
  ['spend-points', endpoint((db, uid, body) => points.spendPoints(db, uid, body.amount))],
  ['reset-progress', endpoint(points.resetProgress)],
  ['redeem-reward', endpoint(points.redeemReward)],
  ['process-redemption', endpoint(points.processRedemption)],
  ['delete-account', endpoint((db, uid) => accounts.deleteAccount(db, getAuth(db.app), uid), { recentAuth: true })],
  ['give-like', endpoint(social.giveLike)],
  ['save-book', endpoint(operations.saveBook, { maxBytes: 262144 })],
  ['delete-book', endpoint(operations.deleteBook)],
  ['update-profile', endpoint(operations.updateProfile, { verified: false, member: false, maxBytes: 32768 })],
  ['sync-profile', endpoint(syncProfile, { verified: false })],
  ['manage-user', endpoint(operations.manageUser)],
  ['manage-loan', endpoint(operations.manageLoan)],
  ['announce', endpoint(operations.announce)],
  ['reset-members', endpoint(operations.resetMembers, { recentAuth: true })],
  ['maintenance', maintenance],
]);

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname === '/api/[...path]'
    ? req.query?.['...path'] || url.searchParams.get('...path')
    : url.pathname.replace(/^\/api\//, '');
  const handler = routes.get(path);
  if (!handler) return res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
  return handler(req, res);
};
