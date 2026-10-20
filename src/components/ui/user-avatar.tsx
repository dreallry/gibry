import { getAchievementIcon, achievementColors, badgeTypeToIcon } from "@/lib/achievements";
import { getAvatarFrame } from "@/lib/avatarFrames";

interface UserAvatarProps {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  showBadge?: boolean;
  badge?: string | null;
  frame?: string | null;
  className?: string;
}

const sizeClasses = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-lg",
  xl: "w-20 h-20 text-2xl",
};

const badgeSizeClasses = {
  sm: "w-4 h-4 -bottom-0.5 -right-0.5 text-[8px]",
  md: "w-5 h-5 -bottom-0.5 -right-0.5 text-[10px]",
  lg: "w-6 h-6 -bottom-0.5 -right-0.5 text-xs",
  xl: "w-7 h-7 -bottom-0.5 -right-0.5 text-xs",
};

export function UserAvatar({
  src,
  name,
  size = "md",
  showBadge = false,
  badge,
  frame,
  className = "",
}: UserAvatarProps) {
  const sizeClass = sizeClasses[size];
  const badgeSizeClass = badgeSizeClasses[size];
  const activeFrame = getAvatarFrame(frame);

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 ${
        activeFrame?.glowClass || ""
      } ${className}`}
    >
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center font-bold overflow-hidden transition-all ${
          activeFrame?.ringClass || ""
        }`}
        style={{ background: src ? "transparent" : "var(--color-primary)", color: "white" }}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover rounded-full" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>

      {/* Visual Artwork Frame Overlay */}
      {activeFrame?.imageOverlay && (
        <img
          src={activeFrame.imageOverlay}
          alt={activeFrame.name}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-10 transition-transform"
          style={{
            transform: `scale(${activeFrame.imageScale || 1.4})`,
            transformOrigin: "center center",
          }}
          loading="eager"
        />
      )}

      {showBadge && badge && (
        <BadgeIcon badge={badge} size={size} className={`absolute ${badgeSizeClass} z-20`} />
      )}
    </div>
  );
}

interface BadgeIconProps {
  badge: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showLabel?: boolean;
}

export function BadgeIcon({ badge, size = "md", className = "", showLabel = false }: BadgeIconProps) {
  const iconName = badgeTypeToIcon[badge] || badge;
  const IconComponent = getAchievementIcon(iconName);
  const colors = achievementColors[badge] || { bg: "var(--color-muted)", text: "var(--color-muted-foreground)" };

  const iconSizes = { sm: 10, md: 12, lg: 16, xl: 18 };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <div
        className="rounded-full flex items-center justify-center"
        style={{
          background: colors.bg,
          color: colors.text,
          width: size === "sm" ? 16 : size === "md" ? 20 : size === "lg" ? 24 : 28,
          height: size === "sm" ? 16 : size === "md" ? 20 : size === "lg" ? 24 : 28,
        }}
        title={badge}
      >
        <IconComponent size={iconSizes[size]} />
      </div>
      {showLabel && (
        <span className="text-xs font-medium" style={{ color: colors.text }}>
          {getBadgeLabel(badge)}
        </span>
      )}
    </div>
  );
}

export function getBadgeLabel(badge: string): string {
  const labels: Record<string, string> = {
    bookworm: "Kutu Buku",
    elite_reader: "Elite Reader",
    social_butterfly: "Social Butterfly",
    perfect_score: "Perfect Score",
    streak_master: "Streak Master",
    night_owl: "Night Owl",
    speed_reader: "Speed Reader",
    genre_explorer: "Genre Explorer",
    early_bird: "Early Bird",
    critic: "Buku Kritis",
    gem_collector: "Gem Collector",
    marathon_reader: "Marathon Reader",
  };
  return labels[badge] || badge;
}

export const ALL_BADGES = [
  { type: "bookworm", title: "Kutu Buku", description: "Meminjam 5 buku", icon: "BookMarked" },
  { type: "elite_reader", title: "Elite Reader", description: "Meminjam 20 buku", icon: "Crown" },
  { type: "streak_master", title: "Streak Master", description: "Streak 7 hari", icon: "Flame" },
  { type: "perfect_score", title: "Perfect Score", description: "Rating 5★ di 3 ulasan", icon: "Star" },
  { type: "social_butterfly", title: "Social Butterfly", description: "Punya 10 teman", icon: "Users" },
  { type: "night_owl", title: "Night Owl", description: "Meminjam setelah jam 8 malam", icon: "Moon" },
  { type: "speed_reader", title: "Speed Reader", description: "Selesai membaca < 3 hari", icon: "Zap" },
  { type: "genre_explorer", title: "Genre Explorer", description: "Pinjam 5 genre berbeda", icon: "Compass" },
  { type: "early_bird", title: "Early Bird", description: "Pinjam sebelum jam 8 pagi", icon: "Timer" },
  { type: "critic", title: "Buku Kritis", description: "Tulis 10 ulasan buku", icon: "PenTool" },
  { type: "gem_collector", title: "Gem Collector", description: "Kumpulkan 50 favorit", icon: "Gem" },
  { type: "marathon_reader", title: "Marathon Reader", description: "Pinjam 10 buku sekaligus", icon: "Flame" },
];
