import { addNotification } from './notifications';
import { ref, get, set, push, update, remove, serverTimestamp } from "firebase/database";
import { db } from "./firebase";
import type { SeasonalEvent, UserEventProgress, ReadingChallenge, UserChallenge } from "./types/event";

// ===== Reading Challenges =====
export async function getActiveChallenges(): Promise<ReadingChallenge[]> {
  const today = new Date().toISOString().split("T")[0];
  const snap = await get(ref(db, "challenges"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => {
      const challenge = v as any;
      return challenge.startDate <= today && challenge.endDate >= today;
    })
    .map(([id, v]: [string, any]) => ({ id, ...v } as ReadingChallenge));
}

export async function getUserChallenges(userId: string): Promise<UserChallenge[]> {
  const snap = await get(ref(db, "user_challenges"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => (v as any).userId === userId)
    .map(([id, v]: [string, any]) => ({ id, ...v } as UserChallenge));
}

export async function joinChallenge(userId: string, challengeId: string): Promise<void> {
  // Check if already joined
  const existing = await getUserChallenges(userId);
  if (existing.find(uc => uc.challengeId === challengeId)) return;

  const newRef = push(ref(db, "user_challenges"));
  await set(newRef, {
    userId,
    challengeId,
    current: 0,
    completed: false,
    createdAt: serverTimestamp(),
  });
}

export async function updateChallengeProgress(userId: string, challengeId: string): Promise<void> {
  const userChallenges = await getUserChallenges(userId);
  const uc = userChallenges.find(c => c.challengeId === challengeId);
  if (!uc || uc.completed) return;

  const challenge = (await get(ref(db, `challenges/${challengeId}`))).val();
  if (!challenge) return;

  const newCurrent = uc.current + 1;
  const completed = newCurrent >= challenge.target;

  await update(ref(db, `user_challenges/${uc.id}`), {
    current: newCurrent,
    completed,
    completedAt: completed ? serverTimestamp() : null,
  });

  if (completed) {
    await addNotification(userId, {
      type: "system",
      title: "Tantangan Selesai!",
      body: `Anda berhasil menyelesaikan "${challenge.title}"!`,
      link: "/events",
    });
  }
}

export async function getActiveEvents(): Promise<SeasonalEvent[]> {
  const snap = await get(ref(db, "seasonal_events"));
  if (!snap.exists()) return [];
  const all = snap.val();
  const now = Date.now();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => {
      const event = v as any;
      const start = new Date(event.startDate).getTime();
      const end = new Date(event.endDate).getTime();
      return now >= start && now <= end;
    })
    .map(([id, v]: [string, any]) => ({ id, ...v } as SeasonalEvent))
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
}

export async function getAllEvents(): Promise<SeasonalEvent[]> {
  const snap = await get(ref(db, "seasonal_events"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .map(([id, v]: [string, any]) => ({ id, ...v } as SeasonalEvent))
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

export async function createSeasonalEvent(data: Omit<SeasonalEvent, "id" | "createdAt">): Promise<string> {
  const newRef = push(ref(db, "seasonal_events"));
  await set(newRef, { ...data, createdAt: serverTimestamp() });
  return newRef.key!;
}

export async function joinEvent(userId: string, eventId: string): Promise<void> {
  // Check if already joined
  const snap = await get(ref(db, "user_event_progress"));
  if (snap.exists()) {
    const all = snap.val();
    for (const val of Object.values(all)) {
      if ((val as any).userId === userId && (val as any).eventId === eventId) {
        return; // Already joined
      }
    }
  }
  const newRef = push(ref(db, "user_event_progress"));
  await set(newRef, {
    userId,
    eventId,
    progress: 0,
    completed: false,
    joinedAt: serverTimestamp(),
  });
}

export async function getUserEventProgress(userId: string): Promise<UserEventProgress[]> {
  const snap = await get(ref(db, "user_event_progress"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => (v as any).userId === userId)
    .map(([id, v]: [string, any]) => ({ id, ...v } as UserEventProgress));
}

export async function updateEventProgress(userId: string, eventId: string, progress: number): Promise<void> {
  const snap = await get(ref(db, "user_event_progress"));
  if (!snap.exists()) return;
  const all = snap.val();
  for (const [id, val] of Object.entries(all)) {
    if ((val as any).userId === userId && (val as any).eventId === eventId) {
      const eventSnap = await get(ref(db, `seasonal_events/${eventId}`));
      const target = eventSnap.exists() ? (eventSnap.val() as any).rules?.target || 10 : 10;
      await update(ref(db, `user_event_progress/${id}`), {
        progress,
        completed: progress >= target,
      });
      break;
    }
  }
}

export async function getEventLeaderboard(eventId: string): Promise<UserEventProgress[]> {
  const snap = await get(ref(db, "user_event_progress"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => (v as any).eventId === eventId)
    .map(([id, v]: [string, any]) => ({ id, ...v } as UserEventProgress))
    .sort((a, b) => b.progress - a.progress);
}

export async function deleteSeasonalEvent(eventId: string): Promise<void> {
  await remove(ref(db, `seasonal_events/${eventId}`));
}
