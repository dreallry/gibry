import { ref, get, set, update, runTransaction } from "firebase/database";
import { db } from "./firebase";
import { type WeeklyQuest, type UserQuestProgress, type QuestActionType, type QuestTemplate } from "./types/quest";
import { addNotification } from "./firestore";
import { eventBus } from "./eventBus";

/**
 * Get standard ISO Week ID (e.g. "2026-W40")
 */
export function getCurrentWeekId(): string {
  const now = new Date();
  const target = new Date(now.valueOf());
  const dayNr = (now.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: "quest_borrow_fiction",
    actionType: "borrow_genre",
    genreRequired: "Fiksi",
    title: "Jelajah Fiksi",
    description: "Pinjam 1 buku bergenre Fiksi atau Novel minggu ini.",
    targetCount: 1,
    pointsReward: 30,
    iconName: "BookOpen",
  },
  {
    id: "quest_borrow_tech",
    actionType: "borrow_genre",
    genreRequired: "Teknologi",
    title: "Eksplorasi Teknologi",
    description: "Pinjam 1 buku kategori Teknologi atau Komputer.",
    targetCount: 1,
    pointsReward: 35,
    iconName: "Cpu",
  },
  {
    id: "quest_review_book",
    actionType: "review_book",
    title: "Kritikus Pembaca",
    description: "Tulis ulasan dan berikan rating untuk buku yang telah kamu baca.",
    targetCount: 1,
    pointsReward: 25,
    iconName: "Star",
  },
  {
    id: "quest_attendance_two",
    actionType: "attendance_count",
    title: "Pengunjung Setia",
    description: "Lakukan presensi kehadiran di perpustakaan sebanyak 2 kali.",
    targetCount: 2,
    pointsReward: 40,
    iconName: "QrCode",
  },
  {
    id: "quest_wishlist_two",
    actionType: "wishlist_add",
    title: "Koleksi Impian",
    description: "Simpan minimal 2 buku ke daftar Wishlist kamu.",
    targetCount: 2,
    pointsReward: 20,
    iconName: "Bookmark",
  },
  {
    id: "quest_discussion_one",
    actionType: "discussion_create",
    title: "Diskusi Hangat",
    description: "Tulis pendapat atau pertanyaan di kolom diskusi buku.",
    targetCount: 1,
    pointsReward: 25,
    iconName: "MessageCircle",
  },
];

/**
 * Generate or get 4 deterministic weekly quests based on current week ID
 */
export function getWeeklyQuestsForCurrentWeek(): WeeklyQuest[] {
  const weekId = getCurrentWeekId();
  // Rotate templates deterministically by week number
  const weekNum = parseInt(weekId.split("-W")[1], 10) || 1;
  const selected: WeeklyQuest[] = [];

  for (let i = 0; i < 4; i++) {
    const idx = (weekNum + i) % QUEST_TEMPLATES.length;
    const t = QUEST_TEMPLATES[idx];
    selected.push({
      id: `${weekId}_${t.id}`,
      weekId,
      templateId: t.id,
      title: t.title,
      description: t.description,
      targetCount: t.targetCount,
      pointsReward: t.pointsReward,
      actionType: t.actionType,
      genreRequired: t.genreRequired,
      iconName: t.iconName,
    });
  }

  return selected;
}

/**
 * Get user progress for current week's quests
 */
export async function getUserWeeklyQuestsProgress(userId: string): Promise<UserQuestProgress[]> {
  const weekId = getCurrentWeekId();
  const quests = getWeeklyQuestsForCurrentWeek();
  const results: UserQuestProgress[] = [];

  try {
    const snap = await get(ref(db, `user_quests/${userId}/${weekId}`));
    const data = snap.exists() ? snap.val() : {};

    for (const q of quests) {
      const p = data[q.id] || {
        currentCount: 0,
        completed: false,
        claimed: false,
      };

      results.push({
        questId: q.id,
        userId,
        weekId,
        currentCount: p.currentCount || 0,
        targetCount: q.targetCount,
        completed: (p.currentCount || 0) >= q.targetCount,
        claimed: !!p.claimed,
        updatedAt: p.updatedAt || Date.now(),
      });
    }
  } catch (err) {
    console.error("[QuestEngine] Error fetching user quests:", err);
  }

  return results;
}

