import { CommunityTimeline } from "@/components/social/CommunityTimeline";
import { FriendsPanel } from "@/components/social/FriendsPanel";
import { FindReadersPanel } from "@/components/social/FindReadersPanel";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { Search, Users, MessageSquare, Sparkles } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";

import { UserProfileModal } from "@/components/UserProfileModal";

import { useSocialFeed } from "@/hooks/social/useSocialFeed";
import { useSocialComposer } from "@/hooks/social/useSocialComposer";
import { useSocialReplies } from "@/hooks/social/useSocialReplies";
import { useSocialFriends } from "@/hooks/social/useSocialFriends";

export default function SocialPage() {

  const { user, profile } = useAuth();

  const { toast } = useToast();

  const navigate = useNavigate();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"timeline" | "friends" | "find">("timeline");

  // Profile Modal & Unfriend State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);

  const [unfriendTarget, setUnfriendTarget] = useState<{ id: string; name: string } | null>(null);

  function openUserProfile(userId: string) {
    setSelectedUserId(userId);
    setShowProfileModal(true);
  }

  function formatTimeAgo(timestamp?: number) {
    if (!timestamp) return "Baru saja";
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Baru saja";
    if (minutes < 60) return `${minutes}m lalu`;
    if (hours < 24) return `${hours}j lalu`;
    if (days < 7) return `${days}h lalu`;
    return new Date(timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }

  const feed = useSocialFeed({ user, toast });

  const composer = useSocialComposer({ user, profile, toast, loadCommunityPosts: feed.loadCommunityPosts });

  const replies = useSocialReplies({ user, profile, toast, setPosts: feed.setPosts });

  const friendship = useSocialFriends({ user, profile, toast, unfriendTarget, setUnfriendTarget });
  const { loadFriendsData } = friendship;
  const { loadBooks } = replies;

  // Initial Load
  useEffect(() => {
    if (user) {
      loadFriendsData();
      loadBooks();
    }
  }, [user, loadFriendsData, loadBooks]);

  const onlineCount = Object.values(friendship.onlineStatuses).filter(Boolean).length;

  if (!user) {
    return (
      <PageTransition>
        <div className="tile min-h-[80vh] flex items-center justify-center">
          <div className="max-w-md mx-auto px-6 text-center bg-[#fffcf5] border border-[#dbd0ba] rounded-2xl p-8 shadow-xs">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#ece5d8] border border-[#dbd0ba] flex items-center justify-center text-[#a67c52]">
              <Users size={28} />
            </div>
            <h1 className="text-xl font-bold font-serif text-[#4a3f35] mb-2">Komunitas Gibry</h1>
            <p className="text-xs text-[#7d6b56] mb-6 leading-relaxed">
              Masuk untuk berbagi kutipan buku favorit, bertanya rekomendasi bacaan, dan terhubung dengan sesama pembaca.
            </p>
            <Link to="/login" className="inline-flex items-center gap-2 bg-[#a67c52] hover:bg-[#8d6e4c] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-colors">
              Masuk ke Akun
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="tile pt-24 sm:pt-28 pb-12 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">

        {/* ── HEADER BANNER DENGAN ASSET SCRAP GIBRY ── */}
        <div className="border border-[#dbd0ba] relative overflow-hidden rounded-3xl p-6 bg-gradient-to-r from-[#fffcf5] via-[#fbf7ee] to-[#f4ecd8] shadow-xs">
          <img
            src="/assetsscrap/phone.png"
            alt=""
            className="absolute -right-2 -bottom-4 w-28 opacity-20 md:opacity-35 pointer-events-none rotate-12 hover:scale-110 transition-transform"
          />
          <img
            src="/assetsscrap/coffeecup.png"
            alt=""
            className="absolute right-36 top-2 w-16 opacity-25 pointer-events-none -rotate-6 hidden sm:block"
          />

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-[#ece5d8] border border-[#dbd0ba] text-[10px] font-extrabold uppercase tracking-wider text-[#a67c52] inline-flex items-center gap-1">
                  <Sparkles size={11} />
                  Ruang Literasi Terbuka
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#4a3f35] tracking-tight">
                Komunitas & Linimasa Buku
              </h1>
              <p className="text-xs sm:text-sm text-[#7d6b56] mt-1 max-w-lg leading-relaxed">
                Bagikan kutipan paling bermakna dari bacaanmu, diskusikan topik hangat, atau ajukan tanya rekomendasi buku pada teman dan pustakawan.
              </p>
            </div>

            {/* Quick Stats Header */}
            <div className="grid grid-cols-3 gap-2.5 min-w-[260px]">
              <div className="bg-[#fffcf5]/90 backdrop-blur-xs border border-[#dbd0ba] px-3 py-2 rounded-xl text-center shadow-2xs">
                <p className="text-base font-bold text-[#4a3f35] leading-none">{feed.posts.length}</p>
                <p className="text-[10px] text-[#7d6b56] font-semibold mt-1">Postingan</p>
              </div>

              <div className="bg-[#fffcf5]/90 backdrop-blur-xs border border-[#dbd0ba] px-3 py-2 rounded-xl text-center shadow-2xs">
                <p className="text-base font-bold text-[#16a34a] leading-none">{onlineCount}</p>
                <p className="text-[10px] text-[#7d6b56] font-semibold mt-1">Teman Online</p>
              </div>

              <div className="bg-[#fffcf5]/90 backdrop-blur-xs border border-[#dbd0ba] px-3 py-2 rounded-xl text-center shadow-2xs">
                <p className="text-base font-bold text-[#a67c52] leading-none">{friendship.friends.length}</p>
                <p className="text-[10px] text-[#7d6b56] font-semibold mt-1">Sahabat Baca</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN TABS NAVIGATION ── */}
        <div className="flex items-center gap-1.5 p-1 bg-[#ece5d8] border border-[#dbd0ba] rounded-2xl">
          {[
            { id: "timeline" as const, label: "Linimasa Komunitas", icon: MessageSquare },
            { id: "friends" as const, label: "Daftar Teman", icon: Users, count: friendship.friends.length },
            { id: "find" as const, label: "Cari Pembaca", icon: Search },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${isActive
                    ? "bg-[#fffcf5] text-[#4a3f35] border border-[#dbd0ba] shadow-2xs"
                    : "text-[#7d6b56] hover:text-[#4a3f35]"
                  }`}
              >
                <Icon size={15} className={isActive ? "text-[#a67c52]" : ""} />
                <span>{tab.label}</span>
                {tab.count != null && tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-[#a67c52] text-white" : "bg-[#dbd0ba] text-[#4a3f35]"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* ── TAB 1: LINIMASA KOMUNITAS (QUOTES & ASKS) ── */}
        {/* ══════════════════════════════════════════════ */}
        <CommunityTimeline {...feed} {...composer} {...replies} activeTab={activeTab} user={user} profile={profile} openUserProfile={openUserProfile} formatTimeAgo={formatTimeAgo} navigate={navigate} />

        {/* ══════════════════════════════════════════════ */}
        {/* ── TAB 2: DAFTAR TEMAN & PERMINTAAN ────────── */}
        {/* ══════════════════════════════════════════════ */}
        <FriendsPanel {...friendship} activeTab={activeTab} setActiveTab={setActiveTab} user={user} openUserProfile={openUserProfile} setUnfriendTarget={setUnfriendTarget} navigate={navigate} />

        {/* ══════════════════════════════════════════════ */}
        {/* ── TAB 3: CARI PEMBACA LAIN ────────────────── */}
        {/* ══════════════════════════════════════════════ */}
        <FindReadersPanel {...friendship} activeTab={activeTab} openUserProfile={openUserProfile} />

      </div>

      {/* User Profile Detail Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        targetUserId={selectedUserId}
        currentUserId={user?.uid}
        currentUserName={profile?.nama}
        onUnfriendSuccess={() => friendship.loadFriendsData()}
      />

      {/* Direct Unfriend Confirmation Dialog */}
      <ConfirmDialog
        open={!!unfriendTarget}
        onCancel={() => setUnfriendTarget(null)}
        onConfirm={friendship.confirmUnfriend}
        title="Hapus Pertemanan?"
        message={`Apakah Anda yakin ingin menghapus ${unfriendTarget?.name || "pengguna ini"} dari daftar sahabat baca?`}
        confirmText="Hapus Teman"
        cancelText="Batal"
        variant="danger"
      />
    </PageTransition>
  );
}
