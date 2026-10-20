import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { onLeaderboardChanged, claimDailyXP, giveLike, calculateLevel, getTodayWIBDate, type UserProfile } from "@/lib/firestore";
import { connectionManager } from "@/lib/connectionManager";
import { 
  Trophy, Medal, Award, Crown, Sparkles, Flame, Star, Zap, CheckCircle2, 
  TrendingUp, ThumbsUp, Heart, ShieldCheck, Compass, ArrowUpRight, FlameKindling, Loader2
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import { useToast } from "@/components/Toast";

export default function LeaderboardPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const todayStr = getTodayWIBDate();
  const claimedToday = profile?.lastClaimedDailyXPDate === todayStr;

  useEffect(() => {
    const cleanup = connectionManager.register("leaderboard", () => {
      return onLeaderboardChanged(20, (data) => {
        setLeaderboard(data);
        setLoading(false);
      });
    });
    return () => cleanup();
  }, []);

  const handleClaimPoints = async () => {
    if (!user) {
      toast("info", "Silakan login terlebih dahulu untuk mengklaim XP.");
      return;
    }
    if (claimedToday || claiming) return;

    setClaiming(true);
    try {
      const res = await claimDailyXP(user.uid);
      if (res.success) {
        toast("success", `Klaim berhasil! +${res.pointsAwarded} Daily Reading XP telah ditambahkan.`);
      } else if (res.alreadyClaimed) {
        toast("info", "Anda sudah mengklaim Daily XP hari ini.");
      }
    } catch (err) {
      console.error(err);
      toast("error", "Gagal mengklaim XP harian. Coba lagi.");
    } finally {
      setClaiming(false);
    }
  };

  const handleGiveLike = async (targetUid: string, name: string) => {
    if (!user) {
      toast("info", "Silakan login terlebih dahulu untuk memberikan Like.");
      return;
    }
    if (user.uid === targetUid) {
      toast("info", "Anda tidak bisa menyukai profil sendiri.");
      return;
    }

    try {
      const res = await giveLike(user.uid, targetUid);
      if (res.success) {
        toast("success", `Like untuk ${name} telah terkirim!`);
      } else {
        toast("info", `Anda sudah memberikan Like kepada ${name} hari ini. Coba lagi besok!`);
      }
    } catch (err) {
      console.error(err);
      toast("error", "Gagal mengirim Like.");
    }
  };

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];
  const restList = leaderboard.slice(3);

  const currentUserRank = user ? leaderboard.findIndex((p) => p.uid === user.uid) + 1 : 0;
  const userLevel = calculateLevel(profile?.totalPoints || 0);

  return (
    <PageTransition>
      <div className="tile">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
          
          {/* Header Banner with Scrap Asset Decorations */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pt-4 pb-8 border-b relative overflow-hidden rounded-3xl p-6 bg-gradient-to-r from-[#fffcf5] via-[#f8efe0] to-[#f2e5d0]" style={{ borderColor: "var(--color-border)" }}>
            <img
              src="/assetsscrap/lamp.png"
              alt=""
              className="absolute right-40 -top-4 w-20 opacity-30 pointer-events-none rotate-12 hidden md:block"
            />
            <img
              src="/assetsscrap/17f2f1ee72f85b2745860bf6cbde9b82-removebg-preview.png"
              alt=""
              className="absolute -right-4 -bottom-6 w-32 opacity-25 pointer-events-none -rotate-12"
            />

            <div className="relative z-10">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">
                <Flame size={15} />
                <span>Hall of Fame & Ranking Pembaca</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-none flex items-center gap-3" style={{ color: "var(--color-foreground)" }}>
                <span>Leaderboard <span className="font-serif italic font-normal text-amber-800">Pembaca</span></span>
                <img src="/assetsscrap/25b9598d019bcd1fbfb1368b80bb2779-removebg-preview.png" alt="" className="w-10 h-10 object-contain inline-block -rotate-6" />
              </h1>
              <p className="text-xs sm:text-sm mt-2 max-w-lg" style={{ color: "var(--color-muted-foreground)" }}>
                Kompetisi membaca interaktif. Kumpulkan XP dari aktivitas membaca, diskusi, dan review buku favoritmu.
              </p>
            </div>

            {/* Clean Minimal Stat Counter */}
            <div className="flex items-center gap-3 relative z-10 bg-[#fffcf5]/90 backdrop-blur-xs p-3 rounded-2xl border border-[#dbd0ba] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-800/10 text-amber-900 flex items-center justify-center font-bold">
                <Trophy size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-neutral-400">Total Pembaca Aktif</span>
                <span className="text-base font-black text-amber-900">{loading ? "..." : `${leaderboard.length}+ Pembaca`}</span>
              </div>
            </div>
          </div>

          {/* User Progress Banner */}
          {user && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6 rounded-3xl mb-12 border shadow-sm relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #4a3f35 0%, #382e27 100%)", borderColor: "rgba(255,255,255,0.1)" }}
            >
              {/* Subtle Grid Accent */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
                  backgroundSize: "2.5rem 2.5rem"
                }}
              ></div>

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="p-1 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200">
                      <UserAvatar
                        src={profile?.photoURL}
                        name={profile?.nama || "User"}
                        size="xl"
                        frame={profile?.avatarFrame}
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-md border-2 border-[#4a3f35] shadow-xs">
                      #{currentUserRank > 0 ? currentUserRank : "-"}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-extrabold text-lg text-[#fffcf5]">
                        {profile?.nama || "Pembaca Gibry"}
                      </h3>
                      <span className="text-xs font-bold text-[#c8d6b9] border-l border-white/20 pl-2.5">
                        Level {userLevel.level} • {userLevel.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-[#e2d8c3]">
                        <Zap size={14} className="text-amber-400 fill-amber-400" />
                        <span><strong>{profile?.totalPoints || 0}</strong> XP Accumulated</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#c8d6b9]">
                        <FlameKindling size={14} />
                        <span>Streak Aktif</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily XP Claim Button */}
                <button
                  onClick={handleClaimPoints}
                  disabled={claimedToday || claiming}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                    claimedToday
                      ? "bg-[#c8d6b9] text-[#2d3a24] opacity-90 cursor-default"
                      : claiming
                      ? "bg-[#c8d6b9] text-[#2d3a24] opacity-75 cursor-wait"
                      : "bg-[#c8d6b9] text-[#2d3a24] hover:bg-[#b5c99a] hover:scale-105 active:scale-95"
                  }`}
                >
                  {claiming ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Proses Klaim...</span>
                    </>
                  ) : claimedToday ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Daily XP Claimed</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Klaim Daily XP (+15)</span>
                    </>
                  )}
                </button>

              </div>
            </motion.div>
          )}

          {/* SPOTLIGHT CHAMPION (#1 READER CARD) */}
          {!loading && top1 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Crown size={15} className="text-amber-600" /> Top Reader Pekan Ini
                </span>
                <span className="text-[11px] font-semibold text-neutral-400">
                  Peringkat #01
                </span>
              </div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card p-6 sm:p-8 rounded-3xl border border-amber-800/20 shadow-md relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #fffcf5 0%, #f5efe3 100%)" }}
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                  
                  {/* Avatar & Rank Spotlight */}
                  <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-5">
                    <div className="relative">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl p-1.5 bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 shadow-md flex items-center justify-center rotate-[-2deg]">
                        <UserAvatar src={top1.photoURL} name={top1.nama} size="xl" frame={top1.avatarFrame} />
                      </div>
                      <div className="absolute -top-3 -right-3 bg-amber-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                        <Crown size={12} /> #1 Top
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-amber-800 flex items-center gap-1 mb-1 justify-center sm:justify-start">
                        <ShieldCheck size={14} /> Kutu Buku Final Boss
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black" style={{ color: "var(--color-foreground)" }}>
                        {top1.nama}
                      </h2>
                      <p className="text-xs mt-1 font-medium" style={{ color: "var(--color-muted-foreground)" }}>
                        Level {calculateLevel(top1.totalPoints || 0).level} • {calculateLevel(top1.totalPoints || 0).title}
                      </p>
                    </div>
                  </div>

                  {/* XP & Kudos Action */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-8 border-black/10 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-center sm:text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Score</span>
                      <p className="text-3xl font-black text-amber-900 leading-none mt-1">
                        {top1.totalPoints || 0} <span className="text-xs font-bold text-neutral-500">XP</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleGiveLike(top1.uid, top1.nama)}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-rose-700 transition-all active:scale-95 shadow-xs"
                    >
                      <Heart size={14} className="fill-white" />
                      <span>Beri Like ({top1.likesCount ?? top1.kudosCount ?? 0})</span>
                    </button>
                  </div>

                </div>
              </motion.div>
            </div>
          )}

          {/* RUNNER-UP CARDS (#2 & #3 SIDE-BY-SIDE) */}
          {!loading && (top2 || top3) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
              {top2 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="card p-6 rounded-3xl border border-black/5 hover:shadow-md transition-all flex items-center justify-between"
                  style={{ background: "var(--color-card)" }}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <UserAvatar src={top2.photoURL} name={top2.nama} size="lg" frame={top2.avatarFrame} />
                      <div className="absolute -bottom-1 -right-1 bg-slate-700 text-white text-[9px] font-black w-5 h-5 rounded-md flex items-center justify-center">
                        #2
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-slate-700 block tracking-wider">
                        Si paling ambis
                      </span>
                      <h4 className="font-bold text-sm mt-0.5" style={{ color: "var(--color-foreground)" }}>{top2.nama}</h4>
                      <p className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
                        Level {calculateLevel(top2.totalPoints || 0).level}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-base font-black text-slate-800">{top2.totalPoints || 0}</p>
                      <p className="text-[9px] font-bold text-neutral-400">XP</p>
                    </div>
                    <button
                      onClick={() => handleGiveLike(top2.uid, top2.nama)}
                      className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-all active:scale-90"
                      title="Beri Like"
                    >
                      <Heart size={16} className="fill-rose-500 text-rose-500" />
                    </button>
                  </div>
                </motion.div>
              )}

              {top3 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="card p-6 rounded-3xl border border-black/5 hover:shadow-md transition-all flex items-center justify-between"
                  style={{ background: "var(--color-card)" }}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <UserAvatar src={top3.photoURL} name={top3.nama} size="lg" frame={top3.avatarFrame} />
                      <div className="absolute -bottom-1 -right-1 bg-amber-800 text-white text-[9px] font-black w-5 h-5 rounded-md flex items-center justify-center">
                        #3
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-amber-800 block tracking-wider">
                        Nerdy
                      </span>
                      <h4 className="font-bold text-sm mt-0.5" style={{ color: "var(--color-foreground)" }}>{top3.nama}</h4>
                      <p className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
                        Level {calculateLevel(top3.totalPoints || 0).level}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-base font-black text-amber-900">{top3.totalPoints || 0}</p>
                      <p className="text-[9px] font-bold text-neutral-400">XP</p>
                    </div>
                    <button
                      onClick={() => handleGiveLike(top3.uid, top3.nama)}
                      className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-all active:scale-90"
                      title="Beri Like"
                    >
                      <Heart size={16} className="fill-rose-500 text-rose-500" />
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* STREAM RANKING LIST (#4 TOWARDS TOP 20) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Peringkat Pembaca Lainnya
              </span>
              <span className="text-[11px] font-semibold text-neutral-400">
                Peringkat diperbarui secara langsung
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="card p-4 rounded-2xl animate-pulse flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-black/5" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-1/3 bg-black/5 rounded" />
                      <div className="h-3 w-1/4 bg-black/5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : restList.length === 0 && leaderboard.length <= 3 ? (
              <div className="card text-center py-12 rounded-3xl">
                <Compass size={36} className="mx-auto mb-3 text-amber-800/40" />
                <p className="text-xs font-semibold" style={{ color: "var(--color-muted-foreground)" }}>
                  Belum ada pembaca tambahan di peringkat ini. Mulai membaca untuk masuk ke Hall of Fame!
                </p>
              </div>
            ) : (
              restList.map((person, index) => {
                const rank = index + 4;
                const levelInfo = calculateLevel(person.totalPoints || 0);
                const isMe = person.uid === user?.uid;

                return (
                  <motion.div
                    key={person.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`card p-4 rounded-2xl flex items-center justify-between gap-4 transition-all hover:translate-x-1 border ${
                      isMe ? "border-amber-700 bg-amber-500/5 shadow-xs" : "border-black/5"
                    }`}
                    style={{ background: isMe ? undefined : "var(--color-card)" }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="w-8 text-center text-xs font-bold text-neutral-400 flex-shrink-0">
                        #{rank < 10 ? `0${rank}` : rank}
                      </span>

                      <UserAvatar src={person.photoURL} name={person.nama} size="md" frame={person.avatarFrame} />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold truncate" style={{ color: "var(--color-foreground)" }}>
                            {person.nama}
                          </p>
                          {isMe && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-800 text-white">
                              Anda
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                          Level {levelInfo.level} • {levelInfo.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-black text-amber-900">
                          {person.totalPoints || 0}
                        </p>
                        <p className="text-[9px] font-bold text-neutral-400">XP</p>
                      </div>

                      <button
                        onClick={() => handleGiveLike(person.uid, person.nama)}
                        className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-all"
                        title="Beri Like"
                      >
                        <Heart size={14} className="fill-rose-500 text-rose-500" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
