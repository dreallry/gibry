import type { Book } from "./book";

export interface SeasonalEvent {
  id: string;
  title: string;
  description: string;
  type: "reading_challenge" | "streak_challenge" | "genre_challenge";
  startDate: string;
  endDate: string;
  rules: {
    target: number;
    bonusMultiplier?: number;
  };
  rewards: {
    points: number;
    badge?: string;
  };
  isActive?: boolean;
  createdAt?: number;
}

export interface UserEventProgress {
  id: string;
  userId: string;
  eventId: string;
  progress: number;
  completed: boolean;
  joinedAt?: number;
}

export interface ReadingChallenge {
  id: string;
  title: string;
  description: string;
  type: "weekly" | "monthly";
  target: number;
  reward: number;
  startDate: string;
  endDate: string;
  createdAt?: number;
}

export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  current: number;
  completed: boolean;
  completedAt?: number;
  createdAt?: number;
}
