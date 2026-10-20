import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getUserAchievements, checkAndAwardAchievements, checkAndAwardDisplayBadges, type Achievement, type DisplayBadge } from "@/lib/firestore";
import { getAchievementIcon, achievementColors } from "@/lib/achievements";
import { Trophy, Lock, Sparkles, Award } from "lucide-react";

const ALL_ACHIEVEMENTS = [
  { type: "first_borrow", title: "Peminjam Pertama", description: "Meminjam buku pertama kali", icon: "BookOpen", points: 10 },
  { type: "bookworm", title: "Kutu Buku", description: "Meminjam 5 buku", icon: "BookMarked", points: 25 },
  { type: "first_return", title: "Pengembalian Pertama", description: "Mengembalikan buku pertama kali", icon: "RotateCcw", points: 10 },
  { type: "collector", title: "Kolektor", description: "Menambahkan 5 buku favorit", icon: "Star", points: 15 },
  { type: "first_review", title: "Kritikus Pertama", description: "Menulis ulasan pertama", icon: "PenTool", points: 10 },
  { type: "social_reader", title: "Pembaca Aktif", description: "Menulis 3 ulasan", icon: "MessageSquare", points: 20 },
  { type: "regular", title: "Pengunjung Tetap", description: "Berkunjung 3 kali", icon: "Building2", points: 15 },
  { type: "dedicated", title: "Pembaca Dedicated", description: "Berkunjung 10 kali", icon: "Trophy", points: 50 },
];

export function Achievements() {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<Achievement[]>([]);
  const [displayBadges, setDisplayBadges] = useState<DisplayBadge[]>([]);

  useEffect(() => {
    if (user) {
      checkAndAwardAchievements(user.uid).then((newAch) => {
        if (newAch.length > 0) { newAch.forEach((a) => { window.dispatchEvent(new CustomEvent("achievement-unlocked", { detail: a })); }); }
        return getUserAchievements(user.uid);
      }).then(setUnlocked);
      checkAndAwardDisplayBadges(user.uid).then(setDisplayBadges);
    }
  }, [user]);

  const unlockedTypes = new Set(unlocked.map((a) => a.type));
  const totalPoints = ALL_ACHIEVEMENTS.filter(a => unlockedTypes.has(a.type)).reduce((sum, a) => sum + a.points, 0);
  const maxPoints = ALL_ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0);
  const progress = Math.round((totalPoints / maxPoints) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-tagline flex items-center gap-2"><Trophy size={18} /> Pencapaian</h3>
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: "var(--color-primary)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>{totalPoints}/{maxPoints} poin</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-muted)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: "var(--color-primary)" }}
          />
        </div>
        <p className="text-[10px] mt-1 text-right" style={{ color: "var(--color-muted-foreground)" }}>
          {progress}% selesai
        </p>
      </div>

      {/* Display Badges Section */}
      {displayBadges.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "var(--color-muted-foreground)" }}>
            <Award size={12} /> Badge Profil
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {displayBadges.map((badge) => {
              const IconComponent = getAchievementIcon(ALL_ACHIEVEMENTS.find(a => a.type === badge.type)?.icon || "Trophy");
              const colors = achievementColors[badge.type] || { bg: "var(--color-muted)", text: "var(--color-muted-foreground)" };
              return (
                <div
                  key={badge.type}
                  className={`card text-center p-2 ${badge.unlocked ? "" : "opacity-40"}`}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1" style={{ background: badge.unlocked ? colors.bg : "var(--color-muted)" }}>
                    {badge.unlocked ? (
                      <IconComponent size={14} style={{ color: colors.text }} />
                    ) : (
                      <Lock size={12} style={{ color: "var(--color-border)" }} />
                    )}
                  </div>
                  <p className="text-[9px] font-medium leading-tight">{badge.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ALL_ACHIEVEMENTS.map((ach, i) => {
          const isUnlocked = unlockedTypes.has(ach.type);
          const IconComponent = getAchievementIcon(ach.icon);
          const colors = achievementColors[ach.type] || { bg: "var(--color-muted)", text: "var(--color-muted-foreground)", ring: "var(--color-border)" };

          return (
            <motion.div
              key={ach.type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`card text-center p-4 relative overflow-hidden transition-all duration-300 group ${
                isUnlocked ? "hover:shadow-lg hover:-translate-y-0.5" : ""
              }`}
              style={!isUnlocked ? { opacity: 0.5 } : {}}
            >
              {/* Background glow for unlocked */}
              {isUnlocked && (
                <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at center, ${colors.bg}, transparent)` }} />
              )}

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-110" style={{ background: isUnlocked ? `${colors.bg}` : "var(--color-muted)" }}>
                  {isUnlocked ? (
                    <IconComponent size={24} style={{ color: colors.text }} />
                  ) : (
                    <div className="relative">
                      <IconComponent size={24} style={{ color: "var(--color-border)" }} />
                      <Lock size={10} className="absolute -bottom-0.5 -right-0.5" style={{ color: "var(--color-muted-foreground)" }} />
                    </div>
                  )}
                </div>
                <p className="text-xs font-bold">{ach.title}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>{ach.description}</p>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <Sparkles size={10} style={{ color: isUnlocked ? "var(--color-primary)" : "var(--color-border)" }} />
                  <span className="text-[10px] font-medium" style={{ color: isUnlocked ? "var(--color-primary)" : "var(--color-border)" }}>
                    +{ach.points} poin
                  </span>
                </div>
              </div>

              {/* Unlocked badge */}
              {isUnlocked && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--color-primary)", color: "white" }}>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
