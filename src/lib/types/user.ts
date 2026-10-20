export interface UserProfile {
  uid: string;
  nama: string;
  username: string;
  email: string;
  alamat?: string; // @deprecated - tidak dikumpulkan untuk keamanan privasi siswa
  noTelp?: string; // @deprecated - tidak dikumpulkan untuk keamanan privasi siswa
  photoURL?: string;
  level?: number;
  totalPoints?: number;
  lifetimePoints?: number;
  invitationCodeId?: string;
  displayBadge?: string | null;
  avatarFrame?: string | null;
  unlockedFrames?: string[];
  readingStreak?: number;
  streakFreezes?: number;
  lastReadingDate?: string;
  lastClaimedDailyXPDate?: string;
  kudosCount?: number;
  likesCount?: number;
  onboardingCompleted?: boolean;
  role?: "admin" | "librarian" | "viewer" | "user";
  banned?: boolean;
  banReason?: string;
  status?: "active" | "deactivated";
  createdAt?: number;
  bio?: string;
  kelas?: string;
  minatBaca?: string[];
  favoriteQuote?: string;
}

export interface Attendance {
  id: string;
  userId: string;
  nama: string;
  email: string;
  photoURL?: string;
  waktuKunjungan: string;
  waktuKeluar?: string;
  durasi?: number;
  tujuan: string;
  status: "hadir" | "selesai";
  createdAt?: number;
}
