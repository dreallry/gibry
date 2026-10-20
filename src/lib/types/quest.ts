export type QuestActionType =
  | "borrow_genre"
  | "borrow_any"
  | "review_book"
  | "attendance_count"
  | "wishlist_add"
  | "join_club"
  | "discussion_create"
  | "streak_days";

export interface QuestTemplate {
  id: string;
  actionType: QuestActionType;
  title: string;
  description: string;
  targetCount: number;
  pointsReward: number;
  genreRequired?: string;
  iconName: string;
}

export interface WeeklyQuest {
  id: string;
  weekId: string; // e.g. "2026-W40"
  templateId: string;
  title: string;
  description: string;
  targetCount: number;
  pointsReward: number;
  actionType: QuestActionType;
  genreRequired?: string;
  iconName: string;
}

export interface UserQuestProgress {
  questId: string;
  userId: string;
  weekId: string;
  currentCount: number;
  targetCount: number;
  completed: boolean;
  claimed: boolean;
  updatedAt: number;
}
