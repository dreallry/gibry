class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireId(value, name) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new ServiceError(400, `${name} tidak valid.`);
  }
  return value;
}

async function requireMember(db, uid, staffOnly = false, adminOnly = false) {
  requireId(uid, 'User ID');
  const profile = (await db.ref(`anggota/${uid}`).get()).val();
  if (!profile || profile.banned || profile.status === 'deactivated') {
    throw new ServiceError(403, 'Akun tidak aktif atau diblokir.');
  }
  if (adminOnly ? profile.role !== 'admin' : staffOnly && !['admin', 'librarian'].includes(profile.role)) {
    throw new ServiceError(403, 'Anda tidak memiliki izin untuk tindakan ini.');
  }
  return profile;
}

module.exports = { ServiceError, requireId, requireMember };
