import { postApi } from './api';
import { addNotification } from './notifications';
import { ref, get, set, push, update, serverTimestamp, query, orderByChild, equalTo } from "firebase/database";
import { db } from "./firebase";
import type { Borrow } from "./types/borrow";
import type { Reservation } from "./types/misc";
import { snapshotToArray } from './database';
import { getUserProfile } from './profiles';

export async function getUserBorrows(userId: string): Promise<Borrow[]> {
  const snap = await get(query(ref(db, 'peminjaman'), orderByChild('userId'), equalTo(userId)));
  return snapshotToArray<Borrow>(snap).filter(b => ['Dipinjam', 'Menunggu Pengambilan', 'Terlambat'].includes(b.status));
}

export async function getUserBorrowHistory(userId: string): Promise<Borrow[]> {
  const snap = await get(query(ref(db, "peminjaman"), orderByChild("userId"), equalTo(userId)));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => v.userId === userId)
    .map(([id, v]: [string, any]) => ({ id, ...v } as Borrow))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

// Admin: get all borrows
export async function getAllBorrows(): Promise<Borrow[]> {
  const snap = await get(ref(db, "peminjaman"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .map(([id, v]: [string, any]) => ({ id, ...v } as Borrow))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function confirmBookPickup(borrowId: string): Promise<void> {
  await postApi('manage-loan', { action: 'pickup', borrowId });
}

export async function payFineWithMidtrans(borrowId: string, _paymentMethod: string, _transactionId: string): Promise<void> {
  const snap = await get(ref(db, `peminjaman/${borrowId}`));
  if (!snap.exists()) throw new Error('Peminjaman tidak ditemukan.');
  const { confirmPayment } = await import('./midtrans');
  const result = await confirmPayment(snap.val().midtransOrderId);
  if (!result.paid) throw new Error('Pembayaran masih menunggu konfirmasi.');
}

export async function payFineCash(borrowId: string): Promise<void> {
  await postApi('manage-loan', { action: 'cash', borrowId });
}

export async function waiveFine(borrowId: string, reason: string): Promise<void> {
  await postApi('manage-loan', { action: 'waive', borrowId, reason });
}

// ===== Book Reservations =====

export async function createReservation(userId: string, bookId: string): Promise<string> {
  // Check if user already has a reservation for this book
  const existing = await get(ref(db, "book_reservations"));
  if (existing.exists()) {
    const all = existing.val();
    for (const val of Object.values(all)) {
      if ((val as any).userId === userId && (val as any).bookId === bookId && (val as any).status === "waiting" && (!(val as any).expiresAt || (val as any).expiresAt > Date.now())) {
        throw new Error("Anda sudah mengantri buku ini");
      }
    }
  }

  const userProfile = await getUserProfile(userId);
  const newRef = push(ref(db, "book_reservations"));
  const expiresAt = Date.now() + 48 * 60 * 60 * 1000; // 48 hours
  await set(newRef, {
    userId,
    bookId,
    reservedAt: serverTimestamp(),
    expiresAt,
    status: "waiting",
    userName: userProfile?.nama || "User",
  });
  return newRef.key!;
}

export async function cancelReservation(reservationId: string, currentUserId?: string): Promise<void> {
  if (currentUserId) {
    const snap = await get(ref(db, `book_reservations/${reservationId}`));
    if (snap.exists() && snap.val().userId !== currentUserId) {
      const userProfile = await getUserProfile(currentUserId);
      if (userProfile?.role !== "admin") {
        throw new Error("Anda tidak memiliki izin untuk membatalkan antrean ini");
      }
    }
  }
  await update(ref(db, `book_reservations/${reservationId}`), { status: "cancelled" });
}

export async function getBookReservations(bookId: string): Promise<Reservation[]> {
  const snap = await get(ref(db, "book_reservations"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => (v as any).bookId === bookId && (v as any).status === "waiting" && (!(v as any).expiresAt || (v as any).expiresAt > Date.now()))
    .map(([id, v]: [string, any]) => ({ id, ...v } as Reservation))
    .sort((a, b) => (Number(a.reservedAt) || 0) - (Number(b.reservedAt) || 0));
}

export async function getReservationCount(bookId: string): Promise<number> {
  const reservations = await getBookReservations(bookId);
  return reservations.length;
}

export async function getUserReservations(userId: string): Promise<Reservation[]> {
  const snap = await get(ref(db, "book_reservations"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => (v as any).userId === userId && (v as any).status === "waiting" && (!(v as any).expiresAt || (v as any).expiresAt > Date.now()))
    .map(([id, v]: [string, any]) => ({ id, ...v } as Reservation))
    .sort((a, b) => (Number(a.reservedAt) || 0) - (Number(b.reservedAt) || 0));
}

export async function cleanupExpiredReservations(): Promise<void> {
  const snap = await get(ref(db, "book_reservations"));
  if (!snap.exists()) return;
  const all = snap.val();
  const now = Date.now();
  for (const [id, val] of Object.entries(all)) {
    if ((val as any).status === "waiting" && (val as any).expiresAt && (val as any).expiresAt < now) {
      await update(ref(db, `book_reservations/${id}`), { status: "expired" });
    }
  }
}

export async function getReadingHistory(userId: string): Promise<Borrow[]> {
  return getUserBorrows(userId);
}
