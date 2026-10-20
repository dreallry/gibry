import { postApi } from './api';
import { ref, get, onValue } from "firebase/database";
import { db } from "./firebase";
import type { UserProfile } from "./types/user";
import { auth } from "./firebase";
import { LEVEL_THRESHOLDS } from "./constants";

// ===== User Likes Count =====
export async function getUserLikesCount(userId: string): Promise<number> {
  const snap = await get(ref(db, `user_likes_count/${userId}`));
  if (!snap.exists()) return 0;
  return snap.val().count || 0;
}

export async function getAllUserLikesCounts(): Promise<Record<string, number>> {
  const snap = await get(ref(db, "user_likes_count"));
  if (!snap.exists()) return {};
  const data = snap.val();
  const result: Record<string, number> = {};
  for (const [uid, val] of Object.entries(data)) {
    result[uid] = (val as any).count || 0;
  }
  return result;
}

// ===== User Points =====
export async function getUserPoints(userId: string): Promise<{ totalPoints: number; level: number }> {
  const snap = await get(ref(db, `user_points/${userId}`));
  if (!snap.exists()) {
    const profilePath = userId === auth.currentUser?.uid ? 'anggota' : 'public_profiles';
    const profileSnap = await get(ref(db, `${profilePath}/${userId}`));
    if (profileSnap.exists()) {
      const pts = profileSnap.val().totalPoints || 0;
      return { totalPoints: pts, level: calculateLevel(pts).level };
    }
    return { totalPoints: 0, level: 1 };
  }
  return { totalPoints: snap.val().totalPoints || 0, level: snap.val().level || 1 };
}

// ===== Points & Level System =====
export function calculateLevel(totalPoints: number): { level: number; title: string; nextLevelPoints: number } {
  let level = 1;
  let title = "Pemula";
  let nextLevelPoints = 50;

  for (const threshold of LEVEL_THRESHOLDS) {
    if (totalPoints >= threshold.minPoints) {
      level = threshold.level;
      title = threshold.title;
    }
  }

  // Find next threshold
  const currentThresholdIdx = LEVEL_THRESHOLDS.findIndex(t => t.level === level);
  if (currentThresholdIdx < LEVEL_THRESHOLDS.length - 1) {
    nextLevelPoints = LEVEL_THRESHOLDS[currentThresholdIdx + 1].minPoints;
  } else {
    nextLevelPoints = totalPoints; // Max level
  }

  return { level, title, nextLevelPoints };
}

export async function addPoints(userId: string, _amount: number): Promise<void> {
  if (userId !== auth.currentUser?.uid) return;
  await postApi('sync-points', { userId });
}

export async function deductPoints(userId: string, amount: number): Promise<void> {
  if (userId !== auth.currentUser?.uid) throw new Error('Saldo bukan milik Anda.');
  await postApi('spend-points', { amount });
}

export function onLeaderboardChanged(limit: number = 20, callback: (users: UserProfile[]) => void): () => void {
  function buildLeaderboard(anggotaData: any, likesData: any, pointsData: any): UserProfile[] {
    if (!anggotaData || typeof anggotaData !== "object") return [];

    // Build likes count map
    const likesMap: Record<string, number> = {};
    if (likesData && typeof likesData === "object") {
      for (const [uid, val] of Object.entries(likesData)) {
        likesMap[uid] = (val as any).count || 0;
      }
    }

    // Build points map from user_points
    const pointsMap: Record<string, { totalPoints: number; level: number }> = {};
    if (pointsData && typeof pointsData === "object") {
      for (const [uid, val] of Object.entries(pointsData)) {
        pointsMap[uid] = { totalPoints: (val as any).totalPoints || 0, level: (val as any).level || 1 };
      }
    }

    const userMap = new Map<string, UserProfile>();
    Object.entries(anggotaData).forEach(([id, v]: [string, any]) => {
      if (!v || typeof v !== "object") return;
      const user = { uid: id, ...v } as UserProfile;

      // Filter out admin, librarian, or accounts named Administrator
      const isRoleAdmin = user.role === "admin" || user.role === "librarian";
      const isNameAdmin = user.nama?.toLowerCase().includes("administrator");
      const isEmailAdmin = user.email?.toLowerCase().includes("admin");
      if (isRoleAdmin || isNameAdmin || isEmailAdmin) return;

      // Override from user_points and user_likes_count
      if (pointsMap[id]) {
        user.totalPoints = pointsMap[id].totalPoints;
        user.level = pointsMap[id].level;
      }
      user.likesCount = likesMap[id] || 0;
      user.kudosCount = user.likesCount;

      const key = user.email ? user.email.toLowerCase() : user.nama ? user.nama.toLowerCase() : id;
      const existing = userMap.get(key);
      if (!existing || (user.totalPoints || 0) > (existing.totalPoints || 0)) {
        userMap.set(key, user);
      }
    });

    return Array.from(userMap.values())
      .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
      .slice(0, limit);
  }

  let anggotaSnap: any = null;
  let likesSnap: any = null;
  let pointsSnap: any = null;

  function emit() {
    if (!anggotaSnap) return;
    const users = buildLeaderboard(anggotaSnap.val(), likesSnap?.val() || null, pointsSnap?.val() || null);
    callback(users);
  }

  const anggotaUnsub = onValue(ref(db, "public_profiles"), (snap) => {
    anggotaSnap = snap;
    emit();
  }, (err) => {
    console.error("Leaderboard listener error:", err);
    callback([]);
  });

  const likesUnsub = onValue(ref(db, "user_likes_count"), (snap) => {
    likesSnap = snap;
    emit();
  });

  const pointsUnsub = onValue(ref(db, "user_points"), (snap) => {
    pointsSnap = snap;
    emit();
  });

  return () => {
    anggotaUnsub();
    likesUnsub();
    pointsUnsub();
  };
}

export async function claimDailyXP(userId: string): Promise<{ success: boolean; pointsAwarded: number; alreadyClaimed: boolean }> {
  if (userId !== auth.currentUser?.uid) throw new Error('Saldo bukan milik Anda.');
  return postApi('claim-daily-xp', {});
}

export async function giveLike(fromUserId: string, targetUserId: string): Promise<{ success: boolean; newLikes: number }> {
  if (fromUserId !== auth.currentUser?.uid) throw new Error('Pengirim like tidak valid.');
  return postApi('give-like', { targetUserId });
}

export const giveKudos = giveLike;

// ===== Leaderboard =====
export async function getLeaderboard(limit: number = 20): Promise<UserProfile[]> {
  const snap = await get(ref(db, "public_profiles"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .map(([id, v]: [string, any]) => ({ uid: id, ...(v as any) } as UserProfile))
    .filter((user) => {
      const isRoleAdmin = user.role === "admin" || user.role === "librarian";
      const isNameAdmin = user.nama?.toLowerCase().includes("administrator");
      const isEmailAdmin = user.email?.toLowerCase().includes("admin");
      return !isRoleAdmin && !isNameAdmin && !isEmailAdmin;
    })
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
    .slice(0, limit);
}
