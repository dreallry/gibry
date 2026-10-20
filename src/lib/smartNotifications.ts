import { ref, get, runTransaction, query, orderByChild, equalTo } from "firebase/database";
import { db } from "./firebase";
import { addNotification } from "./notifications";
import { snapshotToArray } from "./database";
import type { Borrow } from "./types/borrow";

async function notifyOnce(userId: string, key: string, data: { title: string; body: string; type: "borrow" | "system"; link: string }) {
  await runTransaction(ref(db, `notifikasi/${userId}/${key}`), current => current ? undefined : {
    ...data, userId, fromUserId: userId, message: data.body.slice(0, 300), read: false, createdAt: Date.now(),
  }, { applyLocally: false });
}

/**
 * Check and send proactive deadline notifications (H-2, H-1, Overdue)
 */
export async function checkUserUpcomingDeadlines(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const snap = await get(query(ref(db, "peminjaman"), orderByChild("userId"), equalTo(userId)));
    if (!snap.exists()) return;

    const userActiveBorrows = snapshotToArray<Borrow>(snap).filter((b) =>
      b.bookType === "fisik" && ["Dipinjam", "Terlambat", "Menunggu Pengambilan"].includes(b.status) && b.batasKembali);

    const now = new Date();
    const todayStr = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);

    for (const b of userActiveBorrows) {
      const dueDate = new Date(`${b.batasKembali}T00:00:00+07:00`);
      const diffMs = dueDate.getTime() - Date.parse(`${todayStr}T00:00:00+07:00`);
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // Key to avoid duplicate notifications on the same day
      const checkKey = `deadline_${b.id}_${diffDays}_${todayStr}`;
      if (diffDays === 2) {
        await notifyOnce(userId, checkKey, {
          title: "Pengingat Pengembalian (H-2)",
          body: `Buku "${b.bookTitle}" jatuh tempo 2 hari lagi. Segera kembalikan atau perpanjang ya!`,
          type: "borrow",
          link: "/profile",
        });
      } else if (diffDays === 1) {
        await notifyOnce(userId, checkKey, {
          title: "Besok Batas Waktu! (H-1)",
          body: `Besok adalah hari terakhir peminjaman buku "${b.bookTitle}". Hindari denda keterlambatan!`,
          type: "borrow",
          link: "/profile",
        });
      } else if (diffDays === 0) {
        await notifyOnce(userId, checkKey, {
          title: "Batas Pengembalian Hari Ini",
          body: `Hari ini batas pengembalian buku "${b.bookTitle}". Kembalikan ke petugas agar tidak terkena denda.`,
          type: "borrow", link: "/transactions",
        });
      } else if (diffDays < 0) {
        await notifyOnce(userId, checkKey, {
          title: "Perhatian: Peminjaman Terlambat",
          body: `Buku "${b.bookTitle}" telah melewati batas pengembalian. Mohon segera mengembalikan ke perpustakaan.`,
          type: "borrow",
          link: "/profile",
        });
      }
    }
  } catch (err) {
    console.error("[SmartNotifications] Error checking deadlines:", err);
  }
}

/**
 * Check if user's reading streak is at risk of resetting
 */
export async function checkStreakAtRisk(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const profileSnap = await get(ref(db, `anggota/${userId}`));
    if (!profileSnap.exists()) return;

    const profile = profileSnap.val();
    const streak = profile.readingStreak || 0;
    if (streak < 2) return;

    const wibNow = new Date(Date.now() + 7 * 3600000);
    const todayStr = wibNow.toISOString().slice(0, 10);
    const lastActive = profile.lastReadingDate || profile.lastStreakDate || "";

    if (lastActive !== todayStr) {
      const checkKey = `streak_risk_${todayStr}`;
      // Send reminder late in the day (after 14:00 WIB)
      const currentHour = wibNow.getUTCHours();
      if (currentHour >= 14) {
        await notifyOnce(userId, checkKey, {
          title: "Pertahankan Streak Membacamu! 🔥",
          body: `Kamu memiliki ${streak} hari streak! Kunjungi perpustakaan atau klaim Daily XP hari ini agar streak tidak hangus.`,
          type: "system",
          link: "/profile",
        });
      }
    }
  } catch (err) {
    console.error("[SmartNotifications] Error checking streak risk:", err);
  }
}

/**
 * Notify users when a book in their wishlist becomes available
 */
export async function notifyWishlistUsersBookAvailable(bookId: string, bookTitle: string): Promise<void> {
  if (!bookId) return;

  try {
    const wishlistsSnap = await get(ref(db, "wishlists"));
    if (!wishlistsSnap.exists()) return;

    const allWishlists = wishlistsSnap.val();
    for (const [userId, userWishlist] of Object.entries(allWishlists)) {
      if (userWishlist && (userWishlist as any)[bookId]) {
        await addNotification(userId, {
          title: "Buku Incaran Tersedia! 📚",
          body: `Kabar baik! Buku "${bookTitle}" yang kamu simpan di Wishlist kini sudah tersedia untuk dipinjam.`,
          type: "system",
          link: "/books",
        });
      }
    }
  } catch (err) {
    console.error("[SmartNotifications] Error notifying wishlist users:", err);
  }
}
