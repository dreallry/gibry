import { AVATAR_FRAMES, isFrameEventActive } from './avatarFrames';
import { ref, get, set, query, orderByChild, equalTo } from "firebase/database";
import { db } from "./firebase";
import type { Achievement, DisplayBadge } from "./types/gamification";
import { getUserProfile, updateUserProfile } from './profiles';

// ===== Achievements =====
export async function checkAndAwardAchievements(userId: string): Promise<Achievement[]> {
  const newAchievements: Achievement[] = [];

  const [borrowsSnap, favSnap, attendanceSnap, reviewsSnap] = await Promise.all([
    get(query(ref(db, "peminjaman"), orderByChild("userId"), equalTo(userId))),
    get(ref(db, "favorit_buku")),
    get(query(ref(db, "daftar_hadir"), orderByChild("userId"), equalTo(userId))),
    get(ref(db, "ulasan")),
  ]);

  let totalBorrows = 0;
  let totalReturns = 0;
  if (borrowsSnap.exists()) {
    const all = borrowsSnap.val();
    for (const val of Object.values(all)) {
      if ((val as any).userId === userId) {
        totalBorrows++;
        if ((val as any).status === "Dikembalikan") totalReturns++;
      }
    }
  }

  let totalFavs = 0;
  if (favSnap.exists()) {
    for (const val of Object.values(favSnap.val())) {
      if ((val as any).userId === userId) totalFavs++;
    }
  }

  let totalAttendance = 0;
  if (attendanceSnap.exists()) {
    const userProfile = await getUserProfile(userId);
    for (const val of Object.values(attendanceSnap.val())) {
      if (userProfile && (val as any).email === userProfile.email) totalAttendance++;
    }
  }

  let totalReviews = 0;
  if (reviewsSnap.exists()) {
    for (const val of Object.values(reviewsSnap.val())) {
      if ((val as any).userId === userId) totalReviews++;
    }
  }

  // Check achievements — using Lucide icon names instead of emojis
  const achievements = [
    { type: "first_borrow", title: "Peminjam Pertama", description: "Meminjam buku pertama kali", icon: "BookOpen", condition: totalBorrows >= 1 },
    { type: "bookworm", title: "Kutu Buku", description: "Meminjam 5 buku", icon: "BookMarked", condition: totalBorrows >= 5 },
    { type: "first_return", title: "Pengembalian Pertama", description: "Mengembalikan buku pertama kali", icon: "RotateCcw", condition: totalReturns >= 1 },
    { type: "collector", title: "Kolektor", description: "Menambahkan 5 buku favorit", icon: "Star", condition: totalFavs >= 5 },
    { type: "first_review", title: "Kritikus Pertama", description: "Menulis ulasan pertama", icon: "PenTool", condition: totalReviews >= 1 },
    { type: "social_reader", title: "Pembaca Aktif", description: "Menulis 3 ulasan", icon: "MessageSquare", condition: totalReviews >= 3 },
    { type: "regular", title: "Pengunjung Tetap", description: "Berkunjung 3 kali", icon: "Building2", condition: totalAttendance >= 3 },
    { type: "dedicated", title: "Pembaca Dedicated", description: "Berkunjung 10 kali", icon: "Trophy", condition: totalAttendance >= 10 },
  ];

  const existSnap = await get(ref(db, `pencapaian/${userId}`));
  const existingTypes = new Set<string>();
  if (existSnap.exists()) {
    for (const val of Object.values(existSnap.val())) {
      if ((val as any).userId === userId) {
        existingTypes.add((val as any).type);
      }
    }
  }

  for (const ach of achievements) {
    if (ach.condition && !existingTypes.has(ach.type)) {
      const newRef = ref(db, `pencapaian/${userId}/${ach.type}`);
      const achievement: Achievement = {
        id: ach.type,
        userId,
        type: ach.type,
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        unlockedAt: Date.now(),
      };
      await set(newRef, achievement);
      newAchievements.push({ ...achievement, id: newRef.key! });
    }
  }

  return newAchievements;
}

