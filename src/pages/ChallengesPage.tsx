import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveChallenges, getUserChallenges, joinChallenge, type ReadingChallenge, type UserChallenge } from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import { Trophy, Target, CheckCircle2, Clock, Gift } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";

export default function ChallengesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<ReadingChallenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, uc] = await Promise.all([
        getActiveChallenges(),
        user ? getUserChallenges(user.uid) : Promise.resolve([]),
      ]);
      setChallenges(c);
      setUserChallenges(uc);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [user, loadData]);

  async function handleJoin(challengeId: string) {
    if (!user) return;
    setJoining(challengeId);
    try {
      await joinChallenge(user.uid, challengeId);
      toast("success", "Berhasil bergabung dengan tantangan!");
      loadData();
    } catch (err: any) { toast("error", err.message); } finally { setJoining(null); }
  }

  function getUserChallengeProgress(challengeId: string) {
    return userChallenges.find(uc => uc.challengeId === challengeId);
  }

  return (
    <PageTransition>
      <div className="tile">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--color-primary)", color: "white" }}>
              <Trophy size={28} />
            </div>
            <h1 className="text-display-lg mb-2">Tantangan Membaca</h1>
            <p style={{ color: "var(--color-muted-foreground)" }}>Selesaikan tantangan dan pantau perkembangan membacamu.</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card"><div className="h-5 w-2/3 animate-pulse rounded mb-3" style={{ background: "var(--color-muted)" }} /><div className="h-3 w-full animate-pulse rounded" style={{ background: "var(--color-muted)" }} /></div>
              ))}
            </div>
          ) : challenges.length === 0 ? (
            <div className="card text-center py-12">
              <Target size={32} className="mx-auto mb-3" style={{ color: "var(--color-border)" }} />
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Belum ada tantangan aktif.</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-muted-foreground)" }}>Tantangan baru akan muncul secara berkala.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {challenges.map((challenge, i) => {
                const uc = getUserChallengeProgress(challenge.id);
                const isJoined = !!uc;
                const isCompleted = uc?.completed || false;
                const progress = uc ? Math.min(100, Math.round((uc.current / challenge.target) * 100)) : 0;

                return (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="card hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isCompleted ? "rgba(34,197,94,0.1)" : "var(--color-muted)", color: isCompleted ? "#22c55e" : "var(--color-primary)" }}>
                          {isCompleted ? <CheckCircle2 size={18} /> : <Target size={18} />}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold">{challenge.title}</h3>
                          <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{challenge.type === "weekly" ? "Mingguan" : "Bulanan"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "rgba(245,158,11,0.1)" }}>
                        <Gift size={10} style={{ color: "#f59e0b" }} />
                        <span className="text-[10px] font-bold" style={{ color: "#f59e0b" }}>Target {challenge.target}</span>
                      </div>
                    </div>
                    <p className="text-xs mb-3" style={{ color: "var(--color-muted-foreground)" }}>{challenge.description}</p>

                    {isJoined && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span style={{ color: "var(--color-muted-foreground)" }}>{uc?.current || 0} / {challenge.target}</span>
                          <span style={{ color: "var(--color-muted-foreground)" }}>{progress}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-muted)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: isCompleted ? "#22c55e" : "var(--color-primary)" }} />
                        </div>
                      </div>
                    )}

                    {isCompleted ? (
                      <div className="flex items-center gap-1 text-xs font-medium" style={{ color: "#22c55e" }}>
                        <CheckCircle2 size={12} /> Selesai!
                      </div>
                    ) : isJoined ? (
                      <div className="flex items-center gap-1 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                        <Clock size={12} /> Berlangsung
                      </div>
                    ) : (
                      <button
                        onClick={() => handleJoin(challenge.id)}
                        disabled={joining === challenge.id}
                        className="w-full py-2 rounded-lg text-xs font-medium border transition-all disabled:opacity-50"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        {joining === challenge.id ? "Bergabung..." : "Gabung"}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
