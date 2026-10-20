export interface Achievement {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

export interface DisplayBadge {
  type: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export interface LevelThreshold {
  level: number;
  minPoints: number;
  title: string;
}