export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  const snap = await get(ref(db, `pencapaian/${userId}`));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => (v as any).userId === userId)
    .map(([id, v]: [string, any]) => ({ id, ...v } as Achievement));
}

// ===== Display Badges =====
export async function checkAndAwardDisplayBadges(userId: string): Promise<DisplayBadge[]> {
  const [borrowsSnap, friendsSnap, reviewsSnap, favSnap, profile] = await Promise.all([
    get(query(ref(db, "peminjaman"), orderByChild("userId"), equalTo(userId))),
    get(ref(db, "pertemanan")),
    get(ref(db, "ulasan")),
    get(ref(db, "favorit_buku")),
    getUserProfile(userId),
  ]);

  let totalBorrows = 0;
  const genres = new Set<string>();
  let fastReads = 0;
  let earlyBird = false;
  let activeBorrows = 0;

  if (borrowsSnap.exists()) {
    for (const val of Object.values(borrowsSnap.val())) {
      const b = val as any;
      if (b.userId === userId) {
        totalBorrows++;
        if (b.genre) genres.add(b.genre);
        if (b.status === "Dipinjam") activeBorrows++;
        if (b.tanggalPinjam && b.tanggalKembali) {
          const diff = new Date(b.tanggalKembali).getTime() - new Date(b.tanggalPinjam).getTime();
          if (diff < 3 * 86400000) fastReads++;
        }
        if (b.tanggalPinjam) {
          const h = new Date(b.tanggalPinjam).getHours();
          if (h < 8) earlyBird = true;
        }
      }
    }
  }

  let totalFriends = 0;
  if (friendsSnap.exists()) {
    for (const val of Object.values(friendsSnap.val())) {
      if ((val as any).status === "accepted" && ((val as any).fromUserId === userId || (val as any).toUserId === userId)) {
        totalFriends++;
      }
    }
  }

  let totalReviews = 0;
  let fiveStarReviews = 0;
  if (reviewsSnap.exists()) {
    for (const val of Object.values(reviewsSnap.val())) {
      if ((val as any).userId === userId) {
        totalReviews++;
        if ((val as any).rating === 5) fiveStarReviews++;
      }
    }
  }

  let favoriteCount = 0;
  if (favSnap.exists()) {
    for (const val of Object.values(favSnap.val())) {
      if ((val as any).userId === userId) favoriteCount++;
    }
  }

  const streak = profile?.readingStreak || 0;
  const hour = new Date().getHours();
  const isNightOwl = hour >= 20;

  const badges: DisplayBadge[] = [
    { type: "bookworm", title: "Kutu Buku", description: "Meminjam 5 buku", unlocked: totalBorrows >= 5 },
    { type: "elite_reader", title: "Elite Reader", description: "Meminjam 20 buku", unlocked: totalBorrows >= 20 },
    { type: "social_butterfly", title: "Social Butterfly", description: "Punya 10 teman", unlocked: totalFriends >= 10 },
    { type: "perfect_score", title: "Perfect Score", description: "Rating 5★ di 3 ulasan", unlocked: fiveStarReviews >= 3 },
    { type: "streak_master", title: "Streak Master", description: "Streak 7 hari", unlocked: streak >= 7 },
    { type: "night_owl", title: "Night Owl", description: "Meminjam setelah jam 8 malam", unlocked: isNightOwl },
    { type: "speed_reader", title: "Speed Reader", description: "Selesai membaca < 3 hari", unlocked: fastReads >= 1 },
    { type: "genre_explorer", title: "Genre Explorer", description: "Pinjam 5 genre berbeda", unlocked: genres.size >= 5 },
    { type: "early_bird", title: "Early Bird", description: "Pinjam sebelum jam 8 pagi", unlocked: earlyBird },
    { type: "critic", title: "Buku Kritis", description: "Tulis 10 ulasan buku", unlocked: totalReviews >= 10 },
    { type: "gem_collector", title: "Gem Collector", description: "Kumpulkan 50 favorit", unlocked: favoriteCount >= 50 },
    { type: "marathon_reader", title: "Marathon Reader", description: "Pinjam 10 buku sekaligus", unlocked: activeBorrows >= 10 },
  ];

  return badges;
}

