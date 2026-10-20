const { ServiceError, requireId, requireMember } = require('./errors.cjs');
const { withMemberAction } = require('./member-actions.cjs');
const { publicBook } = require('./catalog.cjs');
const { publishProfile } = require('./projections.cjs');
const { notify } = require('./circulation.cjs');
const { randomUUID } = require('node:crypto');
const { getAuth } = require('firebase-admin/auth');
const accounts = require('./accounts.cjs');

async function editBook(db, actor, input, operation) {
  await requireMember(db, actor, true);
  if (!input.bookId) return operation(db, actor, input);
  const id = requireId(input.bookId, 'Buku');
  const token = randomUUID();
  const lock = await db.ref(`book_locks/${id}`).transaction(current => !current || (current.catalogEdit && current.expiresAt < Date.now())
    ? { catalogEdit: token, expiresAt: Date.now() + 120000 } : undefined);
  if (!lock.committed) throw new ServiceError(409, 'Selesaikan peminjaman atau checkout buku sebelum mengeditnya.');
  try { return await operation(db, actor, input); }
  finally { await db.ref(`book_locks/${id}`).transaction(current => !current || current.catalogEdit === token ? null : undefined); }
}

function text(value, name, max, optional = false) {
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) throw new ServiceError(400, `${name} tidak valid.`);
  return value.trim();
}

