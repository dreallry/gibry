import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveRewards, getUserRedemptions, redeemReward, type Reward, type RewardRedemption } from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import { Gift, Clock, CheckCircle2, XCircle, Loader2, Star, Zap, Award, Package } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";

export default function RewardsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rewardsData, redemptionsData] = await Promise.all([
        getActiveRewards(),
        user ? getUserRedemptions(user.uid) : Promise.resolve([]),
      ]);
      setRewards(rewardsData);
      setRedemptions(redemptionsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [user, loadData]);

  async function handleRedeem(rewardId: string) {
    if (!user) return;
    setRedeeming(rewardId);
    try {
      await redeemReward(user.uid, rewardId);
      toast("success", "Berhasil menukar reward!");
      await loadData();
    } catch (err: any) {
      toast("error", err.message || "Gagal menukar reward");
    } finally {
      setRedeeming(null);
    }
  }

  function getRewardIcon(type: string) {
    switch (type) {
      case "priority_borrow": return <Zap size={18} style={{ color: "#f59e0b" }} />;
      case "extended_deadline": return <Clock size={18} style={{ color: "#3b82f6" }} />;
      case "physical_prize": return <Package size={18} style={{ color: "#8b5cf6" }} />;
      case "badge": return <Award size={18} style={{ color: "#10b981" }} />;
      default: return <Gift size={18} style={{ color: "var(--color-primary)" }} />;
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "approved": return <CheckCircle2 size={14} style={{ color: "#16a34a" }} />;
      case "rejected": return <XCircle size={14} style={{ color: "#ef4444" }} />;
      case "fulfilled": return <CheckCircle2 size={14} style={{ color: "#10b981" }} />;
      default: return <Clock size={14} style={{ color: "#f59e0b" }} />;
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-background)" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="tile min-h-screen">
        <div className="max-w-4xl mx-auto px-5 py-8">
          {/* Header Banner decorated with scrap assets */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 relative overflow-hidden rounded-3xl p-6 bg-gradient-to-r from-[#fffcf5] via-[#f7f0e1] to-[#eedfc6] border border-[#dbd0ba] shadow-xs">
            <img
              src="/assetsscrap/740b5c8b07db91a07ad56a4e6989fc4d-removebg-preview.png"
              alt=""
              className="absolute -right-4 -bottom-6 w-32 opacity-25 pointer-events-none rotate-12"
            />
            <img
              src="/assetsscrap/8ee54f3f348a3635e9ec0245da7a9af9-removebg-preview.png"
              alt=""
              className="absolute left-1/2 -top-6 w-20 opacity-20 pointer-events-none -rotate-12 hidden sm:block"
            />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <img src="/assetsscrap/740b5c8b07db91a07ad56a4e6989fc4d-removebg-preview.png" alt="" className="w-5 h-5 object-contain" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#a67c52]">Tukarkan Hadiah</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#4a3f35] tracking-tight">
                Katalog Reward & Voucher
              </h1>
              <p className="text-xs sm:text-sm text-[#7d6b56] mt-1">
                Tukarkan Poin XP membaca Anda dengan voucher & keuntungan eksklusif.
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#fffcf5] border border-[#dbd0ba] shadow-xs">
              <Star size={18} style={{ color: "#f59e0b" }} className="fill-amber-400" />
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider block text-[#7d6b56]">Poin Anda</span>
                <span className="text-base font-black text-[#4a3f35] leading-none">{profile?.totalPoints || 0} XP</span>
              </div>
            </div>
          </div>

          {/* Rewards Grid */}
          {rewards.length === 0 ? (
            <div className="card text-center py-12">
              <Gift size={48} className="mx-auto mb-4" style={{ color: "var(--color-border)" }} />
              <h3 className="text-lg font-bold mb-2">Belum Ada Reward</h3>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Reward akan segera tersedia. Kumpulkan poin dengan membaca!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {rewards.map((reward, idx) => {
                const canAfford = (profile?.totalPoints || 0) >= reward.pointsCost;
                return (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="card p-4 flex flex-col"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-muted)" }}>
                        {getRewardIcon(reward.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold truncate">{reward.title}</h3>
                        <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: "var(--color-muted-foreground)" }}>{reward.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
                      <div className="flex items-center gap-1">
                        <Star size={12} style={{ color: "#f59e0b" }} />
                        <span className="text-xs font-bold">{reward.pointsCost}</span>
                        <span className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>poin</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                        background: reward.stock > 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                        color: reward.stock > 0 ? "#16a34a" : "#ef4444",
                      }}>
                        Stok: {reward.stock}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRedeem(reward.id)}
                      disabled={!canAfford || reward.stock <= 0 || redeeming === reward.id}
                      className="w-full mt-3 py-2 text-sm font-medium rounded-full transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background: canAfford && reward.stock > 0 ? "var(--color-primary)" : "var(--color-muted)",
                        color: canAfford && reward.stock > 0 ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)",
                      }}
                    >
                      {redeeming === reward.id ? (
                        <><Loader2 size={14} className="animate-spin" /> Menukar...</>
                      ) : !canAfford ? "Poin Kurang" : reward.stock <= 0 ? "Habis" : "Tukar"}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Redemption History */}
          {redemptions.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-bold mb-4">Riwayat Penukaran</h3>
              <div className="space-y-2">
                {redemptions.map((red) => (
                  <div key={red.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--color-muted)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--color-card)" }}>
                      {getStatusIcon(red.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{red.rewardTitle || "Reward"}</p>
                      <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>
                        {red.redeemedAt ? new Date(red.redeemedAt).toLocaleDateString("id-ID") : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{
                        background: red.status === "approved" || red.status === "fulfilled" ? "rgba(34,197,94,0.1)" :
                          red.status === "rejected" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                        color: red.status === "approved" || red.status === "fulfilled" ? "#16a34a" :
                          red.status === "rejected" ? "#ef4444" : "#f59e0b",
                      }}>
                        {red.status === "approved" ? "Disetujui" :
                          red.status === "rejected" ? "Ditolak" :
                            red.status === "fulfilled" ? "Selesai" : "Menunggu"}
                      </span>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                        -{red.pointsSpent} poin
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
