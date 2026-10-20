import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { onNotificationsChanged, markNotificationAsRead, sendPoke, getUserProfile, type AppNotification, type UserProfile } from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import { UserAvatar } from "@/components/ui/user-avatar";
import { MessageCircle, X, Hand } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PokeListener() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activePoke, setActivePoke] = useState<{
    notification: AppNotification;
    senderId: string;
    senderName: string;
    senderProfile: UserProfile | null;
  } | null>(null);

  const [pokingBack, setPokingBack] = useState(false);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());

  // Auto dismiss timer (7 seconds)
  const AUTO_DISMISS_TIME = 7000;
  const [isHovered, setIsHovered] = useState(false);

  const handleClose = useCallback(async () => {
    if (activePoke) {
      try {
        await markNotificationAsRead(activePoke.notification.id);
      } catch (err) {
        console.error(err);
      }
    }
    setActivePoke(null);
  }, [activePoke]);

  useEffect(() => {
    if (!user) {
      setActivePoke(null);
      return;
    }

    const unsubscribe = onNotificationsChanged(user.uid, async (notifications) => {
      // Find latest unread poke notification
      const unreadPoke = notifications.find((n) => {
        const isPoke = n.title.includes("Mencolek") || (n.link && n.link.startsWith("/chat/"));
        return !n.read && isPoke && !seenNotifIdsRef.current.has(n.id);
      });

      if (unreadPoke) {
        if (seenNotifIdsRef.current.size > 50) {
          seenNotifIdsRef.current.clear();
        }
        seenNotifIdsRef.current.add(unreadPoke.id);

        const senderId = unreadPoke.link ? unreadPoke.link.replace("/chat/", "") : "";
        const senderName = unreadPoke.title.replace(/^👋\s*/, "").replace(/\s*Mencolek Kamu!.*$/, "").trim() || "Teman";

        let senderProfile: UserProfile | null = null;
        if (senderId) {
          try {
            senderProfile = await getUserProfile(senderId);
          } catch (err) {
            console.error(err);
          }
        }

        setActivePoke({
          notification: unreadPoke,
          senderId,
          senderName: senderProfile?.nama || senderName,
          senderProfile,
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Auto-hide countdown timer without 100ms interval re-renders
  useEffect(() => {
    if (!activePoke) return;
    if (isHovered) return;

    const timer = setTimeout(() => {
      handleClose();
    }, AUTO_DISMISS_TIME);

    return () => clearTimeout(timer);
  }, [activePoke, isHovered, handleClose]);

  const handlePokeBack = async () => {
    if (!user || !profile || !activePoke || !activePoke.senderId) return;
    setPokingBack(true);
    try {
      await sendPoke(user.uid, profile.nama, activePoke.senderId);
      toast("success", `Berhasil membalas sapaan ke ${activePoke.senderName}!`);
      await handleClose();
    } catch (err: any) {
      toast("error", err.message || "Gagal membalas colekan");
    } finally {
      setPokingBack(false);
    }
  };

  const handleOpenChat = async () => {
    if (!activePoke) return;
    const senderId = activePoke.senderId;
    await handleClose();
    if (senderId) {
      navigate(`/chat/${senderId}`);
    }
  };

  if (!activePoke) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed bottom-6 right-6 z-50 max-w-sm w-full px-4 sm:px-0"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="relative overflow-hidden rounded-2xl p-5 shadow-2xl border border-[#a67c52]/30 text-[#4a3f35]"
          style={{
            background: "linear-gradient(135deg, #fffcf7 0%, #f7efdf 100%)",
            boxShadow: "0 20px 40px -15px rgba(74,63,53,0.3), 0 0 20px rgba(166,124,82,0.2)",
          }}
        >
          {/* Top Countdown Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#e6d8c3] overflow-hidden">
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: isHovered ? undefined : "0%" }}
              transition={{ duration: AUTO_DISMISS_TIME / 1000, ease: "linear" }}
              className="h-full bg-gradient-to-r from-amber-500 to-[#a67c52]"
            />
          </div>

          {/* Top Decorative Sparkle Tag */}
          <div className="flex items-center justify-between gap-2 mb-3 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#a67c52]/15 text-[#8c5e34] border border-[#a67c52]/20">
              <Hand size={13} className="text-[#8c5e34]" />
              <span>Sapaan Baru!</span>
            </div>

            <button
              onClick={handleClose}
              className="p-1 rounded-full text-[#7d6b56] hover:bg-[#a67c52]/10 transition-colors"
              title="Tutup"
            >
              <X size={16} />
            </button>
          </div>

          {/* User Info & Body */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <UserAvatar
                src={activePoke.senderProfile?.photoURL || ""}
                name={activePoke.senderName}
                size="md"
              />
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1 text-[10px] shadow-sm flex items-center justify-center">
                <Hand size={10} />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-[#4a3f35] truncate">
                {activePoke.senderName}
              </h4>
              <p className="text-xs text-[#7d6b56] leading-snug mt-0.5 line-clamp-2">
                {activePoke.notification.body || "Mengajakmu diskusi & baca buku bareng hari ini!"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handlePokeBack}
              disabled={pokingBack}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#a67c52] text-white hover:bg-[#8c5e34] active:scale-[0.98] transition-all shadow-md disabled:opacity-50"
            >
              <Hand size={14} className="animate-pulse" />
              <span>Colek Balik</span>
            </button>

            <button
              onClick={handleOpenChat}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#fffcf5] text-[#4a3f35] border border-[#dbd0ba] hover:bg-[#f7efdf] active:scale-[0.98] transition-all"
            >
              <MessageCircle size={14} />
              <span>Balas Chat</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
