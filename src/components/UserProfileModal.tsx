import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getUserProfile, getUserDashboardStats, removeFriend, 
  sendFriendRequest, getFriends, calculateLevel, checkAndAwardDisplayBadges,
  getUserFavoriteBooks, getUserCommunityPosts, blockUser, unblockUser, isUserBlocked,
  type UserProfile, type ReadingStatsData, type DisplayBadge, type Book, type CommunityPost
} from "@/lib/firestore";
import { UserAvatar, BadgeIcon } from "@/components/ui/user-avatar";
import { useToast } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReportButton } from "@/components/ReportButton";
import { 
  X, MessageCircle, UserMinus, UserPlus, Award, BookOpen, 
  Flame, Calendar, MapPin, Heart, ShieldCheck, Zap, Quote, GraduationCap, 
  Compass, Lock, ExternalLink, Star, BookmarkCheck, UserX
} from "lucide-react";

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string | null;
  currentUserId?: string;
  currentUserName?: string;
  onUnfriendSuccess?: (friendId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  targetUserId,
  currentUserId,
  currentUserName,
  onUnfriendSuccess,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ReadingStatsData | null>(null);
  const [badges, setBadges] = useState<DisplayBadge[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<Book[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [isFriend, setIsFriend] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [poking, setPoking] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [showConfirmUnfriend, setShowConfirmUnfriend] = useState(false);
  const [unfriending, setUnfriending] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "books" | "quotes">("info");

  // Generate match score (no early return before hooks)
  const matchScore = React.useMemo(() => {
    if (!targetUserId || !currentUserId) return 88;
    let hash = 0;
    const combined = targetUserId + currentUserId;
    for (let i = 0; i < combined.length; i++) {
      hash = combined.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 85 + (Math.abs(hash) % 14); // 85% to 98%
  }, [targetUserId, currentUserId]);

  useEffect(() => {
    if (!isOpen || !targetUserId) return;
    let isMounted = true;

    async function loadUserData() {
      setLoading(true);
      try {
        const [uProfile, uStats, uBadges, uBooks, uPosts, myFriends] = await Promise.all([
          getUserProfile(targetUserId!),
          getUserDashboardStats(targetUserId!).catch(() => null),
          checkAndAwardDisplayBadges(targetUserId!).catch(() => []),
          getUserFavoriteBooks(targetUserId!).catch(() => []),
          getUserCommunityPosts(targetUserId!).catch(() => []),
          currentUserId ? getFriends(currentUserId).catch(() => []) : Promise.resolve([]),
        ]);

        if (isMounted) {
          setProfile(uProfile);
          setStats(uStats);
          setBadges(uBadges);
          setFavoriteBooks(uBooks);
          setCommunityPosts(uPosts);

          if (currentUserId && myFriends.length > 0) {
            const friendFound = myFriends.some(
              (f: any) =>
                (f.fromUserId === targetUserId && f.toUserId === currentUserId) ||
                (f.toUserId === targetUserId && f.fromUserId === currentUserId)
            );
            setIsFriend(friendFound);
          } else {
            setIsFriend(false);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUserData();
    return () => { isMounted = false; };
  }, [isOpen, targetUserId, currentUserId]);

  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockingLoading, setBlockingLoading] = useState<boolean>(false);

  if (!isOpen || !targetUserId) return null;

  const levelInfo = profile?.totalPoints != null ? calculateLevel(profile.totalPoints) : calculateLevel(0);
  const unlockedBadges = badges.filter((b) => b.unlocked);

  async function handleToggleBlock() {
    if (!currentUserId || !targetUserId) return;
    setBlockingLoading(true);
    try {
      if (isBlocked) {
        await unblockUser(currentUserId, targetUserId);
        setIsBlocked(false);
        toast("info", "Pengguna tidak lagi diblokir");
      } else {
        await blockUser(currentUserId, targetUserId);
        setIsBlocked(true);
        toast("warning", "Pengguna berhasil diblokir");
      }
    } catch {
      toast("error", "Gagal memperbarui status blokir");
    } finally {
      setBlockingLoading(false);
    }
  }

  async function handleAddFriend() {
    if (!currentUserId || !currentUserName || !targetUserId || !profile) return;
    setSendingRequest(true);
    try {
      await sendFriendRequest(currentUserId, currentUserName, profile.photoURL, targetUserId);
      toast("success", `Permintaan pertemanan dikirim ke ${profile.nama}!`);
    } catch (err: any) {
      toast("error", err.message || "Gagal mengirim permintaan");
    } finally {
      setSendingRequest(false);
    }
  }

  async function handleUnfriend() {
    if (!currentUserId || !targetUserId || !profile) return;
    setUnfriending(true);
    try {
      await removeFriend(currentUserId, targetUserId);
      toast("success", `${profile.nama} telah dihapus dari daftar teman.`);
      setIsFriend(false);
      if (onUnfriendSuccess) onUnfriendSuccess(targetUserId);
      setShowConfirmUnfriend(false);
      onClose();
    } catch (err: any) {
      toast("error", "Gagal menghapus pertemanan: " + err.message);
    } finally {
      setUnfriending(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 14 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-[#fffcf5] border border-[#dbd0ba] rounded-3xl shadow-2xl overflow-hidden text-[#4a3f35] my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Banner */}
              <div className="h-28 bg-[#4a3f35] border-b border-[#3b322a] relative p-4 flex items-start justify-between flex-shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#fffcf5]/15 rounded-full text-[#fffcf5] text-[11px] font-bold tracking-wider uppercase backdrop-blur-xs">
                  <ShieldCheck size={13} className="text-amber-200" />
                  <span>Profil Anggota Perpustakaan</span>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Main Content */}
              <div className="px-5 sm:px-6 pb-6 pt-0 overflow-y-auto flex-1">
                {/* Avatar with Ring & Match Score */}
                <div className="relative -mt-12 mb-3.5 flex justify-between items-end">
                  <div className="relative inline-block border-4 border-[#fffcf5] rounded-full shadow-md bg-white">
                    <UserAvatar
                      src={profile?.photoURL}
                      name={profile?.nama || "Pengguna"}
                      size="xl"
                      showBadge={!!profile?.displayBadge}
                      badge={profile?.displayBadge}
                      frame={profile?.avatarFrame}
                    />
                  </div>

                  {/* Compatibility Match */}
                  <div className="mb-1.5 bg-[#ece5d8] border border-[#dbd0ba] px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-2xs">
                    <Zap size={14} className="text-[#a67c52]" />
                    <span className="text-xs font-black text-[#4a3f35]">{matchScore}% Match Baca</span>
                  </div>
                </div>

                {loading ? (
                  <div className="py-20 text-center text-[#7d6b56] text-xs font-semibold animate-pulse space-y-2">
                    <div className="w-8 h-8 border-2 border-[#a67c52] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p>Memuat profil lengkap anggota...</p>
                  </div>
                ) : (
                  <>
                    {/* User Identity Header */}
                    <div className="mb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#4a3f35] tracking-tight">
                          {profile?.nama || "Pengguna Gibry"}
                        </h3>
                        {profile?.displayBadge && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#ece5d8] border border-[#dbd0ba] rounded-full text-xs font-bold text-[#4a3f35]">
                            <BadgeIcon badge={profile.displayBadge} size="sm" showLabel />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#7d6b56]">
                        <span className="font-medium">@{profile?.username || "pembaca"}</span>
                        {profile?.kelas && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#a67c52] bg-[#f5efe4] px-2 py-0.5 rounded-md border border-[#dbd0ba]/60">
                            <GraduationCap size={13} />
                            <span>{profile.kelas}</span>
                          </span>
                        )}
                      </div>

                      {/* Bio / Motto Baca */}
                      {(profile?.bio || profile?.favoriteQuote) && (
                        <div className="mt-3 p-3 bg-[#f7f3ea] border border-[#dbd0ba] rounded-2xl text-xs text-[#4a3f35] italic leading-relaxed flex items-start gap-2">
                          <Quote size={15} className="text-[#a67c52] flex-shrink-0 mt-0.5 rotate-180" />
                          <p>"{profile.bio || profile.favoriteQuote}"</p>
                        </div>
                      )}

                      {/* Minat Baca / Genre Favorit Chips */}
                      {profile?.minatBaca && profile.minatBaca.length > 0 && (
                        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-[#7d6b56] flex items-center gap-1 mr-1">
                            <Compass size={12} className="text-[#a67c52]" />
                            Minat:
                          </span>
                          {profile.minatBaca.map((genre, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#ece5d8] text-[#4a3f35] border border-[#dbd0ba]"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Segmented Tab Navigation inside Modal */}
                    <div className="flex items-center gap-1 p-1 bg-[#ece5d8] border border-[#dbd0ba] rounded-xl mb-4 text-xs font-bold">
                      <button
                        onClick={() => setActiveTab("info")}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${
                          activeTab === "info"
                            ? "bg-[#fffcf5] text-[#4a3f35] shadow-2xs border border-[#dbd0ba]"
                            : "text-[#7d6b56] hover:text-[#4a3f35]"
                        }`}
                      >
                        Biodata & Lencana
                      </button>
                      <button
                        onClick={() => setActiveTab("books")}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all flex items-center justify-center gap-1 ${
                          activeTab === "books"
                            ? "bg-[#fffcf5] text-[#4a3f35] shadow-2xs border border-[#dbd0ba]"
                            : "text-[#7d6b56] hover:text-[#4a3f35]"
                        }`}
                      >
                        <span>Buku Favorit</span>
                        {favoriteBooks.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#a67c52] text-white">
                            {favoriteBooks.length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab("quotes")}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all flex items-center justify-center gap-1 ${
                          activeTab === "quotes"
                            ? "bg-[#fffcf5] text-[#4a3f35] shadow-2xs border border-[#dbd0ba]"
                            : "text-[#7d6b56] hover:text-[#4a3f35]"
                        }`}
                      >
                        <span>Kutipan Publik</span>
                        {communityPosts.filter((p) => p.type === "quote").length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#a67c52] text-white">
                            {communityPosts.filter((p) => p.type === "quote").length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* TAB 1: BIODATA & LENCANA */}
                    {activeTab === "info" && (
                      <div className="space-y-4">
                        {/* Level & Rank Badge Card */}
                        <div className="bg-[#f7f3ea] border border-[#dbd0ba] rounded-2xl p-4 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-[#a67c52] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                                <Award size={18} />
                              </div>
                              <div>
                                <p className="text-xs font-black text-[#4a3f35]">Level {levelInfo.level} • {levelInfo.title}</p>
                                <p className="text-[10px] text-[#7d6b56] font-medium">{profile?.totalPoints || 0} Total Poin Literasi</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-[#a67c52] bg-[#fffcf5] border border-[#dbd0ba] px-2 py-0.5 rounded-lg">
                              Target: {levelInfo.nextLevelPoints} Pts
                            </span>
                          </div>

                          {/* Level Progress Bar */}
                          <div className="w-full bg-[#ece5d8] h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#a67c52] h-full transition-all duration-500 rounded-full"
                              style={{ width: `${Math.min(100, ((profile?.totalPoints || 0) / levelInfo.nextLevelPoints) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Reading Stats Grid */}
                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="bg-[#fbf8f0] border border-[#dbd0ba] rounded-2xl p-3 text-center">
                            <BookOpen size={16} className="mx-auto text-[#a67c52] mb-1" />
                            <p className="text-base font-black text-[#4a3f35]">{stats?.totalBorrows || 0}</p>
                            <p className="text-[10px] text-[#7d6b56] font-semibold">Buku Dibaca</p>
                          </div>

                          <div className="bg-[#fbf8f0] border border-[#dbd0ba] rounded-2xl p-3 text-center">
                            <Flame size={16} className="mx-auto text-[#a67c52] mb-1" />
                            <p className="text-base font-black text-[#4a3f35]">{stats?.readingStreak || 0} Hari</p>
                            <p className="text-[10px] text-[#7d6b56] font-semibold">Streak</p>
                          </div>

                          <div className="bg-[#fbf8f0] border border-[#dbd0ba] rounded-2xl p-3 text-center">
                            <Heart size={16} className="mx-auto text-[#a67c52] mb-1" />
                            <p className="text-base font-black text-[#4a3f35]">{stats?.totalFavorites || 0}</p>
                            <p className="text-[10px] text-[#7d6b56] font-semibold">Favorit</p>
                          </div>
                        </div>

                        {/* Badges Collection Showcase */}
                        <div className="bg-[#fbf8f0] border border-[#dbd0ba] rounded-2xl p-3.5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#4a3f35] flex items-center gap-1.5">
                              <Award size={14} className="text-[#a67c52]" />
                              Koleksi Lencana ({unlockedBadges.length}/{badges.length || 12})
                            </span>
                            <span className="text-[10px] font-semibold text-[#7d6b56]">
                              {unlockedBadges.length > 0 ? "Diraih" : "Belum ada lencana"}
                            </span>
                          </div>

                          {badges.length === 0 ? (
                            <p className="text-[11px] text-[#7d6b56] italic">Memuat data lencana...</p>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {badges.map((b) => (
                                <div
                                  key={b.type}
                                  className={`p-2 rounded-xl border text-left transition-all ${
                                    b.unlocked
                                      ? "bg-[#fffcf5] border-[#dbd0ba] shadow-2xs"
                                      : "bg-[#ece5d8]/50 border-dashed border-[#dbd0ba]/70 opacity-60"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <BadgeIcon badge={b.type} size="sm" />
                                    <span className="text-[11px] font-bold text-[#4a3f35] truncate">{b.title}</span>
                                  </div>
                                  <p className="text-[9px] text-[#7d6b56] line-clamp-1">{b.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Additional Metadata */}
                        <div className="space-y-1.5 text-xs text-[#7d6b56] pt-1">
                          {profile?.alamat && (
                            <div className="flex items-center gap-2">
                              <MapPin size={13} className="text-[#a67c52]" />
                              <span>{profile.alamat}</span>
                            </div>
                          )}
                          {profile?.createdAt && (
                            <div className="flex items-center gap-2">
                              <Calendar size={13} className="text-[#a67c52]" />
                              <span>Bergabung sejak {new Date(profile.createdAt).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 2: BUKU FAVORIT / REKOMENDASI */}
                    {activeTab === "books" && (
                      <div className="space-y-3">
                        {favoriteBooks.length === 0 ? (
                          <div className="bg-[#fbf8f0] border border-[#dbd0ba] rounded-2xl p-6 text-center">
                            <BookOpen size={28} className="mx-auto text-[#a67c52] mb-2 opacity-60" />
                            <p className="text-xs font-bold text-[#4a3f35]">Belum Ada Buku Favorit</p>
                            <p className="text-[11px] text-[#7d6b56] mt-1">
                              Anggota ini belum menambahkan buku ke daftar favorit rekomendasinya.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {favoriteBooks.map((book) => (
                              <div
                                key={book.id}
                                onClick={() => {
                                  onClose();
                                  navigate(`/book/${book.id}`);
                                }}
                                className="bg-[#fffcf5] border border-[#dbd0ba] rounded-xl p-2.5 flex items-start gap-2.5 hover:border-[#a67c52] hover:shadow-xs transition-all cursor-pointer group"
                              >
                                <img
                                  src={book.coverUrl || "/placeholder-book.png"}
                                  alt={book.judul}
                                  className="w-12 h-16 object-cover rounded-lg border border-[#dbd0ba] flex-shrink-0 bg-stone-100"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-[#4a3f35] line-clamp-1 group-hover:text-[#a67c52] transition-colors">
                                    {book.judul}
                                  </h4>
                                  <p className="text-[10px] text-[#7d6b56] truncate mt-0.5">{book.penulis}</p>
                                  <div className="flex items-center justify-between mt-2 text-[10px] text-[#7d6b56]">
                                    <span className="font-semibold text-amber-700 flex items-center gap-0.5">
                                      <Star size={10} className="fill-amber-500 text-amber-500" />
                                      {book.rating ? book.rating.toFixed(1) : "4.5"}
                                    </span>
                                    <span className="text-[9px] font-bold text-[#a67c52] flex items-center gap-0.5 group-hover:underline">
                                      Lihat <ExternalLink size={9} />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: KUTIPAN & CATATAN PUBLIK */}
                    {activeTab === "quotes" && (
                      <div className="space-y-3">
                        {communityPosts.filter((p) => p.type === "quote").length === 0 ? (
                          <div className="bg-[#fbf8f0] border border-[#dbd0ba] rounded-2xl p-6 text-center">
                            <Quote size={28} className="mx-auto text-[#a67c52] mb-2 opacity-60" />
                            <p className="text-xs font-bold text-[#4a3f35]">Belum Ada Kutipan Publik</p>
                            <p className="text-[11px] text-[#7d6b56] mt-1">
                              Anggota ini belum membagikan kutipan atau catatan buku ke komunitas.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {communityPosts
                              .filter((p) => p.type === "quote")
                              .map((post) => (
                                <div
                                  key={post.id}
                                  className="bg-[#fbf8f0] border border-[#dbd0ba] rounded-2xl p-3.5 space-y-2 text-left"
                                >
                                  <div className="flex items-start gap-2">
                                    <Quote size={16} className="text-[#a67c52] flex-shrink-0 mt-0.5 rotate-180" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-serif italic text-[#4a3f35] leading-relaxed">
                                        "{post.content}"
                                      </p>
                                      {post.bookTitle && (
                                        <p className="text-[10px] font-bold text-[#a67c52] mt-1.5">
                                          — {post.bookTitle} {post.pageNumber ? `(Hal. ${post.pageNumber})` : ""}
                                        </p>
                                      )}
                                      {post.reflection && (
                                        <div className="mt-2 text-[10px] text-[#7d6b56] bg-[#fffcf5] border border-[#dbd0ba]/70 rounded-xl p-2 leading-relaxed">
                                          <span className="font-bold text-[#4a3f35]">Catatan Refleksi: </span>
                                          {post.reflection}
                                        </div>
                                      )}
                                      <div className="mt-2 flex items-center gap-3 text-[10px] text-[#7d6b56]">
                                        <span className="flex items-center gap-1 font-semibold">
                                          <Heart size={11} className="text-rose-500 fill-rose-500" />
                                          {post.likesCount || 0} Suka
                                        </span>
                                        <span className="flex items-center gap-1 font-semibold">
                                          <BookmarkCheck size={11} className="text-[#a67c52]" />
                                          {post.savedCount || 0} Tersimpan
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons Bar */}
              <div className="px-5 sm:px-6 py-3.5 bg-[#fbf8f0] border-t border-[#dbd0ba] flex flex-wrap items-center gap-2 flex-shrink-0">
                {/* Chat Button */}
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/chat/${targetUserId}`);
                  }}
                  disabled={isBlocked}
                  className="flex-1 min-w-[120px] py-2 px-3.5 bg-[#a67c52] hover:bg-[#8d6e4c] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                >
                  <MessageCircle size={15} />
                  <span>Kirim Pesan</span>
                </button>

                {/* Friend / Unfriend Toggle */}
                {currentUserId && targetUserId !== currentUserId && (
                  isFriend ? (
                    <button
                      onClick={() => setShowConfirmUnfriend(true)}
                      className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      title="Hapus pertemanan"
                    >
                      <UserMinus size={14} />
                      <span>Hapus Teman</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleAddFriend}
                      disabled={sendingRequest || isBlocked}
                      className="py-2 px-3 bg-[#f0ede6] hover:bg-[#e4ddcf] text-[#4a3f35] border border-[#dbd0ba] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      title="Tambah sebagai teman"
                    >
                      <UserPlus size={14} className="text-[#a67c52]" />
                      <span>{sendingRequest ? "Mengirim..." : "Tambah Teman"}</span>
                    </button>
                  )
                )}

                {/* Block Toggle */}
                {currentUserId && targetUserId !== currentUserId && (
                  <button
                    onClick={handleToggleBlock}
                    disabled={blockingLoading}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border ${
                      isBlocked
                        ? "bg-stone-200 hover:bg-stone-300 text-stone-700 border-stone-300"
                        : "bg-rose-50/60 hover:bg-rose-100 text-rose-700 border-rose-200"
                    }`}
                    title={isBlocked ? "Buka blokir pengguna" : "Blokir pengguna ini"}
                  >
                    <UserX size={14} />
                    <span>{isBlocked ? "Buka Blokir" : "Blokir"}</span>
                  </button>
                )}

                {/* Report Profile Button */}
                {currentUserId && targetUserId !== currentUserId && (
                  <ReportButton
                    targetType="user_profile"
                    targetId={targetUserId}
                    targetUserId={targetUserId}
                    targetUserName={profile?.nama || "Pengguna"}
                    contentSnapshot={`Profil @${profile?.username || ""}: ${profile?.bio || ""}`}
                    className="p-2 border border-[#dbd0ba] rounded-xl bg-white"
                    iconSize={16}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unfriend Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirmUnfriend}
        onCancel={() => setShowConfirmUnfriend(false)}
        onConfirm={handleUnfriend}
        title="Hapus Pertemanan?"
        message={`Apakah Anda yakin ingin menghapus ${profile?.nama || "pengguna ini"} dari daftar teman Anda?`}
        confirmText="Hapus Teman"
        cancelText="Batal"
        variant="danger"
      />
    </>
  );
};

export default UserProfileModal;
