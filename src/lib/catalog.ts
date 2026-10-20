import { addNotification } from './notifications';
import { ref, get, set, push, update, remove, serverTimestamp } from "firebase/database";
import { db } from "./firebase";
import type { Book, BookFilters } from "./types/book";
import type { Activity } from "./types/social";
import { auth } from "./firebase";
import { snapshotToArray } from './database';
import { getUserFavorites } from './collections';
import { getUserBorrowHistory } from './loans';
import { getFriendsFeed, getFriends } from './friends';
import { postApi } from './api';

function availability(value: { status?: string; availableAfter?: number }): string {
  return value.availableAfter && Date.now() >= value.availableAfter ? 'Tersedia' : value.status || 'Tersedia';
}

// Availability is updated by the circulation service or staff.
export async function getBookStatus(bookId: string): Promise<string> {
  const snap = await get(ref(db, `book_status/${bookId}`));
  if (!snap.exists()) return "Tersedia"; // default
  return availability(snap.val());
}

export async function getBookStatuses(): Promise<Record<string, string>> {
  const snap = await get(ref(db, "book_status"));
  if (!snap.exists()) return {};
  const data = snap.val();
  const result: Record<string, string> = {};
  for (const [bookId, val] of Object.entries(data)) {
    result[bookId] = availability(val as any);
  }
  return result;
}

export async function setBookStatus(bookId: string, status: string): Promise<void> {
  await postApi('save-book', { bookId, bookData: { status } });
}

async function catalogPath(): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) return 'public_books';
  const profile = await get(ref(db, `anggota/${uid}`));
  return ['admin', 'librarian'].includes(profile.val()?.role) ? 'daftar_buku' : 'public_books';
}

