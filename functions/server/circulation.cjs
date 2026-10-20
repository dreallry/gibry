const { ServiceError, requireId, requireMember } = require('./errors.cjs');
const { withMemberAction } = require('./member-actions.cjs');
const ACTIVE = ['Menunggu Pengambilan', 'Dipinjam', 'Terlambat'];
const DAY = 86400000;
const wibDate = (now = Date.now()) => new Date(now + 7 * 3600000).toISOString().slice(0, 10);
const fineRate = days => days <= 5 ? 2000 : days <= 10 ? 5000 : days <= 14 ? 10000 : 15000;
const availableAfter = due => Date.parse(due + 'T00:00:00+07:00') + DAY;

async function expireBook(db, bookId, now = Date.now()) {
  const loans = (await db.ref('peminjaman').orderByChild('bookId').equalTo(bookId).get()).val() || {};
  for (const [id, loan] of Object.entries(loans)) if (ACTIVE.includes(loan.status) && loan.bookType !== 'fisik' && wibDate(now) > loan.batasKembali) {
    await module.exports.returnLoan(db, null, id, now);
  }
}

async function releaseReservation(db, userId, bookId, borrowId) {
  await db.ref(`book_locks/${bookId}`).transaction(lock => !lock || lock.borrowId === borrowId ? null : undefined);
  await db.ref(`user_active_borrows/${userId}`).transaction(current => {
    if (!current) return null;
    if (!current.active?.[borrowId]) return;
    delete current.active[borrowId];
    return { ...current, count: Object.keys(current.active).length };
  });
}

async function reserveLoan(db, uid, bookId, borrowId, expectedBook) {
  requireId(bookId, 'Buku');
  requireId(borrowId, 'Peminjaman');
  await expireBook(db, bookId);
  await db.ref(`book_locks/${bookId}`).transaction(current => !current || (current.catalogEdit && current.expiresAt < Date.now()) ? null : undefined);
  const [statusSnap, lockSnap] = await Promise.all([
    db.ref(`book_status/${bookId}`).get(), db.ref(`book_locks/${bookId}`).get(),
  ]);
  const status = statusSnap.val(), lock = lockSnap.val();
  if (lock?.borrowId === borrowId) return;
  if (lock || (status && status.status !== 'Tersedia')) throw new ServiceError(409, 'Buku sedang dipinjam.');
  const bookLoans = (await db.ref('peminjaman').orderByChild('bookId').equalTo(bookId).get()).val() || {};
  if (Object.values(bookLoans).some(loan => ACTIVE.includes(loan.status))) throw new ServiceError(409, 'Buku sedang dipinjam.');
  // Hydrate legacy counters once; concurrent requests then use persisted reservation slots.
  const loans = (await db.ref('peminjaman').orderByChild('userId').equalTo(uid).get()).val() || {};
  for (const [id, loan] of Object.entries(loans)) if (ACTIVE.includes(loan.status) && loan.bookType !== 'fisik' && wibDate() > loan.batasKembali) {
    await module.exports.returnLoan(db, null, id);
    loan.status = 'Kadaluarsa';
  }
  const baseline = Object.fromEntries(Object.entries(loans).filter(([, loan]) => ACTIVE.includes(loan.status))
    .map(([id, loan]) => [id, { bookId: loan.bookId, reservedAt: loan.createdAt || Date.now() }]));
  const slots = await db.ref(`user_active_borrows/${uid}`).transaction(current => {
    const active = current?.active || baseline;
    if (!active[borrowId] && Object.keys(active).length >= 3) return;
    return { active: { ...active, [borrowId]: { bookId, reservedAt: Date.now() } },
      count: Object.keys({ ...active, [borrowId]: true }).length };
  });
  if (!slots.committed) throw new ServiceError(409, 'Batas peminjaman maksimal 3 buku.');
  try {
    const acquired = await db.ref(`book_locks/${bookId}`).transaction(current => current ? undefined : { borrowId, userId: uid });
    if (!acquired.committed) throw new ServiceError(409, 'Buku sedang dipinjam.');
    const currentBook = (await db.ref(`daftar_buku/${bookId}`).get()).val();
    if (!currentBook) throw new ServiceError(404, 'Buku tidak ditemukan.');
    if (expectedBook && JSON.stringify(currentBook) !== JSON.stringify(expectedBook)) throw new ServiceError(409, 'Data buku berubah. Muat ulang katalog.');
  } catch (error) {
    await releaseReservation(db, uid, bookId, borrowId);
    throw error;
  }
}

async function notify(db, userId, data) {
  await db.ref(`notifikasi/${userId}`).push({
    ...data, userId, fromUserId: 'server', message: data.body.slice(0, 300),
    read: false, createdAt: Date.now(), link: '/profile',
  });
}

