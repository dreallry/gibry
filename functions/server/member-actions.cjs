const { randomUUID } = require('node:crypto');
const { ServiceError, requireId } = require('./errors.cjs');
// Longer than the longest configured function timeout; crashed requests eventually stop blocking deletion.
const LEASE_MS = 20 * 60000;
const active = value => Object.fromEntries(Object.entries(value?.actions || {}).filter(([, expires]) => expires > Date.now()));

async function withMemberAction(db, ids, operation) {
  const leases = [];
  try {
    for (const uid of [...new Set(Array.isArray(ids) ? ids : [ids])].sort()) {
      requireId(uid, 'User ID');
      const ref = db.ref(`member_actions/${uid}`), id = randomUUID();
      const result = await ref.transaction(value => {
        if (value?.closed) return;
        return { closed: false, actions: { ...active(value), [id]: Date.now() + LEASE_MS } };
      });
      if (!result.committed) throw new ServiceError(409, 'Penghapusan akun sedang diproses. Tindakan tidak dapat dilanjutkan.');
      leases.push({ ref, id });
    }
    return await operation();
  } finally {
    for (const { ref, id } of leases) await ref.transaction(value => {
      if (!value) return null;
      const actions = active(value);
      delete actions[id];
      return { ...value, actions };
    });
  }
}

async function closeMemberActions(db, uid) {
  const result = await db.ref(`member_actions/${uid}`).transaction(value => {
    if (value?.closed || Object.keys(active(value)).length) return;
    return { closed: true };
  });
  if (!result.committed) throw new ServiceError(409, 'Akun masih memproses tindakan lain. Coba hapus akun setelah proses selesai.');
}

async function reopenMemberActions(db, uid) {
  await db.ref(`member_actions/${uid}`).transaction(value => value ? { ...value, closed: false } : null);
}
module.exports = { withMemberAction, closeMemberActions, reopenMemberActions };
