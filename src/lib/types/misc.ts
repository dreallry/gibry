export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  stock: number;
  isActive: boolean;
  type: "priority_borrow" | "extended_deadline" | "physical_prize" | "badge";
  createdAt?: number;
}

export interface RewardRedemption {
  id: string;
  userId: string;
  rewardId: string;
  rewardTitle?: string;
  pointsSpent: number;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  redeemedAt?: number;
  processedAt?: number;
  processedBy?: string;
  userName?: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  bookId: string;
  addedAt?: number;
}

export interface AvailabilitySubscription {
  id: string;
  userId: string;
  bookId: string;
  createdAt?: number;
}

export interface Reservation {
  id: string;
  userId: string;
  bookId: string;
  reservedAt?: number;
  expiresAt?: number;
  status: "waiting" | "ready" | "expired" | "cancelled";
  userName?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  target?: string;
  scheduledAt?: number;
  createdBy: string;
  createdAt?: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  fromUserId?: string;
  type:
    | "message"
    | "friend_request"
    | "friend_accepted"
    | "borrow"
    | "return"
    | "review"
    | "book_available"
    | "poke"
    | "like"
    | "club_invite"
    | "report_action"
    | "system";
  title: string;
  message?: string; // used in database rules
  body: string;
  read: boolean;
  link?: string;
  createdAt?: number;
}

export interface BookSuggestion {
  id: string;
  userId: string;
  userName: string;
  title: string;
  author?: string;
  reason: string;
  voteCount?: number;
  hasVoted?: boolean;
  status: "open" | "accepted" | "acquired" | "rejected";
  adminNote?: string;
  createdAt: string;
}


export interface ReadingStatsData {
  totalBorrows: number;
  completedBorrows: number;
  activeBorrows: number;
  overdueBorrows: number;
  totalFavorites: number;
  totalReviews: number;
  avgRating: number;
  genreDistribution: Record<string, number>;
  monthlyBorrows: Record<string, number>;
  readingStreak: number;
  streakFreezes: number;
  readingPaceDays?: number;
  genreDiversityScore?: number;
  activityHeatmap?: Record<string, number>;
  percentileRank?: number;
}
