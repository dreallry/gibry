import { ref, get, set, push, update, remove, serverTimestamp, query, orderByChild, equalTo } from "firebase/database";
import { db } from "./firebase";
import type { Review, ReadingNote, ReadingGoal } from "./types/reading";
import type { ReadingStatsData } from "./types/misc";
import { auth } from "./firebase";
import { eventBus } from "./eventBus";
import { addPoints } from './points';
import { getUserProfile } from './profiles';
import { getUserBorrowHistory } from './loans';
import { getUserFavoriteBooks } from './collections';

// ===== Seed Data =====

// ===== Reviews =====
export async function addReview(userId: string, userName: string, userPhoto: string | undefined, bookId: string, rating: number, comment: string): Promise<void> {
  if (rating < 1 || rating > 5) throw new Error("Rating harus antara 1 sampai 5 bintang");
  if (comment && comment.length > 1000) throw new Error("Ulasan maksimal 1000 karakter");

  const snap = await get(ref(db, "ulasan"));
  if (snap.exists()) {
    const all = snap.val();
    for (const [key, val] of Object.entries(all)) {
      if ((val as any).userId === userId && (val as any).bookId === bookId) {
        await update(ref(db, `ulasan/${key}`), { rating, comment, userPhoto: userPhoto || "", createdAt: serverTimestamp() });
        return;
      }
    }
  }
  const newRef = push(ref(db, "ulasan"));
  await set(newRef, { userId, userName, userPhoto: userPhoto || "", bookId, rating, comment, createdAt: serverTimestamp() });

  // Add points for writing review
  await addPoints(userId, 15);

  try {
    eventBus.emit({
      type: "book:reviewed",
      payload: { userId, bookId, rating },
    });
  } catch { }
}

