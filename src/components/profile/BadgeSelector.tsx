import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { setDisplayBadge } from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import { BadgeIcon, ALL_BADGES, getBadgeLabel } from "@/components/ui/user-avatar";
import { getAchievementIcon, achievementColors } from "@/lib/achievements";
import { Check, X } from "lucide-react";

interface BadgeSelectorProps {
  userBadges: string[];
  currentBadge: string | null;
  onClose: () => void;
}

export function BadgeSelector({ userBadges, currentBadge, onClose }: BadgeSelectorProps) {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(currentBadge);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await setDisplayBadge(user.uid, selected);
      await refreshProfile();
      toast("success", selected ? "Badge berhasil diubah!" : "Badge berhasil dihapus!");
      onClose();
    } catch (err) {
      toast("error", "Gagal mengubah badge");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
      <div className="rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto" style={{ background: "var(--color-card)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Pilih Badge Profil</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--color-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <p className="text-xs mb-4" style={{ color: "var(--color-muted-foreground)" }}>
          Badge akan ditampilkan di samping nama Anda di profil, chat, dan ulasan.
        </p>

        {/* No badge option */}
        <button
          onClick={() => setSelected(null)}
          className="w-full mb-3 p-3 rounded-xl border text-left transition-all flex items-center gap-3"
          style={{
            background: selected === null ? "var(--color-primary)" : "var(--color-card)",
            borderColor: selected === null ? "var(--color-primary)" : "var(--color-border)",
            color: selected === null ? "white" : "var(--color-foreground)",
          }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: selected === null ? "rgba(255,255,255,0.2)" : "var(--color-muted)" }}>
            <X size={16} />
          </div>
          <div>
            <p className="text-sm font-medium">Tanpa Badge</p>
            <p className="text-[10px]" style={{ color: selected === null ? "rgba(255,255,255,0.7)" : "var(--color-muted-foreground)" }}>Sembunyikan badge</p>
          </div>
          {selected === null && <Check size={16} className="ml-auto" />}
        </button>

        {/* Badge options */}
        <div className="space-y-2">
          {ALL_BADGES.map((badge) => {
            const isUnlocked = userBadges.includes(badge.type);
            const IconComponent = getAchievementIcon(badge.icon);
            const colors = achievementColors[badge.type] || { bg: "var(--color-muted)", text: "var(--color-muted-foreground)" };

            return (
              <button
                key={badge.type}
                onClick={() => isUnlocked && setSelected(badge.type)}
                disabled={!isUnlocked}
                className="w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3"
                style={{
                  background: selected === badge.type ? "var(--color-primary)" : "var(--color-card)",
                  borderColor: selected === badge.type ? "var(--color-primary)" : "var(--color-border)",
                  color: selected === badge.type ? "white" : "var(--color-foreground)",
                  opacity: isUnlocked ? 1 : 0.5,
                  cursor: isUnlocked ? "pointer" : "not-allowed",
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: selected === badge.type ? "rgba(255,255,255,0.2)" : colors.bg }}>
                  <IconComponent size={18} style={{ color: selected === badge.type ? "white" : colors.text }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{badge.title}</p>
                  <p className="text-[10px]" style={{ color: selected === badge.type ? "rgba(255,255,255,0.7)" : "var(--color-muted-foreground)" }}>
                    {isUnlocked ? badge.description : "Belum terbuka"}
                  </p>
                </div>
                {selected === badge.type && <Check size={16} />}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-6 h-12 text-white rounded-full text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "var(--color-primary)" }}
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}
