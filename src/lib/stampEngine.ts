import { ref, get, set, update } from "firebase/database";
import { db } from "./firebase";
import { STAMP_DEFINITIONS, type UserStamp, type StampDefinition } from "./types/stamp";
import { addNotification } from "./firestore";
import { eventBus } from "./eventBus";

/**
 * Get all stamps unlocked by a user
 */
export async function getUserStamps(userId: string): Promise<UserStamp[]> {
  try {
    const snap = await get(ref(db, `user_stamps/${userId}`));
    if (!snap.exists()) return [];
    const val = snap.val();
    return Object.entries(val).map(([id, data]: [string, any]) => ({
      id,
      userId,
      unlockedAt: data.unlockedAt || Date.now(),
      featuredInProfile: !!data.featuredInProfile,
    }));
  } catch (err) {
    console.error("[StampEngine] Failed to get user stamps:", err);
    return [];
  }
}

/**
 * Check and award all eligible stamps for a user
 */
export async function evaluateUserStamps(userId: string): Promise<UserStamp[]> {
  if (!userId) return [];

  try {
    const existingStamps = await getUserStamps(userId);
    const existingIds = new Set(existingStamps.map((s) => s.id));

    // Fetch necessary user statistics in parallel
    const [borrowsSnap, attendanceSnap, reviewsSnap, wishlistSnap, profileSnap, clubsSnap] = await Promise.all([
      get(ref(db, "peminjaman")),
      get(ref(db, "daftar_hadir")),
      get(ref(db, "ulasan")),
      get(ref(db, `wishlists/${userId}`)),
      get(ref(db, `anggota/${userId}`)),
      get(ref(db, "club_members")),
    ]);

    // 1. Process borrows
    let userBorrows: any[] = [];
    if (borrowsSnap.exists()) {
      userBorrows = Object.values(borrowsSnap.val()).filter((b: any) => b.userId === userId);
    }

    const techBorrows = userBorrows.filter(
      (b) => b.genre && (b.genre.toLowerCase().includes("teknologi") || b.genre.toLowerCase().includes("komputer"))
    ).length;

    const fictionBorrows = userBorrows.filter(
      (b) => b.genre && (b.genre.toLowerCase().includes("fiksi") || b.genre.toLowerCase().includes("novel"))
    ).length;

    const scienceBorrows = userBorrows.filter(
      (b) => b.genre && (b.genre.toLowerCase().includes("sains") || b.genre.toLowerCase().includes("pendidikan"))
    ).length;

    const historyBorrows = userBorrows.filter(
      (b) => b.genre && b.genre.toLowerCase().includes("sejarah")
    ).length;

    // Speed check: any returned book returned in < 3 days
    const hasFastReturn = userBorrows.some((b) => {
      if (b.status === "kembali" && b.tanggalPinjam && b.tanggalKembali) {
        const d1 = new Date(b.tanggalPinjam).getTime();
        const d2 = new Date(b.tanggalKembali).getTime();
        const diffDays = (d2 - d1) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 3;
      }
      return false;
    });

    const onTimeReturnsCount = userBorrows.filter(
      (b) => b.status === "kembali" && (!b.denda || b.denda === 0)
    ).length;

    const hasDigitalBook = userBorrows.some(
      (b) => b.bookType === "digital" || b.pdfUrl
    );

    // 2. Attendance count
    let attendanceCount = 0;
    if (attendanceSnap.exists()) {
      attendanceCount = Object.values(attendanceSnap.val()).filter((a: any) => a.userId === userId).length;
    }

    // 3. Reviews count
    let reviewsCount = 0;
    if (reviewsSnap.exists()) {
      reviewsCount = Object.values(reviewsSnap.val()).filter((r: any) => r.userId === userId).length;
    }

    // 4. Wishlist count
    let wishlistCount = 0;
    if (wishlistSnap.exists()) {
      wishlistCount = Object.keys(wishlistSnap.val()).length;
    }

    // 5. Streak
    const streak = profileSnap.exists() ? (profileSnap.val().readingStreak || 0) : 0;

    // 6. Club membership
    let joinedClubCount = 0;
    if (clubsSnap.exists()) {
      const allMembers = clubsSnap.val();
      for (const clubId in allMembers) {
        if (allMembers[clubId] && allMembers[clubId][userId]) {
          joinedClubCount++;
        }
      }
    }

    // Evaluate each stamp definition
    const newlyUnlocked: UserStamp[] = [];

    for (const def of STAMP_DEFINITIONS) {
      if (existingIds.has(def.id)) continue;

      let qualified = false;

      switch (def.id) {
        case "stamp_genre_tech":
          qualified = techBorrows >= 3;
          break;
        case "stamp_genre_fiction":
          qualified = fictionBorrows >= 5;
          break;
        case "stamp_genre_science":
          qualified = scienceBorrows >= 3;
          break;
        case "stamp_genre_history":
          qualified = historyBorrows >= 2;
          break;
        case "stamp_speed_lightning":
          qualified = hasFastReturn;
          break;
        case "stamp_ontime_hero":
          qualified = onTimeReturnsCount >= 5;
          break;
        case "stamp_social_critic":
          qualified = reviewsCount >= 3;
          break;
        case "stamp_social_butterfly":
          qualified = joinedClubCount >= 1;
          break;
        case "stamp_streak_week":
          qualified = streak >= 7;
          break;
        case "stamp_presensi_regular":
          qualified = attendanceCount >= 5;
          break;
        case "stamp_collector_wishlist":
          qualified = wishlistCount >= 5;
          break;
        case "stamp_digital_nomad":
          qualified = hasDigitalBook;
          break;
      }

      if (qualified) {
        const stampObj: UserStamp = {
          id: def.id,
          userId,
          unlockedAt: Date.now(),
        };

        // Save to RTDB
        await set(ref(db, `user_stamps/${userId}/${def.id}`), {
          unlockedAt: stampObj.unlockedAt,
        });

        // Send App Notification
        await addNotification(userId, {
          title: `Cap Paspor Baru: ${def.title}!`,
          body: `Selamat! Kamu membuka stamp "${def.title}" (${def.badgeCode})!`,
          type: "system",
          link: "/passport",
        });

        // Emit on EventBus
        eventBus.emit({
          type: "stamp:unlocked",
          payload: { userId, stampId: def.id, stampTitle: def.title },
        });

        newlyUnlocked.push(stampObj);
      }
    }

    return [...existingStamps, ...newlyUnlocked];
  } catch (err) {
    console.error("[StampEngine] Error evaluating stamps:", err);
    return [];
  }
}

/**
 * Toggle featured stamp in user's profile
 */
export async function toggleFeaturedStamp(userId: string, stampId: string): Promise<boolean> {
  const stampRef = ref(db, `user_stamps/${userId}/${stampId}`);
  const snap = await get(stampRef);
  if (!snap.exists()) return false;

  const current = !!snap.val().featuredInProfile;
  await update(stampRef, { featuredInProfile: !current });
  return !current;
}