async function borrowLoans(db, actorId, input) {
  const actor = await requireMember(db, actorId);
  const uid = requireId(input?.userId || actorId, 'User ID');
  if (uid !== actorId && !['admin', 'librarian'].includes(actor.role)) throw new ServiceError(403, 'Peminjaman bukan milik Anda.');
  const member = uid === actorId ? actor : await requireMember(db, uid);
  const bookIds = input?.bookIds;
  if (!Array.isArray(bookIds) || bookIds.length < 1 || bookIds.length > 3) throw new ServiceError(400, 'Pilih 1 sampai 3 buku.');
  bookIds.forEach(id => requireId(id, 'Buku'));
  if (new Set(bookIds).size !== bookIds.length) throw new ServiceError(400, 'Buku dalam keranjang tidak boleh berulang.');
  const days = input?.deadlineDays ?? 14;
  if (!Number.isInteger(days) || days < 1 || days > 30) throw new ServiceError(400, 'Durasi peminjaman harus 1 sampai 30 hari.');

  const reserved = [];
  try {
    for (const bookId of bookIds) {
      const book = (await db.ref(`daftar_buku/${bookId}`).get()).val();
      if (!book) throw new ServiceError(404, 'Buku tidak ditemukan.');
      const borrowId = db.ref('peminjaman').push().key;
      await reserveLoan(db, uid, bookId, borrowId, book);
      reserved.push({ bookId, borrowId, book });
    }
    const now = Date.now(), today = wibDate(now);
    const due = new Date(Date.parse(today + 'T00:00:00Z') + days * DAY).toISOString().slice(0, 10);
    const updates = {};
    for (const { bookId, borrowId, book } of reserved) {
      const type = book.type || 'digital';
      updates[`peminjaman/${borrowId}`] = {
        userId: uid, userName: member.nama, bookId, bookTitle: book.judul, bookCover: book.cover || '',
        bookPenulis: book.penulis || '', bookGenre: book.genre || 'Umum', bookType: type,
        paymentMethod: 'Gratis', paymentTransactionId: null, midtransOrderId: null,
        pdfUrl: book.pdfUrl || '', lokasiRak: book.lokasiRak || 'Rak Umum', kodePinjam: borrowId,
        tanggalPinjam: today, batasKembali: due, deadlineDays: days, fineRate: fineRate(days),
        status: type === 'fisik' && actorId === uid ? 'Menunggu Pengambilan' : 'Dipinjam',
        denda: 0, dendaStatus: 'lunas', createdAt: now,
      };
      updates[`book_status/${bookId}`] = { status: 'Dipinjam', updatedAt: now,
        ...(type === 'digital' ? { availableAfter: availableAfter(due) } : {}) };
    }
    await db.ref().update(updates);
    await notify(db, uid, { type: 'borrow', title: 'Peminjaman Tercatat',
      body: `${reserved.length} buku dipinjam sampai ${due}.` })
      .catch(() => console.error('[circulation] Notifikasi peminjaman gagal; data peminjaman sudah tersimpan.'));
    return { borrowIds: reserved.map(item => item.borrowId) };
  } catch (error) {
    await Promise.all(reserved.map(({ bookId, borrowId }) => releaseReservation(db, uid, bookId, borrowId)));
    throw error;
  }
}

async function borrowLoan(db, actorId, input) {
  if (input?.orderId) throw new ServiceError(400, 'Peminjaman buku tidak membutuhkan pembayaran.');
  const result = await borrowLoans(db, actorId, { userId: input?.userId, bookIds: [input?.bookId], deadlineDays: input?.deadlineDays });
  return { borrowId: result.borrowIds[0] };
}

async function returnLoan(db, actorId, borrowId, now = Date.now()) {
  requireId(borrowId, 'Peminjaman');
  const actor = actorId ? await requireMember(db, actorId) : null;
  const loanRef = db.ref(`peminjaman/${borrowId}`);
  const loan = (await loanRef.get()).val();
  if (!loan) throw new ServiceError(404, 'Peminjaman tidak ditemukan.');
  const staff = actor && ['admin', 'librarian'].includes(actor.role);
  if (actorId && loan.userId !== actorId && !staff) throw new ServiceError(403, 'Peminjaman bukan milik Anda.');
  if (loan.bookType === 'fisik' && !staff) throw new ServiceError(403, 'Pengembalian buku fisik harus dikonfirmasi petugas.');
  const today = wibDate(now);
  if (!actorId && (loan.bookType === 'fisik' || today <= loan.batasKembali)) throw new ServiceError(403, 'Peminjaman belum kedaluwarsa.');
  const terminal = ['Dikembalikan', 'Kadaluarsa'];
  const result = await loanRef.transaction(current => {
    if (!current || terminal.includes(current.status)) return current;
    if (!ACTIVE.includes(current.status)) return;
    if (!actorId && today <= current.batasKembali) return;
    const lateDays = Math.max(0, Math.round((Date.parse(today) - Date.parse(current.batasKembali)) / DAY));
    const amount = current.bookType === 'fisik' ? lateDays * fineRate(current.deadlineDays || 14) : 0;
    return { ...current, status: actorId ? 'Dikembalikan' : 'Kadaluarsa', tanggalKembali: today,
      denda: amount, dendaStatus: amount > 0 ? 'belum' : 'lunas' };
  });
  if (!result.committed || !result.snapshot.val()) throw new ServiceError(409, 'Peminjaman tidak dapat dikembalikan.');
  const lock = (await db.ref(`book_locks/${loan.bookId}`).get()).val();
  if (terminal.includes(loan.status) && lock?.borrowId !== borrowId) return { denda: result.snapshot.val().denda || 0 };
  if (!lock || lock.borrowId === borrowId) await db.ref(`book_status/${loan.bookId}`).set({ status: 'Tersedia', updatedAt: now });
  await releaseReservation(db, loan.userId, loan.bookId, borrowId);
  return { denda: result.snapshot.val().denda || 0 };
}

module.exports = { borrowLoan: (db, actor, input) => withMemberAction(db, [actor, input?.userId || actor], () => borrowLoan(db, actor, input)),
  borrowLoans: (db, actor, input) => withMemberAction(db, [actor, input?.userId || actor], () => borrowLoans(db, actor, input)),
  returnLoan: async (db, actor, id, now) => {
    requireId(id, 'Peminjaman');
    const loan = (await db.ref(`peminjaman/${id}`).get()).val();
    const ids = [actor, loan?.userId].filter(Boolean);
    return ids.length ? withMemberAction(db, ids, () => returnLoan(db, actor, id, now)) : returnLoan(db, actor, id, now);
  }, reserveLoan, releaseReservation, notify, wibDate, fineRate, availableAfter, expireBook };