// ===== Reading Streak =====
export async function updateReadingStreak(userId: string): Promise<{ streak: number; freezeUsed: boolean; freezeAwarded: boolean }> {
  const userProfile = await getUserProfile(userId);
  if (!userProfile) return { streak: 0, freezeUsed: false, freezeAwarded: false };

  const today = new Date().toISOString().split("T")[0];
  const lastDate = userProfile.lastReadingDate || "";
  let streak = userProfile.readingStreak || 0;
  let streakFreezes = userProfile.streakFreezes || 0;
  let freezeUsed = false;
  let freezeAwarded = false;

  if (lastDate === today) {
    return { streak, freezeUsed: false, freezeAwarded: false };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (lastDate === yesterdayStr) {
    // Consecutive day
    streak += 1;
  } else if (lastDate !== today) {
    // Streak broken — check if freeze available
    const daysSinceLast = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000);
    if (daysSinceLast <= 2 && streakFreezes > 0) {
      // Missed 1-2 days, use freeze
      streakFreezes -= 1;
      freezeUsed = true;
      // streak stays the same, not reset
    } else {
      streak = 1;
    }
  }

  // Award 1 freeze every 7 days of streak
  if (streak > 0 && streak % 7 === 0 && !freezeUsed) {
    if (streakFreezes < 3) {
      streakFreezes += 1;
      freezeAwarded = true;
    }
  }

  await updateUserProfile(userId, {
    readingStreak: streak,
    lastReadingDate: today,
    streakFreezes,
  });

  return { streak, freezeUsed, freezeAwarded };
}

export async function useStreakFreeze(userId: string): Promise<boolean> {
  const userProfile = await getUserProfile(userId);
  if (!userProfile || (userProfile.streakFreezes || 0) <= 0) return false;

  const today = new Date().toISOString().split("T")[0];
  // Set lastReadingDate to yesterday so tomorrow's check-in extends streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  await updateUserProfile(userId, {
    lastReadingDate: yesterdayStr,
    streakFreezes: (userProfile.streakFreezes || 0) - 1,
  });
  return true;
}

export async function setDisplayBadge(userId: string, badge: string | null): Promise<void> {
  await updateUserProfile(userId, { displayBadge: badge });
}

// ===== Avatar Frames =====
export async function setAvatarFrame(userId: string, frameId: string | null): Promise<void> {
  await updateUserProfile(userId, { avatarFrame: frameId });
}

export async function claimEventAvatarFrame(
  userId: string,
  frameId: string
): Promise<{ success: boolean; message: string }> {
  const targetFrame = AVATAR_FRAMES.find((f) => f.id === frameId);
  if (!targetFrame) {
    return { success: false, message: "Bingkai avatar tidak ditemukan." };
  }

  const activeCheck = isFrameEventActive(targetFrame);
  if (!activeCheck.isActive) {
    return { success: false, message: activeCheck.reason };
  }

  const snap = await get(ref(db, `anggota/${userId}`));
  const profile = snap.exists() ? snap.val() : {};
  const currentUnlocked: string[] = Array.isArray(profile.unlockedFrames) ? [...profile.unlockedFrames] : [];

  if (!currentUnlocked.includes(frameId)) {
    currentUnlocked.push(frameId);
  }

  await updateUserProfile(userId, {
    avatarFrame: frameId,
    unlockedFrames: currentUnlocked,
  });

  return { success: true, message: `Bingkai '${targetFrame.name}' berhasil diklaim & dipasang!` };
}

export async function unlockAvatarFrame(userId: string, frameId: string): Promise<void> {
  const snap = await get(ref(db, `anggota/${userId}`));
  const profile = snap.exists() ? snap.val() : {};
  const currentUnlocked: string[] = Array.isArray(profile.unlockedFrames) ? [...profile.unlockedFrames] : [];
  if (!currentUnlocked.includes(frameId)) {
    currentUnlocked.push(frameId);
    await updateUserProfile(userId, { unlockedFrames: currentUnlocked });
  }
}
