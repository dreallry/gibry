import {
  BookOpen,
  BookMarked,
  RotateCcw,
  Star,
  PenTool,
  MessageSquare,
  Building2,
  Trophy,
  Crown,
  Users,
  Flame,
  Moon,
  Zap,
  Compass,
  Timer,
  Heart,
  Gem,
  type LucideIcon,
} from "lucide-react";

// Maps Lucide icon name strings (stored in Firebase) to actual components
export const achievementIconMap: Record<string, LucideIcon> = {
  BookOpen,
  BookMarked,
  RotateCcw,
  Star,
  PenTool,
  MessageSquare,
  Building2,
  Trophy,
  Crown,
  Users,
  Flame,
  Moon,
  Zap,
  Compass,
  Timer,
  Heart,
  Gem,
};

export function getAchievementIcon(iconName: string): LucideIcon {
  return achievementIconMap[iconName] || Trophy;
}

// Maps badge type strings to icon name strings
export const badgeTypeToIcon: Record<string, string> = {
  bookworm: "BookMarked",
  elite_reader: "Crown",
  streak_master: "Flame",
  perfect_score: "Star",
  social_butterfly: "Users",
  night_owl: "Moon",
  speed_reader: "Zap",
  genre_explorer: "Compass",
  early_bird: "Timer",
  critic: "PenTool",
  gem_collector: "Gem",
  marathon_reader: "Flame",
  first_borrow: "BookOpen",
  first_return: "RotateCcw",
  collector: "Star",
  first_review: "PenTool",
  social_reader: "MessageSquare",
  regular: "Building2",
  dedicated: "Trophy",
};

// Color schemes for achievements
export const achievementColors: Record<string, { bg: string; text: string; ring: string }> = {
  first_borrow: { bg: "rgba(59,130,246,0.1)", text: "#3b82f6", ring: "rgba(59,130,246,0.2)" },
  bookworm: { bg: "rgba(139,92,246,0.1)", text: "#8b5cf6", ring: "rgba(139,92,246,0.2)" },
  first_return: { bg: "rgba(34,197,94,0.1)", text: "#22c55e", ring: "rgba(34,197,94,0.2)" },
  collector: { bg: "rgba(245,158,11,0.1)", text: "#f59e0b", ring: "rgba(245,158,11,0.2)" },
  first_review: { bg: "rgba(244,63,94,0.1)", text: "#f43f5e", ring: "rgba(244,63,94,0.2)" },
  social_reader: { bg: "rgba(6,182,212,0.1)", text: "#06b6d4", ring: "rgba(6,182,212,0.2)" },
  regular: { bg: "rgba(16,185,129,0.1)", text: "#10b981", ring: "rgba(16,185,129,0.2)" },
  dedicated: { bg: "rgba(249,115,22,0.1)", text: "#f97316", ring: "rgba(249,115,22,0.2)" },
  // Badge colors
  elite_reader: { bg: "rgba(168,85,247,0.1)", text: "#a855f7", ring: "rgba(168,85,247,0.2)" },
  social_butterfly: { bg: "rgba(236,72,153,0.1)", text: "#ec4899", ring: "rgba(236,72,153,0.2)" },
  perfect_score: { bg: "rgba(234,179,8,0.1)", text: "#eab308", ring: "rgba(234,179,8,0.2)" },
  streak_master: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", ring: "rgba(239,68,68,0.2)" },
  night_owl: { bg: "rgba(99,102,241,0.1)", text: "#6366f1", ring: "rgba(99,102,241,0.2)" },
  // New badges
  speed_reader: { bg: "rgba(6,182,212,0.1)", text: "#06b6d4", ring: "rgba(6,182,212,0.2)" },
  genre_explorer: { bg: "rgba(168,85,247,0.1)", text: "#a855f7", ring: "rgba(168,85,247,0.2)" },
  early_bird: { bg: "rgba(251,191,36,0.1)", text: "#fbbf24", ring: "rgba(251,191,36,0.2)" },
  critic: { bg: "rgba(244,63,94,0.1)", text: "#f43f5e", ring: "rgba(244,63,94,0.2)" },
  gem_collector: { bg: "rgba(16,185,129,0.1)", text: "#10b981", ring: "rgba(16,185,129,0.2)" },
  marathon_reader: { bg: "rgba(249,115,22,0.1)", text: "#f97316", ring: "rgba(249,115,22,0.2)" },
};
