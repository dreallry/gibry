export type StampCategory =
  | "genre"
  | "speed"
  | "social"
  | "streak"
  | "event"
  | "special";

export interface StampDefinition {
  id: string;
  category: StampCategory;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  bgColor: string;
  borderColor: string;
  accentColor: string;
  badgeCode: string;
  conditionDescription: string;
  pointsReward: number;
}

export interface UserStamp {
  id: string; // matches StampDefinition.id
  userId: string;
  unlockedAt: number;
  featuredInProfile?: boolean;
}

export const STAMP_DEFINITIONS: StampDefinition[] = [
  // Genre Master
  {
    id: "stamp_genre_tech",
    category: "genre",
    title: "Tech Prodigy",
    subtitle: "Inovator Masa Depan",
    description: "Membaca minimal 3 buku bertema Teknologi atau Komputer.",
    iconName: "Cpu",
    bgColor: "#eff6ff",
    borderColor: "#3b82f6",
    accentColor: "#1d4ed8",
    badgeCode: "💻",
    conditionDescription: "Pinjam 3+ buku kategori Teknologi",
    pointsReward: 50,
  },
  {
    id: "stamp_genre_fiction",
    category: "genre",
    title: "Story Weaver",
    subtitle: "Penjelajah Imajinasi",
    description: "Membaca minimal 5 buku kategori Fiksi atau Novel.",
    iconName: "BookOpen",
    bgColor: "#faf5ff",
    borderColor: "#a855f7",
    accentColor: "#7e22ce",
    badgeCode: "📖",
    conditionDescription: "Pinjam 5+ buku Fiksi/Novel",
    pointsReward: 60,
  },
  {
    id: "stamp_genre_science",
    category: "genre",
    title: "Curious Scientist",
    subtitle: "Pencari Fakta Semesta",
    description: "Membaca minimal 3 buku kategori Sains atau Pendidikan.",
    iconName: "Atom",
    bgColor: "#ecfdf5",
    borderColor: "#10b981",
    accentColor: "#047857",
    badgeCode: "🔬",
    conditionDescription: "Pinjam 3+ buku Sains/Pendidikan",
    pointsReward: 50,
  },
  {
    id: "stamp_genre_history",
    category: "genre",
    title: "Chronos Keeper",
    subtitle: "Saksi Rekam Jejak",
    description: "Membaca minimal 2 buku kategori Sejarah.",
    iconName: "Hourglass",
    bgColor: "#fffbeb",
    borderColor: "#f59e0b",
    accentColor: "#b45309",
    badgeCode: "🏛️",
    conditionDescription: "Pinjam 2+ buku Sejarah",
    pointsReward: 40,
  },

  // Speed & Discipline
  {
    id: "stamp_speed_lightning",
    category: "speed",
    title: "Lightning Reader",
    subtitle: "Kecepatan Super",
    description: "Menyelesaikan dan mengembalikan buku dalam kurun waktu kurang dari 3 hari.",
    iconName: "Zap",
    bgColor: "#fef3c7",
    borderColor: "#eab308",
    accentColor: "#a16207",
    badgeCode: "⚡",
    conditionDescription: "Kembalikan buku dalam < 3 hari",
    pointsReward: 50,
  },
  {
    id: "stamp_ontime_hero",
    category: "speed",
    title: "Zero Penalty Club",
    subtitle: "Keteladanan Waktu",
    description: "Mengembalikan minimal 5 buku tepat waktu tanpa pernah terkena denda.",
    iconName: "ShieldCheck",
    bgColor: "#f0fdf4",
    borderColor: "#22c55e",
    accentColor: "#15803d",
    badgeCode: "🛡️",
    conditionDescription: "5x pengembalian tepat waktu tanpa denda",
    pointsReward: 75,
  },

  // Social & Community
  {
    id: "stamp_social_critic",
    category: "social",
    title: "Literary Critic",
    subtitle: "Suara Pembaca Jujur",
    description: "Menulis minimal 3 ulasan buku dengan deskripsi berkualitas.",
    iconName: "MessageSquare",
    bgColor: "#fdf2f8",
    borderColor: "#ec4899",
    accentColor: "#be185d",
    badgeCode: "✍️",
    conditionDescription: "Beri 3+ ulasan buku",
    pointsReward: 45,
  },
  {
    id: "stamp_social_butterfly",
    category: "social",
    title: "Community Spark",
    subtitle: "Penghubung Komunitas",
    description: "Bergabung dengan Book Club dan aktif berdiskusi.",
    iconName: "Users",
    bgColor: "#e0e7ff",
    borderColor: "#6366f1",
    accentColor: "#4338ca",
    badgeCode: "🦋",
    conditionDescription: "Gabung 1+ Book Club & buat diskusi",
    pointsReward: 40,
  },

  // Streak & Attendance
  {
    id: "stamp_streak_week",
    category: "streak",
    title: "Seven Suns",
    subtitle: "Konsistensi Emas",
    description: "Mempertahankan reading streak hingga 7 hari berturut-turut.",
    iconName: "Flame",
    bgColor: "#fff7ed",
    borderColor: "#f97316",
    accentColor: "#c2410c",
    badgeCode: "🔥",
    conditionDescription: "Capai reading streak 7 hari",
    pointsReward: 80,
  },
  {
    id: "stamp_presensi_regular",
    category: "streak",
    title: "Library Resident",
    subtitle: "Tamu Kehormatan",
    description: "Melakukan presensi kunjungan ke perpustakaan minimal 5 kali.",
    iconName: "QrCode",
    bgColor: "#f0f9ff",
    borderColor: "#0284c7",
    accentColor: "#0369a1",
    badgeCode: "📍",
    conditionDescription: "Presensi hadir 5+ kali via QR",
    pointsReward: 50,
  },

  // Special
  {
    id: "stamp_collector_wishlist",
    category: "special",
    title: "Curator's Eye",
    subtitle: "Penjelajah Koleksi",
    description: "Menyimpan minimal 5 buku ke dalam Wishlist impianmu.",
    iconName: "Bookmark",
    bgColor: "#f5f3ff",
    borderColor: "#8b5cf6",
    accentColor: "#6d28d9",
    badgeCode: "⭐",
    conditionDescription: "Simpan 5+ buku di Wishlist",
    pointsReward: 35,
  },
  {
    id: "stamp_digital_nomad",
    category: "special",
    title: "Digital Pioneer",
    subtitle: "Generasi Paperless",
    description: "Membaca buku digital / e-book di platform DigiPus.",
    iconName: "Smartphone",
    bgColor: "#ecfeff",
    borderColor: "#06b6d4",
    accentColor: "#0e7490",
    badgeCode: "📱",
    conditionDescription: "Akses buku digital di DigiPus",
    pointsReward: 40,
  },
];
