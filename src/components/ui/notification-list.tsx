"use client";

import * as React from "react";
import { RotateCcw, ArrowUpRight, Bell, MessageCircle, UserPlus, BookOpen, BookMarked, Star, BellRing } from "lucide-react";
import { motion, type Transition } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { onNotificationsChanged, markAllNotificationsAsRead, markNotificationAsRead, type AppNotification } from "@/lib/firestore";

const transition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 26,
};

const getCardVariants = (i: number) => ({
  collapsed: {
    marginTop: i === 0 ? 0 : -44,
    scaleX: 1 - i * 0.05,
  },
  expanded: {
    marginTop: i === 0 ? 0 : 4,
    scaleX: 1,
  },
});

const textSwitchTransition: Transition = {
  duration: 0.22,
  ease: "easeInOut",
};

const notificationTextVariants = {
  collapsed: { opacity: 1, y: 0, pointerEvents: "auto" as const },
  expanded: { opacity: 0, y: -16, pointerEvents: "none" as const },
};

const viewAllTextVariants = {
  collapsed: { opacity: 0, y: 16, pointerEvents: "none" as const },
  expanded: { opacity: 1, y: 0, pointerEvents: "auto" as const },
};

function getNotificationIcon(type: AppNotification["type"]) {
  const iconClass = "w-4 h-4";
  switch (type) {
    case "message": return <MessageCircle className={iconClass} style={{ color: "var(--color-primary)" }} />;
    case "friend_request": return <UserPlus className={iconClass} style={{ color: "#8b5cf6" }} />;
    case "borrow": return <BookOpen className={iconClass} style={{ color: "#22c55e" }} />;
    case "return": return <BookMarked className={iconClass} style={{ color: "#3b82f6" }} />;
    case "review": return <Star className={iconClass} style={{ color: "#f59e0b" }} />;
    case "system": return <BellRing className={iconClass} style={{ color: "var(--color-primary)" }} />;
    default: return <Bell className={iconClass} style={{ color: "var(--color-muted-foreground)" }} />;
  }
}

function NotificationList() {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;

    const unsub = onNotificationsChanged(user.uid, (notifs) => {
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.uid);
  };

  const handleClickNotif = async (notif: AppNotification) => {
    await markNotificationAsRead(notif.id);
    if (notif.link) {
      window.location.href = notif.link;
    }
  };

  if (!user || loading) return null;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
        style={{ color: "rgba(255,252,245,0.75)" }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ background: "var(--color-destructive)", color: "white" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <h3 className="text-sm font-bold">Notifikasi</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium flex items-center gap-1 transition-colors"
                  style={{ color: "var(--color-primary)" }}
                >
                  <RotateCcw size={10} />
                  Tandai semua dibaca
                </button>
              )}
            </div>

            {/* Notifications list */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell size={24} className="mx-auto mb-2" style={{ color: "var(--color-border)" }} />
                  <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Belum ada notifikasi</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notif, i) => (
                  <div
                    key={notif.id}
                    onClick={() => handleClickNotif(notif)}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-black/5"
                    style={{
                      background: notif.read ? "transparent" : "rgba(166,124,82,0.05)",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-muted)" }}>
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{notif.title}</p>
                      <p className="text-[10px] truncate" style={{ color: "var(--color-muted-foreground)" }}>{notif.body}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                        {new Date(notif.createdAt || 0).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: "var(--color-primary)" }} />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 text-center" style={{ borderTop: "1px solid var(--color-border)" }}>
                <button
                  onClick={() => { setIsOpen(false); }}
                  className="text-xs font-medium flex items-center gap-1 mx-auto transition-colors"
                  style={{ color: "var(--color-primary)" }}
                >
                  Lihat semua <ArrowUpRight size={10} />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}

export { NotificationList };
export default NotificationList;