export async function getBookReviews(bookId: string): Promise<Review[]> {
  const snap = await get(ref(db, "ulasan"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => (v as any).bookId === bookId)
    .map(([id, v]: [string, any]) => ({ id, ...v } as Review))
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
}

export async function getBookAverageRating(bookId: string, loadedReviews?: Review[]): Promise<{ avg: number; count: number }> {
  const reviews = loadedReviews || await getBookReviews(bookId);
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

// ===== Reading Stats =====
export async function getUserReadingStats(userId: string): Promise<{
  totalBorrowed: number;
  totalReturned: number;
  currentlyBorrowed: number;
  totalReviews: number;
  avgRating: number;
  favoriteCount: number;
  attendanceCount: number;
}> {
  const userProfile = await getUserProfile(userId);
  const [borrowsSnap, reviewsSnap, favSnap, attendanceSnap] = await Promise.all([
    get(query(ref(db, "peminjaman"), orderByChild("userId"), equalTo(userId))),
    get(ref(db, "ulasan")),
    get(ref(db, "favorit_buku")),
    get(query(ref(db, "daftar_hadir"), orderByChild("userId"), equalTo(userId))),
  ]);

  let totalBorrowed = 0;
  let totalReturned = 0;
  let currentlyBorrowed = 0;
  if (borrowsSnap.exists()) {
    for (const val of Object.values(borrowsSnap.val())) {
      if ((val as any).userId === userId) {
        totalBorrowed++;
        if ((val as any).status === "Dikembalikan") totalReturned++;
        if ((val as any).status === "Dipinjam") currentlyBorrowed++;
      }
    }
  }

  let totalReviews = 0;
  let totalRating = 0;
  if (reviewsSnap.exists()) {
    for (const val of Object.values(reviewsSnap.val())) {
      if ((val as any).userId === userId) {
        totalReviews++;
        totalRating += (val as any).rating;
      }
    }
  }

  let favoriteCount = 0;
  if (favSnap.exists()) {
    for (const val of Object.values(favSnap.val())) {
      if ((val as any).userId === userId) favoriteCount++;
    }
  }

  // BUG FIX: attendance count now filters by user's email instead of counting ALL attendance
  let attendanceCount = 0;
  if (attendanceSnap.exists() && userProfile) {
    for (const val of Object.values(attendanceSnap.val())) {
      if ((val as any).email === userProfile.email) attendanceCount++;
    }
  }

  return {
    totalBorrowed,
    totalReturned,
    currentlyBorrowed,
    totalReviews,
    avgRating: totalReviews > 0 ? Math.round((totalRating / totalReviews) * 10) / 10 : 0,
    favoriteCount,
    attendanceCount,
  };
}

// ===== Reading Goals =====
export async function getReadingGoal(userId: string, month: string): Promise<ReadingGoal | null> {
  const snap = await get(ref(db, `reading_goals/${userId}`));
  if (!snap.exists()) return null;
  const all = snap.val();
  for (const [id, val] of Object.entries(all)) {
    const goal = val as any;
    if (goal.month === month) {
      return { id, ...goal } as ReadingGoal;
    }
  }
  return null;
}

export async function setReadingGoal(userId: string, month: string, target: number): Promise<void> {
  const existing = await getReadingGoal(userId, month);
  if (existing) {
    await update(ref(db, `reading_goals/${userId}/${existing.id}`), { target });
  } else {
    const newRef = push(ref(db, `reading_goals/${userId}`));
    await set(newRef, {
      userId,
      month,
      target,
      current: 0,
      createdAt: serverTimestamp(),
    });
  }
}

export async function incrementReadingGoal(userId: string, month: string): Promise<void> {
  const goal = await getReadingGoal(userId, month);
  if (goal) {
    await update(ref(db, `reading_goals/${userId}/${goal.id}`), { current: goal.current + 1 });
  }
}

// ===== Reading Notes =====
export async function addNote(userId: string, bookId: string, bookTitle: string, content: string, page?: number): Promise<void> {
  if (!content || !content.trim()) throw new Error("Catatan tidak boleh kosong");
  if (content.length > 5000) throw new Error("Catatan maksimal 5000 karakter");

  const newRef = push(ref(db, `reading_notes/${userId}`));
  await set(newRef, {
    userId,
    bookId,
    bookTitle,
    content: content.trim(),
    page: page || null,
    createdAt: serverTimestamp(),
  });
}

export async function getUserNotes(userId: string): Promise<ReadingNote[]> {
  const snap = await get(ref(db, `reading_notes/${userId}`));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .map(([id, v]: [string, any]) => ({ id, ...v } as ReadingNote))
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
}

export async function deleteNote(noteId: string, currentUserId?: string): Promise<void> {
  const uid = currentUserId || auth.currentUser?.uid;
  if (!uid) return;
  await remove(ref(db, `reading_notes/${uid}/${noteId}`));
}

// ===== Reading Dashboard Stats =====

export async function getUserDashboardStats(userId: string): Promise<ReadingStatsData> {
  const [borrows, favorites, profile] = await Promise.all([
    getUserBorrowHistory(userId),
    getUserFavoriteBooks(userId),
    getUserProfile(userId),
  ]);

  // Get reviews
  const reviewsSnap = await get(ref(db, "ulasan"));
  let totalReviews = 0;
  let totalRating = 0;
  if (reviewsSnap.exists()) {
    for (const val of Object.values(reviewsSnap.val())) {
      if ((val as any).userId === userId) {
        totalReviews++;
        totalRating += (val as any).rating || 0;
      }
    }
  }

  // Calculate stats
  const completedBorrows = borrows.filter(b => b.status === "Dikembalikan").length;
  const activeBorrows = borrows.filter(b => b.status === "Dipinjam").length;
  const overdueBorrows = borrows.filter(b => b.status === "Terlambat").length;

  // Genre distribution
  const genreDistribution: Record<string, number> = {};
  for (const borrow of borrows) {
    if (borrow.bookGenre) {
      genreDistribution[borrow.bookGenre] = (genreDistribution[borrow.bookGenre] || 0) + 1;
    }
  }

  // Activity Heatmap (YYYY-MM-DD -> count)
  const activityHeatmap: Record<string, number> = {};
  let totalPaceDays = 0;
  let pacedBooksCount = 0;

  for (const borrow of borrows) {
    if (borrow.tanggalPinjam) {
      const pDate = borrow.tanggalPinjam.substring(0, 10);
      activityHeatmap[pDate] = (activityHeatmap[pDate] || 0) + 1;
    }
    if (borrow.tanggalKembali) {
      const rDate = borrow.tanggalKembali.substring(0, 10);
      activityHeatmap[rDate] = (activityHeatmap[rDate] || 0) + 1;

      if (borrow.tanggalPinjam) {
        const d1 = new Date(borrow.tanggalPinjam).getTime();
        const d2 = new Date(borrow.tanggalKembali).getTime();
        const diffDays = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
        totalPaceDays += diffDays;
        pacedBooksCount++;
      }
    }
  }

  // Monthly borrows
  const monthlyBorrows: Record<string, number> = {};
  for (const borrow of borrows) {
    if (borrow.tanggalPinjam) {
      const month = borrow.tanggalPinjam.substring(0, 7);
      monthlyBorrows[month] = (monthlyBorrows[month] || 0) + 1;
    }
  }

  // Genre Diversity Score (0-100)
  const uniqueGenresCount = Object.keys(genreDistribution).length;
  const genreDiversityScore = Math.min(100, Math.round((uniqueGenresCount / 6) * 100));

  // Reading Pace Days (Average days to finish a book)
  const readingPaceDays = pacedBooksCount > 0 ? Math.round((totalPaceDays / pacedBooksCount) * 10) / 10 : 7;

  // Approximate percentile rank based on total points
  const userPoints = profile?.totalPoints || 0;
  let percentileRank = 50;
  if (userPoints > 1000) percentileRank = 95;
  else if (userPoints > 500) percentileRank = 88;
  else if (userPoints > 200) percentileRank = 75;
  else if (userPoints > 50) percentileRank = 60;

  return {
    totalBorrows: borrows.length,
    completedBorrows,
    activeBorrows,
    overdueBorrows,
    totalFavorites: favorites.length,
    totalReviews,
    avgRating: totalReviews > 0 ? totalRating / totalReviews : 0,
    genreDistribution,
    monthlyBorrows,
    readingStreak: profile?.readingStreak || 0,
    streakFreezes: profile?.streakFreezes || 0,
    readingPaceDays,
    genreDiversityScore,
    activityHeatmap,
    percentileRank,
  };
}
