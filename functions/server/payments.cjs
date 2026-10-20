const crypto = require('node:crypto');
const { ServiceError, requireId, requireMember } = require('./errors.cjs');
const { releaseReservation } = require('./circulation.cjs');
const { withMemberAction } = require('./member-actions.cjs');
const PAYMENT_MINUTES = 30;
const RECHECK_MS = 5 * 60000;
const LEGACY_EXPIRY_MS = 24 * 3600000;

function expiryStart(timestamp) {
  return new Date(timestamp + 7 * 3600000).toISOString().slice(0, 19).replace('T', ' ') + ' +0700';
}

function config() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const origin = process.env.FRONTEND_ORIGIN;
  if (!serverKey || !origin) throw new ServiceError(503, 'Konfigurasi pembayaran belum lengkap.');
  const url = new URL(origin);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new ServiceError(503, 'Konfigurasi alamat website tidak valid.');
  }
  const production = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  return {
    serverKey,
    origin: url.origin,
    snapUrl: production ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com',
    apiUrl: production ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com',
  };
}

function isPaid(status) {
  return status.transaction_status === 'settlement' ||
    (status.transaction_status === 'capture' && status.fraud_status === 'accept');
}

function verifySignature(payload, serverKey) {
  if (!payload || typeof payload.signature_key !== 'string' || !/^[a-f0-9]{128}$/i.test(payload.signature_key)) {
    throw new ServiceError(403, 'Signature pembayaran tidak valid.');
  }
  const { order_id, status_code, gross_amount } = payload;
  requireId(order_id, 'Order ID');
  if (typeof status_code !== 'string' || !/^\d{3}$/.test(status_code) ||
      typeof gross_amount !== 'string' || !/^\d+(\.\d{1,2})?$/.test(gross_amount)) {
    throw new ServiceError(400, 'Payload pembayaran tidak valid.');
  }
  const expected = crypto.createHash('sha512').update(order_id + status_code + gross_amount + serverKey).digest();
  const received = Buffer.from(payload.signature_key, 'hex');
  if (!crypto.timingSafeEqual(expected, received)) throw new ServiceError(403, 'Signature pembayaran tidak valid.');
}

