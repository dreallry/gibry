import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getUserReadingStats } from "@/lib/firestore";
import { BookOpen, RotateCcw, Heart, Star, ClipboardCheck, BarChart3, TrendingUp } from "lucide-react";

export function ReadingStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => { if (user) { getUserReadingStats(user.uid).then(setStats); } }, [user]);
  if (!stats) return null;

  const items = [
    { icon: BookOpen, label: "Total Dipinjam", value: stats.totalBorrowed, bg: "rgba(166,124,82,0.1)", color: "#a67c52" },
    { icon: RotateCcw, label: "Dikembalikan", value: stats.totalReturned, bg: "rgba(34,197,94,0.1)", color: "#16a34a" },
    { icon: Heart, label: "Favorit", value: stats.favoriteCount, bg: "rgba(244,63,94,0.1)", color: "#f43f5e" },
    { icon: Star, label: "Ulasan", value: stats.totalReviews, bg: "rgba(245,158,11,0.1)", color: "#f59e0b" },
    { icon: ClipboardCheck, label: "Kunjungan", value: stats.attendanceCount, bg: "rgba(139,92,246,0.1)", color: "#8b5cf6" },
  ];

  return (
    <div>
      <h3 className="text-tagline flex items-center gap-2 mb-4"><BarChart3 size={18} /> Statistik Membaca</h3>
      <div className="card">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {items.map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 stat-icon" style={{ background: item.bg }}><item.icon size={18} style={{ color: item.color }} /></div>
              <p className="text-lg font-bold">{item.value}</p>
              <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{item.label}</p>
            </motion.div>
          ))}
        </div>
        {stats.avgRating > 0 && (
          <div className="mt-4 pt-4 flex items-center justify-center gap-2" style={{ borderTop: "1px solid var(--color-border)" }}>
            <TrendingUp size={14} style={{ color: "var(--color-muted-foreground)" }} />
            <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Rata-rata rating:</p>
            <p className="text-sm font-bold flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" />{stats.avgRating}</p>
          </div>
        )}
      </div>
    </div>
  );
}