/**
 * Increment quest progress for a specific action
 */
export async function trackQuestAction(
  userId: string,
  actionType: QuestActionType,
  metadata?: { genre?: string; count?: number }
): Promise<void> {
  if (!userId) return;

  const weekId = getCurrentWeekId();
  const quests = getWeeklyQuestsForCurrentWeek();
  const incrementBy = metadata?.count || 1;

  for (const q of quests) {
    if (q.actionType !== actionType) continue;

    if (q.actionType === "borrow_genre" && q.genreRequired && metadata?.genre) {
      if (!metadata.genre.toLowerCase().includes(q.genreRequired.toLowerCase())) {
        continue;
      }
    }

    try {
      const questRef = ref(db, `user_quests/${userId}/${weekId}/${q.id}`);
      await runTransaction(questRef, (current) => {
        if (!current) {
          const newCount = incrementBy;
          return {
            currentCount: newCount,
            completed: newCount >= q.targetCount,
            claimed: false,
            updatedAt: Date.now(),
          };
        }

        const newCount = Math.min((current.currentCount || 0) + incrementBy, q.targetCount);
        const completed = newCount >= q.targetCount;

        return {
          ...current,
          currentCount: newCount,
          completed: completed || !!current.completed,
          updatedAt: Date.now(),
        };
      });
    } catch (err) {
      console.error(`[QuestEngine] Error tracking quest ${q.id}:`, err);
    }
  }
}

/**
 * Save a completed quest; redeemable points require separate server proofs.
 */
export async function claimQuestReward(userId: string, questId: string): Promise<number> {
  const weekId = getCurrentWeekId();
  const quests = getWeeklyQuestsForCurrentWeek();
  const quest = quests.find((q) => q.id === questId);

  if (!quest) throw new Error("Quest tidak ditemukan.");

  const questRef = ref(db, `user_quests/${userId}/${weekId}/${questId}`);
  const snap = await get(questRef);

  if (!snap.exists()) {
    throw new Error("Quest belum memiliki progress.");
  }

  const data = snap.val();
  if ((data.currentCount || 0) < quest.targetCount) {
    throw new Error("Quest belum selesai.");
  }

  if (data.claimed) {
    throw new Error("Reward quest ini sudah diklaim.");
  }

  // Mark as claimed
  await update(questRef, {
    claimed: true,
    claimedAt: Date.now(),
  });

  // Send notification
  await addNotification(userId, {
    title: `Quest Selesai: ${quest.title}!`,
    body: `Kamu berhasil menyelesaikan quest "${quest.title}". Progres misimu telah tersimpan.`,
    type: "system",
    link: "/quests",
  });

  // Emit event
  eventBus.emit({
    type: "quest:completed",
    payload: { userId, questId, points: 0 },
  });

  return 0;
}

// Subscribe EventBus to track actions seamlessly
eventBus.on("book:borrowed", async (e) => {
  await trackQuestAction(e.payload.userId, "borrow_genre", { genre: e.payload.genre });
  await trackQuestAction(e.payload.userId, "borrow_any");
});

eventBus.on("book:reviewed", async (e) => {
  await trackQuestAction(e.payload.userId, "review_book");
});

eventBus.on("attendance:checked_in", async (e) => {
  await trackQuestAction(e.payload.userId, "attendance_count");
});

eventBus.on("book:wishlisted", async (e) => {
  await trackQuestAction(e.payload.userId, "wishlist_add");
});

eventBus.on("discussion:created", async (e) => {
  await trackQuestAction(e.payload.userId, "discussion_create");
});
