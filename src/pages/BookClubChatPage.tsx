import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/components/Toast";
import { getBookClubs, sendClubMessage, onClubMessagesChanged, isUserClubMember, getUserProfile, getClubMemberDetails, getClubMemberRole, updateBookClub, deleteBookClub, updateClubMemberRole, transferClubOwnership, leaveBookClub, getBooks, type BookClub, type ClubMessage, type UserProfile, type DetailedClubMember, type Book } from "@/lib/firestore";
import { ArrowLeft, Send, Loader2, Users, LogIn, X, Info, Award, MapPin, Crown, Shield, Edit3, Trash2, UserMinus, Search, BookOpen, MessageCircle, Settings, LogOut, Check } from "lucide-react";
import { UserAvatar, BadgeIcon } from "@/components/ui/user-avatar";
import { PageTransition } from "@/components/PageTransition";
import { calculateLevel } from "@/lib/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function BookClubChatPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const { user, profile } = useAuth();
  const { isAdmin: isSystemAdmin } = useAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [club, setClub] = useState<BookClub | null>(null);
  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isMember, setIsMember] = useState(false);

  // Club Info / Management Modal
  const [showClubInfo, setShowClubInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "edit" | "settings">("members");
  const [members, setMembers] = useState<DetailedClubMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [myClubRole, setMyClubRole] = useState<"admin" | "member" | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Edit Club form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBookId, setEditBookId] = useState<string>("");
  const [booksList, setBooksList] = useState<Book[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Profile Modal State
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "leave" | "delete" | "kick" | "promote" | "demote" | "transfer";
    title: string;
    message: string;
    targetUserId?: string;
    targetName?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isClubCreator = !!(club && user && club.createdBy === user.uid);
  const isClubAdmin = myClubRole === "admin" || isClubCreator || isSystemAdmin;

  const loadClubInfo = useCallback(async () => {
    if (!clubId) return;
    try {
      const clubs = await getBookClubs();
      const found = clubs.find(c => c.id === clubId);
      setClub(found || null);
      if (found) {
        setEditName(found.name);
        setEditDescription(found.description || "");
        setEditBookId(found.bookId || "");
      }
    } catch (err) {
      console.error(err);
    }
  }, [clubId]);

  const loadMembers = useCallback(async () => {
    if (!clubId) return;
    setLoadingMembers(true);
    try {
      const details = await getClubMemberDetails(clubId);
      setMembers(details);
      if (user) {
        const userInList = details.find(m => m.userId === user.uid);
        if (userInList) {
          setMyClubRole(userInList.role);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  }, [clubId, user]);

  useEffect(() => {
    if (clubId) {
      loadClubInfo();

      if (user) {
        isUserClubMember(clubId, user.uid).then(setIsMember);
        getClubMemberRole(clubId, user.uid).then(setMyClubRole);
      }

      const unsub = onClubMessagesChanged(clubId, (msgs) => {
        setMessages(msgs);
        setLoading(false);
      });

      getBooks().then(setBooksList).catch(console.error);

      return () => unsub();
    }
  }, [clubId, user, loadClubInfo]);

  useEffect(() => {
    if (showClubInfo) {
      loadMembers();
    }
  }, [showClubInfo, loadMembers]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile || !clubId || !newMessage.trim()) return;
    setSending(true);
    try {
      await sendClubMessage(clubId, user.uid, profile.nama, profile.photoURL, newMessage.trim());
      setNewMessage("");
    } catch (err) { console.error(err); } finally { setSending(false); }
  }

  async function handleUserClick(userId: string) {
    try {
      const userProfile = await getUserProfile(userId);
      if (userProfile) {
        setSelectedUser(userProfile);
        setShowUserProfile(true);
      }
    } catch (err) { console.error(err); }
  }

  async function handleSaveClubEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId || !editName.trim()) return;
    setSavingEdit(true);
    try {
      const selectedBook = booksList.find(b => b.id === editBookId);
      await updateBookClub(clubId, {
        name: editName.trim(),
        description: editDescription.trim(),
        bookId: editBookId || null,
        bookTitle: selectedBook ? selectedBook.judul : null,
      });
      await loadClubInfo();
      toast("success", "Informasi club berhasil diperbarui!");
      setActiveTab("members");
    } catch (err: any) {
      toast("error", "Gagal memperbarui info club: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  function handleLeaveClubAttempt() {
    if (!user || !club) return;

    // If sole member left in the club
    if (members.length <= 1) {
      setConfirmDialog({
        type: "leave",
        title: "Keluar dari Book Club?",
        message: `Anda adalah anggota terakhir di "${club.name}". Jika Anda keluar, klub ini akan otomatis dihapus.`
      });
      return;
    }

    // If there are other members
    if (isClubCreator) {
      toast("info", "Anda adalah Pembuat Klub ini. Mohon serahkan jatah Pembuat Klub kepada anggota lain terlebih dahulu sebelum Anda keluar!");
      return;
    }

    const adminCount = members.filter(m => m.role === "admin" || m.isCreator).length;
    if (myClubRole === "admin" && adminCount <= 1) {
      toast("info", "Anda adalah satu-satunya Admin klub ini. Mohon angkat anggota lain menjadi Admin terlebih dahulu sebelum Anda keluar!");
      return;
    }

    setConfirmDialog({
      type: "leave",
      title: "Keluar dari Book Club?",
      message: `Apakah Anda yakin ingin keluar dari "${club.name}"?`
    });
  }

  async function handleConfirmAction() {
    if (!confirmDialog || !clubId || !user) return;
    const { type, targetUserId, targetName } = confirmDialog;
    try {
      if (type === "leave") {
        await leaveBookClub(clubId, user.uid);
        toast("info", "Anda telah keluar dari club ini.");
        setShowClubInfo(false);
        navigate("/clubs");
      } else if (type === "delete") {
        await deleteBookClub(clubId);
        toast("success", "Book Club berhasil dihapus.");
        setShowClubInfo(false);
        navigate("/clubs");
      } else if (type === "kick" && targetUserId) {
        await leaveBookClub(clubId, targetUserId);
        toast("success", `${targetName || "Anggota"} telah dikeluarkan dari club.`);
        await loadMembers();
        await loadClubInfo();
      } else if ((type === "promote" || type === "demote") && targetUserId) {
        const newRole = type === "promote" ? "admin" : "member";
        await updateClubMemberRole(clubId, targetUserId, newRole);
        toast("success", `Role ${targetName || "Anggota"} diubah menjadi ${newRole === "admin" ? "Admin" : "Anggota"}.`);
        await loadMembers();
      } else if (type === "transfer" && targetUserId) {
        await transferClubOwnership(clubId, targetUserId);
        toast("success", `Hak Pembuat Club berhasil diserahkan kepada ${targetName}.`);
        await loadClubInfo();
        await loadMembers();
      }
    } catch (err: any) {
      toast("error", "Gagal memproses aksi: " + err.message);
    } finally {
      setConfirmDialog(null);
    }
  }

  const filteredMembers = members.filter((m) =>
    m.nama.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    m.username?.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <PageTransition>
        <div className="tile">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <Users size={48} className="mx-auto mb-4 text-[#a67c52]" />
            <h1 className="text-2xl font-bold mb-2 font-serif text-[#4a3f35]">Book Club Chat</h1>
            <p className="text-sm mb-6 text-[#7d6b56]">Masuk untuk bergabung dalam diskusi klub literasi.</p>
            <Link to="/login" className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-full text-sm font-medium bg-[#a67c52] hover:bg-[#8d6e4c]">
              <LogIn size={16} /> Masuk
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-[#dbd0ba] bg-[#fffcf5]">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link to="/clubs" className="w-9 h-9 rounded-full bg-[#ece5d8] hover:bg-[#dbd0ba] text-[#4a3f35] flex items-center justify-center transition-all hover:scale-[1.05] flex-shrink-0">
              <ArrowLeft size={16} />
            </Link>

            <button
              onClick={() => setShowClubInfo(true)}
              className="flex items-center gap-3 min-w-0 flex-1 text-left transition-all hover:opacity-85 group"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#a67c52] text-white flex items-center justify-center font-bold flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Users size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-[#4a3f35] truncate">{club?.name || "Book Club"}</p>
                  {isClubCreator && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded-md flex items-center gap-0.5">
                      <Crown size={10} /> Pembuat
                    </span>
                  )}
                  {!isClubCreator && myClubRole === "admin" && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 font-bold rounded-md flex items-center gap-0.5">
                      <Shield size={10} /> Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#7d6b56]">
                  {club?.memberCount || 0} anggota • Klik untuk info & daftar anggota ℹ️
                </p>
              </div>
            </button>

            <button
              onClick={() => setShowClubInfo(true)}
              className="w-9 h-9 rounded-full bg-[#ece5d8] hover:bg-[#dbd0ba] text-[#4a3f35] flex items-center justify-center transition-all hover:scale-[1.05]"
              title="Info & Pengaturan Club"
            >
              <Info size={16} />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto bg-[#ece5d8]">
          <div className="max-w-4xl mx-auto px-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-[#a67c52]" size={20} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users size={40} className="text-[#a67c52]/40 mb-3" />
                <p className="text-sm font-bold text-[#4a3f35]">Belum ada pesan di club ini.</p>
                <p className="text-xs text-[#7d6b56] mt-1">Mulai diskusi hangat dengan mengirim pesan pertama!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isMine = msg.userId === user?.uid;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`flex items-end gap-2 max-w-[80%] ${isMine ? "flex-row-reverse" : ""}`}>
                        {!isMine && (
                          <button onClick={() => handleUserClick(msg.userId)} className="transition-transform hover:scale-110 flex-shrink-0">
                            <UserAvatar src={msg.userPhoto} name={msg.userName} size="sm" />
                          </button>
                        )}
                        <div>
                          {!isMine && (
                            <button onClick={() => handleUserClick(msg.userId)} className="text-[10px] font-bold text-[#7d6b56] mb-1 ml-1 hover:underline text-left block">
                              {msg.userName}
                            </button>
                          )}
                          <div
                            className="px-4 py-2.5 rounded-2xl text-sm shadow-2xs"
                            style={{
                              background: isMine ? "#a67c52" : "#fffcf5",
                              color: isMine ? "#ffffff" : "#4a3f35",
                              border: isMine ? "none" : "1px solid #dbd0ba",
                              borderBottomRightRadius: isMine ? "4px" : "16px",
                              borderBottomLeftRadius: isMine ? "16px" : "4px",
                            }}
                          >
                            <p className="break-words font-medium text-xs sm:text-sm leading-relaxed">{msg.text}</p>
                            <p className={`text-[10px] mt-1 text-right ${isMine ? "opacity-75" : "text-[#7d6b56]"}`}>
                              {new Date(msg.createdAt || 0).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex-shrink-0 border-t border-[#dbd0ba] bg-[#fffcf5]">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto px-4 py-3 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-[#ece5d8] border border-[#dbd0ba] rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#4a3f35] placeholder:text-[#7d6b56]/60 focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30 transition-all"
              placeholder="Ketik pesan diskusi..."
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="w-11 h-11 rounded-full bg-[#a67c52] hover:bg-[#8d6e4c] text-white flex items-center justify-center transition-all disabled:opacity-50 flex-shrink-0 shadow-2xs active:scale-95"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>

        {/* ── RICH CLUB INFO & MEMBERS DASHBOARD MODAL ── */}
        <AnimatePresence>
          {showClubInfo && club && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
              onClick={() => setShowClubInfo(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#fffcf5] border border-[#dbd0ba] rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#dbd0ba] pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#a67c52] text-white flex items-center justify-center font-bold text-lg shadow-2xs">
                      <Users size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold font-serif text-[#4a3f35] flex items-center gap-2">
                        {club.name}
                      </h3>
                      <p className="text-xs text-[#7d6b56]">{club.memberCount || 0} Anggota Terdaftar</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowClubInfo(false)}
                    className="w-8 h-8 rounded-full bg-[#ece5d8] hover:bg-[#dbd0ba] text-[#4a3f35] flex items-center justify-center transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-[#ece5d8] border border-[#dbd0ba] rounded-xl mb-4">
                  <button
                    onClick={() => setActiveTab("members")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${activeTab === "members" ? "bg-[#fffcf5] text-[#4a3f35] border border-[#dbd0ba] shadow-2xs" : "text-[#7d6b56] hover:text-[#4a3f35]"
                      }`}
                  >
                    <Users size={14} />
                    <span>Daftar Anggota ({members.length})</span>
                  </button>

                  {isClubAdmin && (
                    <button
                      onClick={() => setActiveTab("edit")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${activeTab === "edit" ? "bg-[#fffcf5] text-[#4a3f35] border border-[#dbd0ba] shadow-2xs" : "text-[#7d6b56] hover:text-[#4a3f35]"
                        }`}
                    >
                      <Edit3 size={14} />
                      <span>Edit Info Club</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab("settings")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${activeTab === "settings" ? "bg-[#fffcf5] text-[#4a3f35] border border-[#dbd0ba] shadow-2xs" : "text-[#7d6b56] hover:text-[#4a3f35]"
                      }`}
                  >
                    <Settings size={14} />
                    <span>Opsi</span>
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                  {/* TAB 1: MEMBERS LIST */}
                  {activeTab === "members" && (
                    <div className="space-y-4">
                      {/* Description & Linked Book summary */}
                      <div className="bg-[#ece5d8]/60 border border-[#dbd0ba] rounded-2xl p-4 space-y-2">
                        {club.description && (
                          <p className="text-xs text-[#4a3f35] leading-relaxed italic">
                            "{club.description}"
                          </p>
                        )}
                        {club.bookTitle && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-[#a67c52]">
                            <BookOpen size={14} />
                            <span>Topik Bahasan: <strong>{club.bookTitle}</strong></span>
                          </div>
                        )}
                        {club.createdAt && (
                          <p className="text-[10px] text-[#7d6b56]">
                            Dibuat sejak {new Date(club.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        )}
                      </div>

                      {/* Search Members Bar */}
                      <div className="relative">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7d6b56]" />
                        <input
                          type="text"
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          placeholder="Cari nama anggota..."
                          className="w-full pl-9 pr-4 py-2 bg-[#fffcf5] border border-[#dbd0ba] rounded-xl text-xs font-semibold text-[#4a3f35] placeholder:text-[#7d6b56]/60 focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30"
                        />
                      </div>

                      {/* Members List */}
                      {loadingMembers ? (
                        <div className="py-10 text-center text-[#a67c52]">
                          <Loader2 className="animate-spin mx-auto" size={20} />
                          <p className="text-xs mt-2 font-medium">Memuat anggota club...</p>
                        </div>
                      ) : filteredMembers.length === 0 ? (
                        <div className="py-8 text-center text-xs text-[#7d6b56]">
                          Tidak ada anggota yang cocok dengan pencarian.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredMembers.map((m) => {
                            const levelInfo = m.totalPoints ? calculateLevel(m.totalPoints) : null;
                            const isMe = m.userId === user.uid;

                            return (
                              <div
                                key={m.userId}
                                className="bg-[#fffcf5] border border-[#dbd0ba] rounded-xl p-3 flex items-center justify-between gap-3 hover:border-[#a67c52]/40 transition-colors"
                              >
                                <div
                                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                                  onClick={() => handleUserClick(m.userId)}
                                >
                                  <UserAvatar
                                    src={m.photoURL}
                                    name={m.nama}
                                    size="md"
                                    showBadge={!!m.displayBadge}
                                    badge={m.displayBadge}
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="text-xs font-bold text-[#4a3f35] truncate">{m.nama}</p>
                                      {isMe && (
                                        <span className="text-[9px] px-1.5 py-0.2 bg-[#a67c52]/10 text-[#8c5e34] border border-[#a67c52]/30 font-bold rounded-full">
                                          Anda
                                        </span>
                                      )}
                                      {m.isCreator ? (
                                        <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded-md flex items-center gap-0.5">
                                          <Crown size={10} /> Pembuat
                                        </span>
                                      ) : m.role === "admin" ? (
                                        <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 text-blue-800 font-bold rounded-md flex items-center gap-0.5">
                                          <Shield size={10} /> Admin
                                        </span>
                                      ) : null}
                                    </div>

                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#7d6b56]">
                                      <span>@{m.username}</span>
                                      {levelInfo && <span>• Lv.{levelInfo.level}</span>}
                                    </div>
                                  </div>
                                </div>

                                {/* Actions for Member */}
                                <div className="flex items-center gap-1">
                                  {!isMe && (
                                    <button
                                      onClick={() => navigate(`/chat/${m.userId}`)}
                                      className="p-1.5 bg-[#ece5d8] hover:bg-[#dbd0ba] text-[#4a3f35] rounded-lg text-xs font-bold transition-colors"
                                      title="Kirim Pesan Pribadi"
                                    >
                                      <MessageCircle size={14} />
                                    </button>
                                  )}

                                  {/* Management buttons for Club Admin */}
                                  {isClubAdmin && !m.isCreator && !isMe && (
                                    <>
                                      {/* Transfer Ownership (Only for Creator) */}
                                      {isClubCreator && (
                                        <button
                                          onClick={() => setConfirmDialog({
                                            type: "transfer",
                                            title: "Serahkan Hak Pembuat Club?",
                                            message: `Apakah Anda yakin ingin menyerahkan jatah Pembuat Club kepada ${m.nama}?`,
                                            targetUserId: m.userId,
                                            targetName: m.nama,
                                          })}
                                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-colors"
                                          title="Serahkan Pembuat Club"
                                        >
                                          <Crown size={14} />
                                        </button>
                                      )}

                                      {/* Promote / Demote Role */}
                                      <button
                                        onClick={() => setConfirmDialog({
                                          type: m.role === "admin" ? "demote" : "promote",
                                          title: m.role === "admin" ? "Jadikan Anggota Biasa?" : "Jadikan Admin Club?",
                                          message: m.role === "admin"
                                            ? `Apakah Anda yakin ingin melepaskan hak Admin dari ${m.nama}?`
                                            : `Apakah Anda yakin ingin mengangkat ${m.nama} sebagai Admin Club?`,
                                          targetUserId: m.userId,
                                          targetName: m.nama,
                                        })}
                                        className="p-1.5 bg-[#ece5d8] hover:bg-[#dbd0ba] text-[#a67c52] rounded-lg text-xs font-bold transition-colors"
                                        title={m.role === "admin" ? "Jadikan Member Biasa" : "Jadikan Admin Club"}
                                      >
                                        <Shield size={14} />
                                      </button>

                                      {/* Kick Member */}
                                      <button
                                        onClick={() => setConfirmDialog({
                                          type: "kick",
                                          title: "Keluarkan Anggota?",
                                          message: `Apakah Anda yakin ingin mengeluarkan ${m.nama} dari club ini?`,
                                          targetUserId: m.userId,
                                          targetName: m.nama,
                                        })}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors"
                                        title="Keluarkan dari Club"
                                      >
                                        <UserMinus size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: EDIT CLUB (CRUD for Club Creator / Admin) */}
                  {activeTab === "edit" && isClubAdmin && (
                    <form onSubmit={handleSaveClubEdit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#4a3f35] mb-1">Nama Book Club</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 bg-[#fffcf5] border border-[#dbd0ba] rounded-xl text-xs font-semibold text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30"
                          placeholder="Masukkan nama club..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#4a3f35] mb-1">Deskripsi / Aturan Club</label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={3}
                          className="w-full px-3.5 py-2.5 bg-[#fffcf5] border border-[#dbd0ba] rounded-xl text-xs font-medium text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30"
                          placeholder="Jelaskan fokus pembahasan club..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#4a3f35] mb-1">Buku yang Sedang Dibahas (Opsional)</label>
                        <select
                          value={editBookId}
                          onChange={(e) => setEditBookId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-[#fffcf5] border border-[#dbd0ba] rounded-xl text-xs font-medium text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30"
                        >
                          <option value="">-- Tidak ada buku spesifik --</option>
                          {booksList.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.judul} ({b.penulis})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={savingEdit || !editName.trim()}
                        className="w-full py-2.5 bg-[#a67c52] hover:bg-[#8d6e4c] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-2xs"
                      >
                        {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Simpan Perubahan Club
                      </button>
                    </form>
                  )}

                  {/* TAB 3: SETTINGS & DANGER ZONE */}
                  {activeTab === "settings" && (
                    <div className="space-y-4">
                      {/* Leave Club */}
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <LogOut size={16} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xs font-bold text-amber-900">Keluar dari Club</h4>
                            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                              Anda akan berhenti menerima pesan diskusi dan nama Anda akan dihapus dari daftar anggota club ini.
                            </p>
                            <button
                              onClick={handleLeaveClubAttempt}
                              className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                            >
                              <LogOut size={13} />
                              Keluar dari Club
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Delete Club (For Creator or System Admin) */}
                      {(isClubCreator || isSystemAdmin) && (
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Trash2 size={16} />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-xs font-bold text-rose-900">Hapus Club Permanen</h4>
                              <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                                Seluruh riwayat pesan, daftar anggota, dan ruang obrolan club ini akan dihapus secara permanen dari database.
                              </p>
                              <button
                                onClick={() => setConfirmDialog({
                                  type: "delete",
                                  title: "Hapus Book Club Permanen?",
                                  message: `Tindakan ini tidak dapat dibatalkan. Seluruh data "${club.name}" akan dihapus permanen.`
                                })}
                                className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                              >
                                <Trash2 size={13} />
                                Hapus Club Permanen
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── USER PROFILE MODAL ── */}
        <AnimatePresence>
          {showUserProfile && selectedUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
              onClick={() => setShowUserProfile(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#fffcf5] border border-[#dbd0ba] rounded-3xl max-w-sm w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-sm font-bold font-serif text-[#4a3f35]">Profil Anggota</h3>
                  <button onClick={() => setShowUserProfile(false)} className="w-8 h-8 rounded-full bg-[#ece5d8] hover:bg-[#dbd0ba] text-[#4a3f35] flex items-center justify-center">
                    <X size={16} />
                  </button>
                </div>

                <div className="text-center mb-5">
                  <div className="mb-3 flex justify-center">
                    <UserAvatar src={selectedUser.photoURL} name={selectedUser.nama} size="xl" showBadge={!!selectedUser.displayBadge} badge={selectedUser.displayBadge} />
                  </div>
                  <h4 className="text-base font-bold text-[#4a3f35]">{selectedUser.nama}</h4>
                  <p className="text-xs text-[#7d6b56]">@{selectedUser.username}</p>
                  {selectedUser.displayBadge && (
                    <div className="mt-2 flex items-center justify-center gap-1">
                      <BadgeIcon badge={selectedUser.displayBadge} size="sm" showLabel />
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  {selectedUser.totalPoints != null && (() => {
                    const levelInfo = calculateLevel(selectedUser.totalPoints);
                    return (
                      <div className="flex items-center gap-3 p-3 bg-[#ece5d8]/60 border border-[#dbd0ba] rounded-xl text-xs">
                        <Award size={16} className="text-[#a67c52]" />
                        <div className="flex-1">
                          <p className="font-bold text-[#4a3f35]">Level {levelInfo.level} • {levelInfo.title}</p>
                          <p className="text-[10px] text-[#7d6b56]">{selectedUser.totalPoints} XP Poin</p>
                        </div>
                      </div>
                    );
                  })()}
                  {selectedUser.alamat && (
                    <div className="flex items-center gap-3 p-3 bg-[#ece5d8]/60 border border-[#dbd0ba] rounded-xl text-xs">
                      <MapPin size={16} className="text-[#a67c52]" />
                      <p className="text-[#4a3f35] font-medium">{selectedUser.alamat}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation Dialog */}
        <ConfirmDialog
          open={!!confirmDialog}
          title={confirmDialog?.title || ""}
          message={confirmDialog?.message || ""}
          confirmText="Lanjutkan"
          cancelText="Batal"
          variant={confirmDialog?.type === "delete" || confirmDialog?.type === "kick" ? "danger" : "warning"}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmDialog(null)}
        />
      </div>
    </PageTransition>
  );
}