async function gateway(url, options, settings, fetcher = fetch) {
  const response = await fetcher(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(settings.serverKey + ':').toString('base64')}`,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const error = new ServiceError(502, 'Gateway pembayaran belum dapat memproses permintaan.');
    error.gatewayStatus = response.status;
    throw error;
  }
  const result = await response.json();
  if (!result || typeof result !== 'object') throw new ServiceError(502, 'Respons gateway tidak valid.');
  return result;
}

async function createPayment(db, uid, input, fetcher = fetch) {
  if (input?.kind !== 'fine') throw new ServiceError(400, 'Pembayaran hanya untuk denda.');
  const settings = config();
  const profile = await requireMember(db, uid);
  const kind = 'fine';
  const targetId = requireId(input.borrowId, 'Peminjaman');
  const borrow = (await db.ref(`peminjaman/${targetId}`).get()).val();
  if (!borrow) throw new ServiceError(404, 'Peminjaman tidak ditemukan.');
  if (borrow.userId !== uid) throw new ServiceError(403, 'Peminjaman bukan milik Anda.');
  if (['lunas', 'waived'].includes(borrow.dendaStatus)) throw new ServiceError(409, 'Denda sudah diselesaikan.');
  const amount = borrow.denda;
  const name = `Denda: ${borrow.bookTitle || 'Buku'}`;
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000) {
    throw new ServiceError(400, 'Nominal tagihan tidak valid.');
  }

  // A persisted intent keeps repeated clicks on the same bill from creating new charges.
  const intentRef = db.ref(`payment_intents/${uid}/${kind}-${targetId}`);
  const proposed = { orderId: db.ref('payment_orders').push().key, amount };
  const previous = (await intentRef.get()).val();
  let cancelled = false;
  if (previous) {
    const oldOrder = (await db.ref(`payment_orders/${previous.orderId}`).get()).val();
    cancelled = oldOrder && ['deny', 'cancel', 'expire', 'failure'].includes(oldOrder.status);
  }
  const intent = await intentRef.transaction(current =>
    !current || (cancelled && current.orderId === previous.orderId) ? proposed : current);
  const saved = intent.snapshot.val();
  if (saved.amount !== amount) {
    throw new ServiceError(409, 'Tagihan sudah memiliki transaksi. Hubungi petugas untuk mengubah tagihan.');
  }
  const orderId = saved.orderId;
  const orderRef = db.ref(`payment_orders/${orderId}`);
  const claim = await orderRef.transaction(current => current || {
    userId: uid, kind, targetId, amount,
    status: 'creating', createdAt: Date.now(), reconcileAt: Date.now() + RECHECK_MS,
  });
  if (!claim.committed) throw new ServiceError(409, 'Transaksi sedang diproses.');
  const existing = claim.snapshot.val();
  if (existing.token) return { token: existing.token, redirectUrl: existing.redirectUrl, orderId };
  // Claim a single gateway request. Ambiguous failures require reconciliation instead of another charge.
  const gatewayClaim = await orderRef.child('gatewayRequested').transaction(value => value ? undefined : true);
  if (!gatewayClaim.committed) throw new ServiceError(409, 'Transaksi sedang diproses. Hubungi petugas jika berlanjut.');
  const marked = await db.ref(`peminjaman/${targetId}`).transaction(borrow => {
    if (!borrow) return null;
    if (borrow.userId !== uid || borrow.denda !== amount || ['lunas', 'waived'].includes(borrow.dendaStatus)) return;
    return { ...borrow, midtransOrderId: orderId };
  });
  if (!marked.committed || !marked.snapshot.val()) {
    await orderRef.update({ status: 'cancel', gatewayRequested: null, reconcileAt: null });
    throw new ServiceError(409, 'Tagihan berubah atau sudah diselesaikan.');
  }
  const gatewayStartedAt = Date.now();
  await orderRef.update({ gatewayStartedAt, paymentExpiresAt: gatewayStartedAt + PAYMENT_MINUTES * 60000 });
  const result = await gateway(`${settings.snapUrl}/snap/v1/transactions`, {
    method: 'POST',
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      item_details: [{ id: targetId, name: name.slice(0, 50), price: amount, quantity: 1 }],
      customer_details: { first_name: profile.nama || 'Pembaca', email: profile.email || '' },
      callbacks: { finish: `${settings.origin}/transactions` },
      expiry: { start_time: expiryStart(gatewayStartedAt), duration: PAYMENT_MINUTES, unit: 'minutes' },
      page_expiry: { duration: PAYMENT_MINUTES, unit: 'minutes' },
    }),
  }, settings, fetcher);
  if (typeof result.token !== 'string' || typeof result.redirect_url !== 'string') {
    throw new ServiceError(502, 'Respons gateway tidak valid.');
  }
  await orderRef.update({ token: result.token, redirectUrl: result.redirect_url, status: 'pending' });
  return { token: result.token, redirectUrl: result.redirect_url, orderId };
}

async function getStatus(orderId, settings, fetcher) {
  try {
    const status = await gateway(`${settings.apiUrl}/v2/${encodeURIComponent(orderId)}/status`, { method: 'GET' }, settings, fetcher);
    if (status.status_code === '404') return null;
    return status;
  } catch (error) {
    if (error.gatewayStatus === 404) return null;
    throw error;
  }
}

function validateStatus(orderId, order, status) {
  if (status.order_id !== orderId || Number(status.gross_amount) !== order.amount) {
    throw new ServiceError(409, 'Nominal transaksi tidak sesuai tagihan.');
  }
}

async function applyPaymentStatus(db, orderId, order, status) {
  return withMemberAction(db, order.userId, () => applyStatus(db, orderId, order, status));
}
async function applyStatus(db, orderId, order, status) {
  const orderRef = db.ref(`payment_orders/${orderId}`);
  if (order.kind !== 'fine') throw new ServiceError(409, 'Pembayaran buku sudah tidak didukung.');
  validateStatus(orderId, order, status);
  if (!isPaid(status)) {
    // Snap allows another attempt after a decline; a failed attempt does not close its session.
    await orderRef.update({ gatewayStatus: status.transaction_status, reconcileAt: Date.now() + RECHECK_MS });
    return { paid: false, orderId };
  }
  if (typeof status.transaction_id !== 'string') throw new ServiceError(502, 'Identitas transaksi tidak valid.');

  if (order.kind === 'fine') {
    const result = await db.ref(`peminjaman/${order.targetId}`).transaction(borrow => {
      if (!borrow) return null;
      if (borrow.userId !== order.userId || borrow.denda !== order.amount || borrow.midtransOrderId !== orderId) return;
      if (borrow.dendaStatus === 'waived') return;
      if (borrow.dendaStatus === 'lunas') return borrow.paymentTransactionId === status.transaction_id ? borrow : undefined;
      return { ...borrow, dendaStatus: 'lunas', dendaPaidAt: Date.now(),
        paymentMethod: status.payment_type || 'midtrans', paymentTransactionId: status.transaction_id,
        verifiedByWebhook: true };
    });
    if (!result.committed || !result.snapshot.val()) throw new ServiceError(409, 'Tagihan berubah. Pembayaran perlu ditinjau petugas.');
  }
  await orderRef.update({ status: 'paid', transactionId: status.transaction_id, paymentMethod: status.payment_type || 'midtrans' });
  await orderRef.update({ reconcileAt: null, needsReview: null, reconciledAt: Date.now() });
  return { paid: true, orderId, method: status.payment_type || 'midtrans', transactionId: status.transaction_id };
}

async function confirmPayment(db, uid, orderId, fetcher = fetch) {
  requireId(orderId, 'Order ID');
  if (uid) await requireMember(db, uid);
  const order = (await db.ref(`payment_orders/${orderId}`).get()).val();
  if (!order) throw new ServiceError(404, 'Transaksi tidak ditemukan.');
  if (uid && order.userId !== uid) throw new ServiceError(403, 'Transaksi bukan milik Anda.');
  const status = await getStatus(orderId, config(), fetcher);
  if (!status) return { paid: false, orderId };
  return applyPaymentStatus(db, orderId, order, status);
}

async function cancelSnapSession(order, settings, fetcher) {
  if (order.sessionCanceledAt) return true;
  if (typeof order.token !== 'string' || !order.token) return false;
  // This endpoint documents the raw merchant key rather than Core API's Basic header.
  const response = await fetcher(`${settings.snapUrl}/snap/v1/transactions/${encodeURIComponent(order.token)}/cancel`, {
    method: 'POST', headers: { Authorization: settings.serverKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return false;
  const result = await response.json();
  return typeof result?.canceled_at === 'string' && Number.isFinite(Date.parse(result.canceled_at));
}

async function retireOrder(db, orderId, order, status, now) {
  const result = await db.ref(`payment_orders/${orderId}`).transaction(current => {
    if (!current) return null;
    if (current.status === 'paid') return;
    return { ...current, status, reconcileAt: null, needsReview: null, reconciledAt: now };
  });
  if (result.committed && result.snapshot.val() && order.kind === 'rental') {
    await releaseReservation(db, order.userId, order.targetId, orderId);
  }
  return result.committed;
}

async function reconcilePendingPayments(db, fetcher = fetch, now = Date.now(), budgetMs = 45000) {
  const settings = config();
  const deadline = Date.now() + budgetMs;
  const boundedFetch = (url, options) => fetcher(url, {
    ...options,
    signal: AbortSignal.any([options.signal, AbortSignal.timeout(Math.max(1, deadline - Date.now()))]),
  });
  const due = (await db.ref('payment_orders').orderByChild('reconcileAt').startAt(1).endAt(now).limitToFirst(50).get()).val() || {};
  const summary = { checked: 0, paid: 0, released: 0, review: 0 };
  for (const [orderId, original] of Object.entries(due)) {
    if (Date.now() >= deadline) break;
    const orderRef = db.ref(`payment_orders/${orderId}`);
    summary.checked++;
    // Re-scheduling first makes progress fair and recovers from an interrupted worker.
    await orderRef.update({ reconcileAt: now + RECHECK_MS });
    try {
      const order = (await orderRef.get()).val() || original;
      let status = await getStatus(orderId, settings, boundedFetch);
      if (status) {
        validateStatus(orderId, order, status);
        if (isPaid(status)) {
          await applyPaymentStatus(db, orderId, order, status);
          summary.paid++;
          continue;
        }
      }
      const expiresAt = order.paymentExpiresAt || (order.createdAt + LEGACY_EXPIRY_MS);
      if (!Number.isFinite(expiresAt) || now < expiresAt) continue;
      if (status && !['pending', 'deny', 'cancel', 'expire', 'failure'].includes(status.transaction_status)) {
        throw new ServiceError(409, 'Status pembayaran perlu ditinjau petugas.');
      }
      if (status?.transaction_status === 'pending') {
        await gateway(`${settings.apiUrl}/v2/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' }, settings, boundedFetch);
        status = await getStatus(orderId, settings, boundedFetch);
        if (status) {
          validateStatus(orderId, order, status);
          if (isPaid(status)) {
            await applyPaymentStatus(db, orderId, order, status);
            summary.paid++;
            continue;
          }
        }
      }
      // A Core API 404 says no payment method was chosen; it does not invalidate a Snap token.
      // Release only after a verified session cancellation and a fresh nonpayable Core status.
      if (!(await cancelSnapSession(order, settings, boundedFetch))) {
        throw new ServiceError(409, 'Sesi checkout belum dikonfirmasi batal.');
      }
      await orderRef.update({ sessionCanceledAt: now });
      status = await getStatus(orderId, settings, boundedFetch);
      if (status) {
        validateStatus(orderId, order, status);
        if (isPaid(status)) {
          await applyPaymentStatus(db, orderId, order, status);
          summary.paid++;
          continue;
        }
        if (!['deny', 'cancel', 'expire', 'failure'].includes(status.transaction_status)) {
          throw new ServiceError(409, 'Transaksi masih dapat dibayar.');
        }
      }
      if (await retireOrder(db, orderId, order, status?.transaction_status || 'cancel', now)) summary.released++;
    } catch (error) {
      summary.review++;
      await orderRef.update({ reconcileAt: now + RECHECK_MS, needsReview: true, reconciliationError: error instanceof ServiceError ? error.status : 502 });
    }
  }
  return summary;
}

async function processNotification(db, payload, fetcher = fetch) {
  verifySignature(payload, config().serverKey);
  // Midtrans's signature does not include transaction_status; fetch the authoritative status.
  return confirmPayment(db, null, payload.order_id, fetcher);
}

module.exports = { createPayment: (db, uid, ...args) => withMemberAction(db, uid, () => createPayment(db, uid, ...args)),
  confirmPayment, processNotification, verifySignature, isPaid, reconcilePendingPayments };