// ===== Books =====
export async function getBooks(filters: BookFilters = {}): Promise<Book[]> {
  const snap = await get(ref(db, await catalogPath()));
  let books = snapshotToArray<Book>(snap);

  // Merge live status from book_status (source of truth for availability)
  const statuses = await getBookStatuses();
  books = books.map(b => ({
    ...b,
    status: (statuses[b.id] as Book["status"]) || b.status || "Tersedia",
  }));

  if (filters.status && filters.status !== "all") {
    books = books.filter((b) => b.status === filters.status);
  }

  if (filters.year) {
    books = books.filter((b) => b.tahun === filters.year);
  }

  if (filters.genre) {
    books = books.filter((b) => b.genre === filters.genre);
  }

  if (filters.type) {
    books = books.filter((b) => b.type === filters.type);
  }

  if (filters.search) {
    const s = filters.search.toLowerCase();
    books = books.filter(
      (b) =>
        b.judul.toLowerCase().includes(s) ||
        b.penulis.toLowerCase().includes(s) ||
        b.penerbit.toLowerCase().includes(s)
    );
  }

  switch (filters.sort) {
    case "oldest":
      books.sort((a, b) => a.tahun - b.tahun);
      break;
    case "title":
      books.sort((a, b) => a.judul.localeCompare(b.judul));
      break;
    case "pages":
      books.sort((a, b) => b.halaman - a.halaman);
      break;
    default:
      books.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  return books;
}

export async function getBook(id: string): Promise<{ book: Book; serupa: Book[] }> {
  const snap = await get(ref(db, `public_books/${id}`));
  if (!snap.exists()) throw new Error("Buku tidak ditemukan");
  const status = await getBookStatus(id);
  const book = { id: snap.key!, ...snap.val(), status } as Book;

  const allSnap = await get(ref(db, "public_books"));
  const allBooks = snapshotToArray<Book>(allSnap).filter((b) => b.id !== id);

  // Score similarity by matching author (+3) and genre (+2)
  const scored = allBooks.map((other) => {
    let score = 0;
    if (book.genre && other.genre && other.genre.toLowerCase() === book.genre.toLowerCase()) {
      score += 2;
    }
    if (book.penulis && other.penulis && other.penulis.toLowerCase() === book.penulis.toLowerCase()) {
      score += 3;
    }
    return { book: other, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const serupa = scored.slice(0, 3).map((s) => s.book);

  return { book, serupa };
}

export async function getLatestBooks(count = 3): Promise<Book[]> {
  const snap = await get(ref(db, "public_books"));
  const books = snapshotToArray<Book>(snap);
  return books.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, count);
}

export async function getDistinctYears(): Promise<number[]> {
  const snap = await get(ref(db, "public_books"));
  const books = snapshotToArray<Book>(snap);
  const years = new Set(books.map((b) => b.tahun));
  return Array.from(years).sort((a, b) => b - a);
}

export async function getBookStats(): Promise<{ total: number; available: number; members: number }> {
  const [booksSnap, membersSnap, statusesSnap] = await Promise.all([
    get(ref(db, "public_books")),
    get(ref(db, "public_stats/members")),
    get(ref(db, "book_status")),
  ]);
  const books = snapshotToArray<Book>(booksSnap);
  const total = books.length;
  const statusMap: Record<string, string> = {};
  if (statusesSnap.exists()) {
    for (const [k, v] of Object.entries(statusesSnap.val())) {
      statusMap[k] = availability(v as any);
    }
  }
  const available = books.filter((b) => (statusMap[b.id] || b.status || "Tersedia") === "Tersedia").length;
  const members = membersSnap.exists() ? Number(membersSnap.val()) || 0 : 0;
  return { total, available, members };
}

// ===== Admin Book CRUD =====
export async function createBook(bookData: Omit<Book, "id">): Promise<string> {
  const result = await postApi<{ bookId: string }>('save-book', { bookData });
  return result.bookId;
}

export async function updateBook(bookId: string, bookData: Partial<Book>): Promise<void> {
  await postApi('save-book', { bookId, bookData });
}

export async function deleteBook(bookId: string): Promise<void> {
  await postApi('delete-book', { bookId });
}

// ===== Categories =====
export function getGenreCategories(): string[] {
  return ["Fiksi", "Non-Fiksi", "Teknologi", "Sains", "Pendidikan", "Sejarah", "Novel", "Self-Help", "Komputer", "Desain"];
}

// ===== Book Recommendations =====
export async function getRecommendations(userId: string): Promise<Book[]> {
  // Get user's favorite genres
  const favIds = await getUserFavorites(userId);
  if (favIds.length === 0) {
    // No favorites, return popular books
    return getLatestBooks(6);
  }

  // Get favorite books to find genres
  const favBooks: Book[] = [];
  for (const id of favIds.slice(0, 5)) {
    const snap = await get(ref(db, `public_books/${id}`));
    if (snap.exists()) {
      favBooks.push({ id: snap.key!, ...snap.val() } as Book);
    }
  }

  const favGenres = new Set(favBooks.map(b => b.genre).filter(Boolean));

  // Get all books and filter by matching genres
  const allSnap = await get(ref(db, "public_books"));
  if (!allSnap.exists()) return [];

  const allBooks = snapshotToArray<Book>(allSnap);
  const recommended = allBooks
    .filter(b => !favIds.includes(b.id) && b.genre && favGenres.has(b.genre))
    .slice(0, 6);

  // If not enough, fill with latest books
  if (recommended.length < 6) {
    const latest = allBooks
      .filter(b => !favIds.includes(b.id) && !recommended.find(r => r.id === b.id))
      .slice(0, 6 - recommended.length);
    recommended.push(...latest);
  }

  return recommended;
}

export async function getPopularBooks(): Promise<Book[]> {
  if (!auth.currentUser) return getLatestBooks(6);
  const activities = await get(ref(db, 'aktivitas'));
  const counts: Record<string, number> = {};
  for (const activity of Object.values(activities.val() || {}) as Activity[]) {
    if (activity.type === 'borrow' && activity.bookTitle) counts[activity.bookTitle] = (counts[activity.bookTitle] || 0) + 1;
  }
  const books = snapshotToArray<Book>(await get(ref(db, 'public_books')));
  return books.sort((a, b) => (counts[b.judul] || 0) - (counts[a.judul] || 0)).slice(0, 6);
}

/**
 * AI Smart Recommendation Engine:
 * Combines User Interests + Collaborative Filtering + High Ratings
 */
export async function getSmartRecommendations(userId: string): Promise<{
  personalized: Book[];
  becauseYouRead?: { baseBook: string; books: Book[] };
  collaborative: Book[];
}> {
  try {
    const [allBooksSnap, userBorrows, userFavIds] = await Promise.all([
      get(ref(db, "public_books")),
      getUserBorrowHistory(userId),
      getUserFavorites(userId),
    ]);

    if (!allBooksSnap.exists()) {
      return { personalized: [], collaborative: [] };
    }

    const allBooks = snapshotToArray<Book>(allBooksSnap);
    const readBookIds = new Set([
      ...userBorrows.map((b) => b.bookId),
      ...userFavIds,
    ]);

    // 1. Identify preferred genres & authors
    const genreScores: Record<string, number> = {};
    const authorScores: Record<string, number> = {};
    for (const b of userBorrows) {
      if (b.bookGenre) genreScores[b.bookGenre] = (genreScores[b.bookGenre] || 0) + 2;
    }
    for (const favId of userFavIds) {
      const book = allBooks.find((b) => b.id === favId);
      if (book) {
        if (book.genre) genreScores[book.genre] = (genreScores[book.genre] || 0) + 3;
        if (book.penulis) authorScores[book.penulis] = (authorScores[book.penulis] || 0) + 3;
      }
    }

    // Score unread books
    const scoredBooks = allBooks
      .filter((b) => !readBookIds.has(b.id))
      .map((b) => {
        let score = 0;
        if (b.genre && genreScores[b.genre]) score += genreScores[b.genre];
        if (b.penulis && authorScores[b.penulis]) score += authorScores[b.penulis];
        return { book: b, score };
      })
      .sort((a, b) => b.score - a.score);

    const personalized = scoredBooks.slice(0, 6).map((item) => item.book);

    // "Because You Read X" section
    let becauseYouRead: { baseBook: string; books: Book[] } | undefined;
    if (userBorrows.length > 0) {
      const lastBorrow = userBorrows[userBorrows.length - 1];
      if (lastBorrow && lastBorrow.bookTitle) {
        const related = allBooks
          .filter(
            (b) =>
              b.id !== lastBorrow.bookId &&
              !readBookIds.has(b.id) &&
              (b.genre === lastBorrow.bookGenre || b.penulis === lastBorrow.bookPenulis)
          )
          .slice(0, 4);

        if (related.length > 0) {
          becauseYouRead = {
            baseBook: lastBorrow.bookTitle,
            books: related,
          };
        }
      }
    }

    // Fallback if user is brand new
    if (personalized.length < 4) {
      const remaining = allBooks.filter((b) => !personalized.some((p) => p.id === b.id));
      personalized.push(...remaining.slice(0, 6 - personalized.length));
    }

    return {
      personalized,
      becauseYouRead,
      collaborative: personalized.slice(0, 4),
    };
  } catch (err) {
    console.error("[SmartRecommendations] Error:", err);
    return { personalized: await getLatestBooks(6), collaborative: [] };
  }
}

// Public activities provide popularity without exposing private loan records.
export async function getTrendingBooksThisWeek(count = 6): Promise<Book[]> {
  if (!auth.currentUser) return getLatestBooks(count);
  const [activities, booksSnap] = await Promise.all([
    get(ref(db, 'aktivitas')), get(ref(db, 'public_books')),
  ]);
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const scores: Record<string, number> = {};
  for (const activity of Object.values(activities.val() || {}) as Activity[]) {
    if (activity.type === 'borrow' && activity.bookTitle && Number(activity.createdAt) >= since) {
      scores[activity.bookTitle] = (scores[activity.bookTitle] || 0) + 1;
    }
  }
  return snapshotToArray<Book>(booksSnap).sort((a, b) => (scores[b.judul] || 0) - (scores[a.judul] || 0)).slice(0, count);
}

// Preserve the existing API name; these entries are books shared in the public activity feed.
export async function getFriendsCurrentlyReading(userId: string): Promise<
  { friendName: string; friendPhoto?: string; book: Book }[]
> {
  const [feed, friends, booksSnap] = await Promise.all([
    getFriendsFeed(userId), getFriends(userId), get(ref(db, 'public_books')),
  ]);
  const friendIds = new Set(friends.map(friend => friend.fromUserId === userId ? friend.toUserId : friend.fromUserId));
  const books = snapshotToArray<Book>(booksSnap);
  const seen = new Set<string>();
  const results: { friendName: string; friendPhoto?: string; book: Book }[] = [];
  for (const activity of feed) {
    if (!friendIds.has(activity.userId) || !['borrow', 'return'].includes(activity.type) || !activity.bookTitle) continue;
    const matches = books.filter(book => book.judul === activity.bookTitle);
    if (matches.length !== 1) continue;
    const book = matches[0];
    const key = activity.userId + ':' + book.id;
    if (seen.has(key)) continue;
    seen.add(key);
    if (activity.type === 'return') continue;
    results.push({ friendName: activity.userName || 'Teman', friendPhoto: activity.userPhoto, book });
    if (results.length === 6) break;
  }
  return results;
}

/**
 * Search or lookup a book by its ISBN
 */
export async function getBookByISBN(isbn: string): Promise<Book | null> {
  if (!isbn || !isbn.trim()) return null;
  const cleanIsbn = isbn.replace(/[-\s]/g, "").trim().toLowerCase();

  try {
    const snap = await get(ref(db, "public_books"));
    if (!snap.exists()) return null;

    for (const [id, val] of Object.entries(snap.val())) {
      const b = val as any;
      if (b.isbn) {
        const bookIsbn = String(b.isbn).replace(/[-\s]/g, "").trim().toLowerCase();
        if (bookIsbn === cleanIsbn || bookIsbn.includes(cleanIsbn) || cleanIsbn.includes(bookIsbn)) {
          return { id, ...b } as Book;
        }
      }
    }
  } catch (err) {
    console.error("[GetBookByISBN] Error:", err);
  }

  return null;
}

// ===== Book Availability Notifications =====
export async function subscribeToAvailability(userId: string, bookId: string): Promise<void> {
  // Check if already subscribed
  const snap = await get(ref(db, "availability_subscriptions"));
  if (snap.exists()) {
    for (const val of Object.values(snap.val())) {
      if ((val as any).userId === userId && (val as any).bookId === bookId) return;
    }
  }

  const newRef = push(ref(db, "availability_subscriptions"));
  await set(newRef, {
    userId,
    bookId,
    createdAt: serverTimestamp(),
  });
}

export async function checkAndNotifyAvailability(bookId: string): Promise<void> {
  const snap = await get(ref(db, "availability_subscriptions"));
  if (!snap.exists()) return;

  const all = snap.val();
  const bookSnap = await get(ref(db, `public_books/${bookId}`));
  if (!bookSnap.exists()) return;
  const status = await getBookStatus(bookId);
  if (status !== "Tersedia") return;

  const book = bookSnap.val();
  for (const [id, val] of Object.entries(all)) {
    if ((val as any).bookId === bookId) {
      await addNotification((val as any).userId, {
        type: "system",
        title: "Buku Tersedia!",
        body: `"${book.judul}" sudah tersedia kembali. Silakan pinjam sekarang!`,
        link: "/books",
      });
      // Remove subscription
      await remove(ref(db, `availability_subscriptions/${id}`));
    }
  }
}
