import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserDashboardStats, getUserBorrows, type ReadingStatsData, type Borrow } from "@/lib/firestore";
import { BookOpen, Heart, Star, TrendingUp, Flame, Snowflake, Loader2, CheckCircle2, Award, BookMarked, ArrowRight, Trophy } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ReadingHeatmap } from "@/components/dashboard/ReadingHeatmap";

const CHART_COLORS = ["#f97316", "#22c55e", "#ec4899", "#8b5cf6", "#3b82f6", "#f59e0b"];

const GENRE_COLORS = ["#f97316", "#22c55e", "#8b5cf6", "#ec4899", "#3b82f6", "#f59e0b", "#06b6d4", "#ef4444"];

export default function ReadingDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReadingStatsData | null>(null);
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [statsData, borrowsData] = await Promise.all([
        getUserDashboardStats(user.uid),
        getUserBorrows(user.uid),
      ]);
      setStats(statsData);
      setBorrows(borrowsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-background)" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      </PageTransition>
    );
  }

  if (!stats) return null;

  const genreEntries = Object.entries(stats.genreDistribution).sort((a, b) => b[1] - a[1]);
  const monthlyEntries = Object.entries(stats.monthlyBorrows).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  const streakPercent = Math.min((stats.readingStreak / 30) * 100, 100);

  return (
    <PageTransition>
      <div className="min-h-screen" style={{ background: "var(--color-background)" }}>
        {/* Hero Header */}
        <div className="relative overflow-hidden" style={{ background: "#4a3f35" }}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-8"><BookOpen size={60} style={{ color: "#fffcf5" }} /></div>
            <div className="absolute bottom-2 left-12"><BookMarked size={40} style={{ color: "#fffcf5" }} /></div>
          </div>
          <div className="max-w-4xl mx-auto px-5 pt-24 sm:pt-28 pb-8 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#fffcf5" }}>Dashboard Membaca</h1>
              <p className="text-sm mt-1" style={{ color: "rgba(255,252,245,0.7)" }}>Ringkasan aktivitas membaca Anda</p>
            </motion.div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {[
                { value: stats.totalBorrows, label: "Total", icon: BookOpen, color: "#f97316" },
                { value: stats.completedBorrows, label: "Selesai", icon: CheckCircle2, color: "#22c55e" },
                { value: stats.totalFavorites, label: "Favorit", icon: Heart, color: "#ec4899" },
                { value: stats.avgRating.toFixed(1), label: "Rating", icon: Star, color: "#f59e0b" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="text-center"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: `${stat.color}20` }}>
                    <stat.icon size={18} style={{ color: stat.color }} />
                  </div>
                  <p className="text-xl font-bold" style={{ color: "#fffcf5" }}>{stat.value}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,252,245,0.5)" }}>{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-5 py-6 -mt-4 relative z-20">
          {/* Streak Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-5 mb-4"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#f97316" }}>
                  <Flame size={24} style={{ color: "white" }} />
                </div>
                {stats.streakFreezes > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#3b82f6", border: "2px solid var(--color-card)" }}>
                    <Snowflake size={10} style={{ color: "white" }} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{stats.readingStreak}</p>
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>hari berturut-turut</p>
                </div>
                <div className="w-full h-2.5 rounded-full mt-2" style={{ background: "var(--color-muted)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${streakPercent}%` }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ background: "#f97316" }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>
                    {stats.readingStreak >= 30 ? <span className="flex items-center gap-1"><Trophy size={10} /> Streak Master!</span> : `${30 - stats.readingStreak} hari lagi ke Streak Master`}
                  </p>
                  {stats.streakFreezes > 0 && (
                    <p className="text-[10px] flex items-center gap-1" style={{ color: "#3b82f6" }}>
                      <Snowflake size={8} /> {stats.streakFreezes} freeze tersisa
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Active Borrows & Quick Actions */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="card p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                  <TrendingUp size={18} style={{ color: "#8b5cf6" }} />
                </div>
                <div>
                  <p className="text-lg font-bold">{stats.activeBorrows}</p>
                  <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>Sedang Dipinjam</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}>
                  {stats.completedBorrows} selesai
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>
                  {stats.activeBorrows} aktif
                </span>
                {stats.overdueBorrows > 0 && (
                  <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                    {stats.overdueBorrows} terlambat
                  </span>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-4 flex flex-col"
            >
              <p className="text-xs font-bold mb-3" style={{ color: "var(--color-muted-foreground)" }}>Akses Cepat</p>
              <div className="space-y-2 flex-1">
                <Link to="/books" className="flex items-center justify-between p-2 rounded-lg transition-all hover:scale-[1.02]" style={{ background: "var(--color-muted)" }}>
                  <div className="flex items-center gap-2">
                    <BookOpen size={12} style={{ color: "var(--color-primary)" }} />
                    <span className="text-[10px] font-medium">Koleksi Buku</span>
                  </div>
                  <ArrowRight size={10} style={{ color: "var(--color-muted-foreground)" }} />
                </Link>
                <Link to="/events" className="flex items-center justify-between p-2 rounded-lg transition-all hover:scale-[1.02]" style={{ background: "var(--color-muted)" }}>
                  <div className="flex items-center gap-2">
                    <Award size={12} style={{ color: "#f59e0b" }} />
                    <span className="text-[10px] font-medium">Event & Tantangan</span>
                  </div>
                  <ArrowRight size={10} style={{ color: "var(--color-muted-foreground)" }} />
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Reading Heatmap & Analytics Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <ReadingHeatmap
              activityHeatmap={stats.activityHeatmap}
              readingPaceDays={stats.readingPaceDays}
              genreDiversityScore={stats.genreDiversityScore}
              percentileRank={stats.percentileRank}
              readingStreak={stats.readingStreak}
            />
          </motion.div>

          {/* Genre Distribution */}
          {genreEntries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="card p-5 mb-4"
            >
              <h3 className="text-sm font-bold mb-4">Distribusi Genre</h3>
              <div className="space-y-3">
                {genreEntries.slice(0, 6).map(([genre, count], idx) => {
                  const maxCount = genreEntries[0][1];
                  const percentage = (count / maxCount) * 100;
                  const color = GENRE_COLORS[idx % GENRE_COLORS.length];
                  return (
                    <div key={genre}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{genre}</span>
                        <span className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{count} buku</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "var(--color-muted)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.4 + idx * 0.05, duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{ background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Monthly Activity */}
          {monthlyEntries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card p-5 mb-4"
            >
              <h3 className="text-sm font-bold mb-4">Aktivitas Bulanan</h3>
              <div className="flex items-end gap-2 h-36">
                {monthlyEntries.map(([month, count], idx) => {
                  const maxCount = Math.max(...monthlyEntries.map(([, c]) => c));
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const monthLabel = new Date(month + "-01").toLocaleDateString("id-ID", { month: "short" });
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold">{count}</span>
                      <div className="w-full relative" style={{ height: "100px" }}>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ delay: 0.5 + idx * 0.05, duration: 0.5 }}
                          className="absolute bottom-0 w-full rounded-t-lg"
                          style={{ background: CHART_COLORS[idx % CHART_COLORS.length], minHeight: count > 0 ? "8px" : "0" }}
                        />
                      </div>
                      <span className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{monthLabel}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Recent Borrows */}
          {borrows.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="card p-5"
            >
              <h3 className="text-sm font-bold mb-4">Riwayat Peminjaman</h3>
              <div className="space-y-2">
                {borrows.slice(0, 8).map((borrow, idx) => (
                  <motion.div
                    key={borrow.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all hover:shadow-sm"
                    style={{ background: "var(--color-muted)" }}
                  >
                    <div className="w-8 h-11 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--color-card)" }}>
                      {borrow.bookCover ? (
                        <img src={borrow.bookCover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen size={12} style={{ color: "var(--color-border)" }} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{borrow.bookTitle || "Buku"}</p>
                      <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{borrow.tanggalPinjam}</p>
                    </div>
                    <span
                      className="text-[10px] font-medium px-2.5 py-1 rounded-full"
                      style={{
                        background: borrow.status === "Dikembalikan" ? "rgba(34,197,94,0.1)" :
                          borrow.status === "Terlambat" ? "rgba(239,68,68,0.1)" : "rgba(139,92,246,0.1)",
                        color: borrow.status === "Dikembalikan" ? "#16a34a" :
                          borrow.status === "Terlambat" ? "#ef4444" : "#8b5cf6",
                      }}
                    >
                      {borrow.status === "Dikembalikan" ? "Selesai" :
                        borrow.status === "Terlambat" ? "Terlambat" : "Dipinjam"}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
