import type { LevelThreshold } from "./types/gamification";

// ===== Borrowing =====
export const MAX_ACTIVE_BORROWS = 3;
export const DEFAULT_BORROW_DEADLINE_DAYS = 14;

// ===== Fine Rates (Rp per hari) =====
export const FINE_RATES = {
  SHORT: 2000,    // 1-5 days deadline
  MEDIUM: 5000,   // 6-10 days deadline
  LONG: 10000,    // 11-14 days deadline
  EXTREME: 15000, // 15+ days deadline
} as const;

// ===== Points Awards =====
export const POINTS = {
  BORROW: 10,
  RETURN: 5,
  REVIEW: 15,
  FAVORITE: 3,
  LIKE_RECEIVED: 5,
  DAILY_XP: 15,
} as const;

// ===== Level System =====
export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, minPoints: 0, title: "Pemula" },
  { level: 5, minPoints: 50, title: "Pemula" },
  { level: 6, minPoints: 100, title: "Pembaca" },
  { level: 10, minPoints: 500, title: "Pembaca" },
  { level: 11, minPoints: 501, title: "Kutu Buku" },
  { level: 20, minPoints: 1500, title: "Kutu Buku" },
  { level: 21, minPoints: 1501, title: "Ahli Baca" },
  { level: 35, minPoints: 5000, title: "Ahli Baca" },
  { level: 36, minPoints: 5001, title: "Master Literasi" },
  { level: 50, minPoints: 10000, title: "Master Literasi" },
];

// ===== Streak =====
export const STREAK_FREEZE_MAX = 3;
export const STREAK_FREEZE_award_interval = 7; // Award 1 freeze every N days

// ===== Reservations =====
export const RESERVATION_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours

// ===== Genre Categories =====
export const GENRE_CATEGORIES = [
  "Fiksi", "Non-Fiksi", "Teknologi", "Sains", "Pendidikan",
  "Sejarah", "Novel", "Self-Help", "Komputer", "Desain",
];

// ===== Database Paths =====
export const DB_PATHS = {
  BOOKS: "daftar_buku",
  USERS: "anggota",
  BORROWS: "peminjaman",
  REVIEWS: "ulasan",
  FAVORITES: "favorit_buku",
  WISHLISTS: "wishlists",
  ATTENDANCE: "daftar_hadir",
  MESSAGES: "pesan",
  FRIENDS: "pertemanan",
  ACTIVITY: "aktivitas",
  NOTIFICATIONS: "notifikasi",
  BOOK_CLUBS: "book_clubs",
  CLUB_MEMBERS: "club_members",
  CLUB_MESSAGES: "club_messages",
  READING_NOTES: "reading_notes",
  CHALLENGES: "challenges",
  USER_CHALLENGES: "user_challenges",
  SEASONAL_EVENTS: "seasonal_events",
  USER_EVENT_PROGRESS: "user_event_progress",
  REWARDS: "rewards",
  REWARD_REDEMPTIONS: "reward_redemptions",
  READING_GOALS: "reading_goals",
  READING_LISTS: "reading_lists",
  BOOK_DISCUSSIONS: "book_discussions",
  BOOK_RESERVATIONS: "book_reservations",
  ANNOUNCEMENTS: "announcements",
  ONLINE: "online",
  TYPING: "typing",
  ACHIEVEMENTS: "pencapaian",
  AVAILABILITY_SUBS: "availability_subscriptions",
  USER_BANS: "user_bans",
  USER_LIKES: "user_likes",
  PRESENSI_CONFIG: "presensi_config",
} as const;

// ===== Borrow Code Format =====
export const BORROW_CODE_PREFIX = "PINJAM";

// ===== Pagination Defaults =====
export const DEFAULT_PAGE_SIZE = 20;
export const LEADERBOARD_LIMIT = 20;
export const NOTIFICATION_LIMIT = 50;
export const FEED_LIMIT = 50;
