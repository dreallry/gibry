import { ref, get, set, push, remove, serverTimestamp, query, orderByChild, equalTo } from "firebase/database";
import { db } from "./firebase";
import type { Book } from "./types/book";
import type { ReadingList } from "./types/reading";
import { eventBus } from "./eventBus";

// ===== Favorites =====
export async function toggleFavorite(userId: string, bookId: string): Promise<"added" | "removed"> {
  const favSnap = await get(ref(db, "favorit_buku"));
  let existingKey: string | null = null;

  if (favSnap.exists()) {
    const favs = favSnap.val();
    for (const [key, val] of Object.entries(favs)) {
      if ((val as any).userId === userId && (val as any).bookId === bookId) {
        existingKey = key;
        break;
      }
    }
  }

  if (existingKey) {
    await remove(ref(db, `favorit_buku/${existingKey}`));
    return "removed";
  } else {
    const newRef = push(ref(db, "favorit_buku"));
    await set(newRef, { userId, bookId, createdAt: serverTimestamp() });
    return "added";
  }
}

export async function getUserFavorites(userId: string): Promise<string[]> {
  const snap = await get(ref(db, "favorit_buku"));
  if (!snap.exists()) return [];
  const favs = snap.val();
  return Object.values(favs)
    .filter((v: any) => v.userId === userId)
    .map((v: any) => v.bookId as string);
}

export async function getUserFavoriteBooks(userId: string): Promise<Book[]> {
  const favIds = await getUserFavorites(userId);
  if (favIds.length === 0) return [];
  const catalog = await get(ref(db, "public_books"));
  const allBooks = catalog.exists() ? catalog.val() : {};
  return favIds.flatMap((id) => allBooks[id] ? [{ id, ...allBooks[id] } as Book] : []);
}

// ===== Wishlists =====

export async function toggleWishlist(userId: string, bookId: string): Promise<boolean> {
  const snap = await get(ref(db, "wishlists"));
  if (snap.exists()) {
    const all = snap.val();
    const existing = Object.entries(all).find(
      ([, v]: [string, any]) => v.userId === userId && v.bookId === bookId
    );
    if (existing) {
      await remove(ref(db, `wishlists/${existing[0]}`));
      return false; // removed
    }
  }
  const newRef = push(ref(db, "wishlists"));
  await set(newRef, { userId, bookId, addedAt: serverTimestamp() });
  try {
    eventBus.emit({
      type: "book:wishlisted",
      payload: { userId, bookId },
    });
  } catch { }
  return true; // added
}

export async function isInWishlist(userId: string, bookId: string): Promise<boolean> {
  const snap = await get(ref(db, "wishlists"));
  if (!snap.exists()) return false;
  const all = snap.val();
  return Object.values(all).some(
    (v: any) => v.userId === userId && v.bookId === bookId
  );
}

export async function getUserWishlist(userId: string): Promise<Book[]> {
  const snap = await get(ref(db, "wishlists"));
  if (!snap.exists()) return [];
  const all = snap.val();
  const ids = Object.values(all).filter((val: any) => val.userId === userId).map((val: any) => val.bookId);
  if (ids.length === 0) return [];
  const catalog = await get(ref(db, "public_books"));
  const allBooks = catalog.exists() ? catalog.val() : {};
  return ids.flatMap((id) => allBooks[id] ? [{ id, ...allBooks[id] } as Book] : []);
}

export async function getWishlistCount(bookId: string): Promise<number> {
  const snap = await get(ref(db, "wishlists"));
  if (!snap.exists()) return 0;
  const all = snap.val();
  return Object.values(all).filter((v: any) => v.bookId === bookId).length;
}

// ===== Curated Reading Lists =====

export async function createReadingList(data: { title: string; description: string; bookIds: string[]; createdBy: string; isPublic: boolean }): Promise<string> {
  const newRef = push(ref(db, "reading_lists"));
  await set(newRef, { ...data, createdAt: serverTimestamp() });
  return newRef.key!;
}

export async function getPublicReadingLists(): Promise<ReadingList[]> {
  const snap = await get(query(ref(db, "reading_lists"), orderByChild("isPublic"), equalTo(true)));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => (v as any).isPublic)
    .map(([id, v]: [string, any]) => ({ id, ...v } as ReadingList))
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
}

export async function getReadingListWithBooks(listId: string): Promise<ReadingList | null> {
  const snap = await get(ref(db, `reading_lists/${listId}`));
  if (!snap.exists()) return null;
  const list = { id: listId, ...snap.val() } as ReadingList;
  // Fetch books
  const books: Book[] = [];
  for (const bookId of list.bookIds || []) {
    const bookSnap = await get(ref(db, `public_books/${bookId}`));
    if (bookSnap.exists()) {
      books.push({ id: bookSnap.key!, ...bookSnap.val() } as Book);
    }
  }
  list.books = books;
  return list;
}

export async function deleteReadingList(listId: string): Promise<void> {
  await remove(ref(db, `reading_lists/${listId}`));
}
