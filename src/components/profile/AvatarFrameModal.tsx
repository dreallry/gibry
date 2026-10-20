import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { setAvatarFrame, claimEventAvatarFrame } from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import { AVATAR_FRAMES, isFrameEventActive, type AvatarFrame } from "@/lib/avatarFrames";
import { UserAvatar } from "@/components/ui/user-avatar";
import { X, Check, Palette, Gift, Calendar, Lock, ShieldCheck } from "lucide-react";

interface AvatarFrameModalProps {
  onClose: () => void;
}

export const AvatarFrameModal: React.FC<AvatarFrameModalProps> = ({ onClose }) => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(profile?.avatarFrame || null);
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  if (!user || !profile) return null;

  const unlockedList: string[] = Array.isArray(profile.unlockedFrames) ? profile.unlockedFrames : [];

  const handleClaim = async (frame: AvatarFrame) => {
    setClaiming(frame.id);
    try {
      const res = await claimEventAvatarFrame(user.uid, frame.id);
      if (res.success) {
        toast("success", res.message);
        setSelectedFrameId(frame.id);
        await refreshProfile();
      } else {
        toast("error", res.message);
      }
    } catch (err: any) {
      toast("error", "Gagal mengklaim bingkai: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setClaiming(null);
    }
  };

  const handleApplyFrame = async (frameId: string | null) => {
    setSaving(true);
    try {
      await setAvatarFrame(user.uid, frameId);
      await refreshProfile();
      setSelectedFrameId(frameId);
      toast("success", frameId ? "Bingkai avatar berhasil dipasang!" : "Bingkai avatar dilepas.");
      onClose();
    } catch (err: any) {
      toast("error", "Gagal mengubah bingkai: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#FFF9EF] border border-[#DEDDD0] rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-[0_20px_50px_rgba(48,77,66,0.18)] max-h-[88vh] overflow-y-auto space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#DEDDD0]">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#AD6549] font-bold">
              <Palette size={12} />
              <span>KOLEKSI BINGKAI PROFIL</span>
            </div>
            <h3 className="text-xl font-editorial text-[#304D42] mt-0.5">Bingkai Avatar & Event</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF7F0] hover:bg-[#E8EBDF] border border-[#DEDDD0] text-[#797D6E] hover:text-[#304D42] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="bg-[#FAF7F0] border border-[#DEDDD0] rounded-2xl p-4 sm:p-5 flex items-center gap-6">
          <div className="relative shrink-0 w-24 h-24 flex items-center justify-center">
            <UserAvatar
              src={profile.photoURL}
              name={profile.nama}
              size="xl"
              showBadge={!!profile.displayBadge}
              badge={profile.displayBadge}
              frame={selectedFrameId}
            />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#797D6E] font-bold block">
              Pratinjau Langsung
            </span>
            <h4 className="text-base sm:text-lg font-editorial font-bold text-[#304D42] truncate">{profile.nama}</h4>
            <p className="text-xs text-[#797D6E] font-space">
              {selectedFrameId ? (
                <span>
                  Bingkai: <strong className="text-[#AD6549]">{AVATAR_FRAMES.find((f) => f.id === selectedFrameId)?.name}</strong>
                </span>
              ) : (
                "Tanpa bingkai avatar khusus"
              )}
            </p>
            {selectedFrameId && (
              <p className="text-[11px] text-[#797D6E] font-space italic line-clamp-2">
                "{AVATAR_FRAMES.find((f) => f.id === selectedFrameId)?.description}"
              </p>
            )}
          </div>
        </div>

        {/* Frames List */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#797D6E] font-bold block">
            Pilih Bingkai Tersedia
          </span>

          {/* Option: Tanpa Bingkai */}
          <div
            onClick={() => setSelectedFrameId(null)}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              selectedFrameId === null
                ? "bg-[#E8EBDF] border-[#304D42] text-[#304D42] shadow-2xs"
                : "bg-white border-[#DEDDD0] text-[#797D6E] hover:bg-[#FAF7F0]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-dashed border-[#797D6E] flex items-center justify-center text-xs font-mono text-[#797D6E]">
                Polos
              </div>
              <div>
                <p className="text-xs font-bold text-[#304D42]">Tanpa Bingkai</p>
                <p className="text-[11px] text-[#797D6E] font-space">Gunakan avatar standar tanpa dekorasi tambahan</p>
              </div>
            </div>
            {selectedFrameId === null && <Check size={16} className="text-[#304D42]" />}
          </div>

          {/* List of Registered Frames */}
          {AVATAR_FRAMES.map((f) => {
            const isUnlocked = !f.eventOnly || unlockedList.includes(f.id);
            const isEquipped = profile.avatarFrame === f.id;
            const isSelected = selectedFrameId === f.id;
            const eventStatus = isFrameEventActive(f);

            return (
              <div
                key={f.id}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                  isSelected
                    ? "bg-[#FAF7F0] border-[#304D42] shadow-xs"
                    : "bg-white border-[#DEDDD0] hover:bg-[#FAF7F0]"
                }`}
              >
                <div
                  className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0"
                  onClick={() => setSelectedFrameId(f.id)}
                >
                  <div className="relative shrink-0 w-14 h-14 flex items-center justify-center">
                    <UserAvatar
                      src={profile.photoURL}
                      name={profile.nama}
                      size="md"
                      frame={f.id}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs font-bold text-[#304D42]">{f.name}</p>
                      {f.eventOnly && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200">
                          {f.tag || "Event"}
                        </span>
                      )}
                      {!f.eventOnly && f.tag && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          {f.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#797D6E] font-space mt-0.5 leading-snug line-clamp-2">{f.description}</p>
                    {f.eventDateRange && (
                      <div className="flex flex-wrap items-center gap-1 mt-1 text-[10px] font-mono text-[#AD6549]">
                        <Calendar size={11} />
                        <span>Periode: {f.eventDateRange.label}</span>
                        {eventStatus.isActive ? (
                          <span className="text-emerald-700 font-bold ml-1">• Aktif Sekarang!</span>
                        ) : (
                          <span className="text-amber-700 font-medium ml-1">• {eventStatus.reason}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#DEDDD0]">
                  {isUnlocked ? (
                    isEquipped ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <ShieldCheck size={12} />
                        <span>Dipasang</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApplyFrame(f.id)}
                        disabled={saving}
                        className="px-3.5 py-1.5 rounded-xl bg-[#304D42] hover:bg-[#203830] text-[#FFF9EF] text-xs font-bold cursor-pointer transition-colors active:scale-95"
                      >
                        Pasang
                      </button>
                    )
                  ) : f.eventOnly && eventStatus.isActive ? (
                    <button
                      type="button"
                      onClick={() => handleClaim(f)}
                      disabled={claiming === f.id}
                      className="px-3.5 py-1.5 rounded-xl bg-[#AD6549] hover:bg-[#8E523A] text-[#FFF9EF] text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Gift size={12} />
                      <span>{claiming === f.id ? "Mengklaim..." : "Klaim Event"}</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-space text-[#797D6E] bg-[#E8EBDF] px-2.5 py-1 rounded-xl">
                      <Lock size={11} />
                      <span>{eventStatus.reason.includes("belum") ? "Belum Dimulai" : "Event Berakhir"}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Save Action */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#DEDDD0]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#797D6E] hover:text-[#304D42] cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => handleApplyFrame(selectedFrameId)}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#304D42] hover:bg-[#203830] text-[#FFF9EF] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <Check size={14} />
            <span>{saving ? "Menyimpan..." : "Terapkan Bingkai Pilihan"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