async function saveBook(db, actor, input) {
  await requireMember(db, actor, true);
  const id = input.bookId ? requireId(input.bookId, 'Buku') : db.ref('daftar_buku').push().key;
  const previous = (await db.ref(`daftar_buku/${id}`).get()).val();
  if (input.bookId && !previous) throw new ServiceError(404, 'Buku tidak ditemukan.');
  const fields = ['judul', 'penulis', 'penerbit', 'tahun', 'halaman', 'isbn', 'deskripsi', 'cover', 'status', 'type', 'genre', 'lokasiRak', 'pdfUrl'];
  const data = input.bookData;
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => !fields.includes(key))) throw new ServiceError(400, 'Data buku tidak valid.');
  const book = { ...previous, ...data };
  for (const field of ['judul', 'penulis', 'penerbit']) book[field] = text(book[field] || '', field, 300, field === 'penerbit');
  for (const field of ['isbn', 'genre', 'lokasiRak']) if (book[field] !== undefined) book[field] = text(book[field], field, 200, true);
  if (book.deskripsi !== undefined) book.deskripsi = text(book.deskripsi, 'Deskripsi', 10000, true);
  for (const field of ['cover', 'pdfUrl']) {
    const value = book[field];
    if (value === undefined) continue;
    const image = field === 'cover' && (/^data:image\/(jpeg|png|webp);base64,/.test(value) || /^\/covers\/[A-Za-z0-9_.-]+$/.test(value));
    if (typeof value !== 'string' || value.length > (field === 'cover' ? 180000 : 2048) || (value && !/^https:\/\//.test(value) && !image)) throw new ServiceError(400, `${field} tidak valid.`);
  }
  for (const [field, fallback, max] of [['tahun', new Date().getFullYear(), 9999], ['halaman', 0, 100000]]) {
    book[field] = Number(book[field] ?? fallback);
    if (!Number.isSafeInteger(book[field]) || book[field] < 0 || book[field] > max) throw new ServiceError(400, `${field} tidak valid.`);
  }
  book.type ||= 'digital';
  book.status ||= 'Tersedia';
  if (!['digital', 'fisik'].includes(book.type) || !['Tersedia', 'Dipinjam'].includes(book.status)) throw new ServiceError(400, 'Tipe atau status buku tidak valid.');
  const lock = (await db.ref(`book_locks/${id}`).get()).val();
  if (lock?.borrowId) throw new ServiceError(409, 'Kembalikan peminjaman aktif sebelum mengubah buku.');
  const loans = (await db.ref('peminjaman').orderByChild('bookId').equalTo(id).get()).val() || {};
  if (Object.values(loans).some(loan => ['Menunggu Pengambilan', 'Dipinjam', 'Terlambat'].includes(loan.status))) throw new ServiceError(409, 'Kembalikan peminjaman aktif sebelum mengubah buku.');
  book.createdAt ||= Date.now();
  book.updatedAt = Date.now();
  const changes = { [`daftar_buku/${id}`]: book, [`public_books/${id}`]: publicBook(book) };
  changes[`book_status/${id}`] = { status: book.status, updatedAt: book.updatedAt };
  await db.ref().update(changes);
  return { bookId: id };
}

async function deleteBook(db, actor, input) {
  await requireMember(db, actor, true);
  const id = requireId(input.bookId, 'Buku');
  if ((await db.ref(`book_locks/${id}`).get()).val()?.borrowId) throw new ServiceError(409, 'Buku masih mempunyai peminjaman aktif.');
  const loans = (await db.ref('peminjaman').orderByChild('bookId').equalTo(id).get()).val() || {};
  if (Object.values(loans).some(loan => ['Menunggu Pengambilan', 'Dipinjam', 'Terlambat'].includes(loan.status))) throw new ServiceError(409, 'Selesaikan peminjaman buku sebelum menghapusnya.');
  await db.ref().update({ [`daftar_buku/${id}`]: null, [`public_books/${id}`]: null, [`book_status/${id}`]: null });
  return { success: true };
}

async function updateProfile(db, actor, input) {
  return withMemberAction(db, actor, async () => {
    const profile = (await db.ref(`anggota/${actor}`).get()).val();
    if (!profile || profile.banned || (profile.status === 'deactivated' && input.data?.status !== 'active')) throw new ServiceError(403, 'Akun tidak aktif atau diblokir.');
    const allowed = ['nama', 'email', 'bio', 'kelas', 'photoURL', 'minatBaca', 'favoriteQuote', 'displayBadge', 'avatarFrame', 'onboardingCompleted', 'status', 'readingStreak', 'lastReadingDate', 'streakFreezes', 'unlockedFrames'];
    const data = input.data;
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => !allowed.includes(key))) throw new ServiceError(400, 'Field profil tidak diizinkan.');
    const changes = { ...data };
    for (const [key, max] of [['nama', 200], ['bio', 500], ['kelas', 100], ['favoriteQuote', 500], ['email', 320]]) if (changes[key] !== undefined) changes[key] = text(changes[key], key, max, key !== 'nama');
    if (changes.email !== undefined && changes.email !== profile.email) throw new ServiceError(400, 'Email profil harus sesuai akun login.');
    for (const key of ['displayBadge', 'avatarFrame']) if (changes[key] !== undefined && changes[key] !== null) changes[key] = text(changes[key], key, 100, true);
    if (changes.photoURL !== undefined && (typeof changes.photoURL !== 'string' || changes.photoURL.length > 24576 || (changes.photoURL && !/^https:\/\//.test(changes.photoURL) && !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(changes.photoURL)))) throw new ServiceError(400, 'Foto profil tidak valid atau terlalu besar.');
    if (changes.minatBaca !== undefined && (!Array.isArray(changes.minatBaca) || changes.minatBaca.length > 20 || changes.minatBaca.some(value => typeof value !== 'string' || value.length > 50))) throw new ServiceError(400, 'Minat baca tidak valid.');
    if (changes.unlockedFrames !== undefined && (!Array.isArray(changes.unlockedFrames) || changes.unlockedFrames.length > 100 || changes.unlockedFrames.some(value => typeof value !== 'string' || value.length > 100))) throw new ServiceError(400, 'Bingkai tidak valid.');
    for (const [key, max] of [['readingStreak', 100000], ['streakFreezes', 3]]) if (changes[key] !== undefined && (!Number.isSafeInteger(changes[key]) || changes[key] < 0 || changes[key] > max)) throw new ServiceError(400, 'Statistik membaca tidak valid.');
    if (changes.lastReadingDate !== undefined && (typeof changes.lastReadingDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(changes.lastReadingDate))) throw new ServiceError(400, 'Tanggal membaca tidak valid.');
    if (changes.onboardingCompleted !== undefined && typeof changes.onboardingCompleted !== 'boolean') throw new ServiceError(400, 'Status onboarding tidak valid.');
    if (changes.status !== undefined && !['active', 'deactivated'].includes(changes.status)) throw new ServiceError(400, 'Status akun tidak valid.');
    if (changes.status === 'deactivated' && ['admin', 'librarian'].includes(profile.role)) throw new ServiceError(409, 'Alihkan peran petugas sebelum menonaktifkan akun.');
    const result = await db.ref(`anggota/${actor}`).transaction(current => {
      if (!current) return null;
      if (current.banned || (current.status === 'deactivated' && changes.status !== 'active')) return;
      if (changes.status === 'deactivated' && ['admin', 'librarian'].includes(current.role)) return;
      return { ...current, ...changes, profileRevision: (current.profileRevision || 0) + 1 };
    });
    if (!result.committed || !result.snapshot.val()) throw new ServiceError(409, 'Profil sudah berubah. Muat ulang data.');
    await publishProfile(db, actor);
    return { success: true };
  });
}

async function manageUser(db, actor, input) {
  const member = await requireMember(db, actor, true, input.action === 'role');
  const id = requireId(input.userId, 'User ID');
  return withMemberAction(db, [actor, id], async () => {
    const target = (await db.ref(`anggota/${id}`).get()).val();
    if (!target) throw new ServiceError(404, 'Anggota tidak ditemukan.');
    if (target.role === 'admin' && member.role !== 'admin') throw new ServiceError(403, 'Hanya admin dapat memoderasi admin.');
    if (target.role === 'admin' && (input.action === 'ban' || (input.action === 'role' && input.role !== 'admin'))) {
      const admins = (await db.ref('anggota').orderByChild('role').equalTo('admin').get()).val() || {};
      if (Object.values(admins).filter(value => !value.banned && value.status !== 'deactivated').length <= 1) throw new ServiceError(409, 'Pertahankan minimal satu admin aktif.');
    }
    let changes;
    if (input.action === 'role' && ['admin', 'librarian', 'viewer', 'user'].includes(input.role)) changes = { role: input.role };
    else if (input.action === 'ban') {
      const reason = text(input.reason, 'Alasan', 300);
      changes = { banned: true, banReason: reason };
      await db.ref('user_bans').push({ userId: id, reason, bannedBy: actor, bannedAt: Date.now() });
    } else if (input.action === 'unban') changes = { banned: false, banReason: null };
    else throw new ServiceError(400, 'Tindakan anggota tidak valid.');
    const result = await db.ref(`anggota/${id}`).transaction(current => current ? { ...current, ...changes, profileRevision: (current.profileRevision || 0) + 1 } : null);
    if (!result.snapshot.val()) throw new ServiceError(409, 'Anggota sudah dihapus.');
    await publishProfile(db, id);
    return { success: true };
  });
}

async function moderate(db, actor, input) {
  await requireMember(db, actor, true);
  const token = randomUUID();
  const ref = db.ref('member_moderation_lock');
  const acquired = await ref.transaction(current => !current || current.expiresAt < Date.now() ? { token, expiresAt: Date.now() + 120000 } : undefined);
  if (!acquired.committed) throw new ServiceError(409, 'Moderasi lain sedang diproses. Coba lagi.');
  try { return await manageUser(db, actor, input); }
  finally { await ref.transaction(current => !current || current.token === token ? null : undefined); }
}

async function manageLoan(db, actor, input) {
  await requireMember(db, actor, true);
  const id = requireId(input.borrowId, 'Peminjaman');
  const before = (await db.ref(`peminjaman/${id}`).get()).val();
  if (!before) throw new ServiceError(404, 'Peminjaman tidak ditemukan.');
  return withMemberAction(db, [actor, before.userId], async () => {
    if (!['pickup', 'cash', 'waive'].includes(input.action)) throw new ServiceError(400, 'Tindakan peminjaman tidak valid.');
    const reason = input.action === 'waive' ? text(input.reason, 'Alasan', 300) : '';
    if (input.action !== 'pickup') {
      const orders = (await db.ref('payment_orders').orderByChild('userId').equalTo(before.userId).get()).val() || {};
      if (Object.values(orders).some(order => order.kind === 'fine' && order.targetId === id && ['creating', 'pending'].includes(order.status))) throw new ServiceError(409, 'Selesaikan checkout online sebelum memproses denda di kasir.');
    }
    const result = await db.ref(`peminjaman/${id}`).transaction(loan => {
      if (!loan) return null;
      if (input.action === 'pickup') return loan.status === 'Menunggu Pengambilan' && loan.bookType === 'fisik' ? { ...loan, status: 'Dipinjam' } : undefined;
      if (loan.midtransOrderId !== before.midtransOrderId) return;
      if (!Number.isSafeInteger(loan.denda) || loan.denda <= 0 || ['lunas', 'waived'].includes(loan.dendaStatus)) return;
      return input.action === 'cash' ? { ...loan, dendaStatus: 'lunas', dendaPaidAt: Date.now(), paymentMethod: 'Tunai (Kasir Perpustakaan)', paymentTransactionId: `CASH-${id}` }
        : { ...loan, dendaStatus: 'waived', dendaWaivedReason: reason };
    });
    if (!result.committed) throw new ServiceError(409, 'Status peminjaman sudah berubah. Muat ulang data.');
    await notify(db, before.userId, { type: input.action === 'pickup' ? 'borrow' : 'return', title: 'Peminjaman Diperbarui', body: `Petugas memperbarui peminjaman "${before.bookTitle}".` }).catch(() => console.error('[circulation] Notifikasi petugas gagal; data sudah tersimpan.'));
    return { success: true };
  });
}

async function announce(db, actor, input) {
  await requireMember(db, actor, true);
  const title = text(input.title, 'Judul', 200), body = text(input.body, 'Isi', 300);
  const id = db.ref('announcements').push().key;
  const changes = { [`announcements/${id}`]: { title, body, target: 'all', createdBy: actor, createdAt: Date.now() } };
  const members = (await db.ref('anggota').get()).val() || {};
  for (const [uid, member] of Object.entries(members)) if (!member.banned && member.status !== 'deactivated' && !['admin', 'librarian'].includes(member.role)) changes[`notifikasi/${uid}/announcement_${id}`] = { userId: uid, fromUserId: actor, title, body, message: body, type: 'system', read: false, createdAt: Date.now() };
  await db.ref().update(changes);
  return { success: true };
}

async function resetMembers(db, actor, input) {
  await requireMember(db, actor, true, true);
  if (input.keepAdmins !== true) throw new ServiceError(400, 'Akun petugas harus dipertahankan.');
  const members = (await db.ref('anggota').get()).val() || {};
  let deletedCount = 0;
  const deadline = Date.now() + 12000;
  for (const [uid, member] of Object.entries(members)) {
    if (Date.now() >= deadline || deletedCount >= 5) break;
    if (member.banned || member.status === 'deactivated' || ['admin', 'librarian'].includes(member.role)) continue;
    try { await accounts.deleteAccount(db, getAuth(db.app), uid); deletedCount++; }
    catch (error) { if (error instanceof ServiceError && error.status === 409) continue; throw error; }
  }
  return { deletedCount };
}

module.exports = { saveBook: (db, actor, input) => editBook(db, actor, input, saveBook),
  deleteBook: (db, actor, input) => editBook(db, actor, input, deleteBook), updateProfile, manageUser: moderate, manageLoan, announce, resetMembers };
