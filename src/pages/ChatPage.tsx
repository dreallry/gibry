import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  sendMessage, markMessagesAsRead, getUserProfile, onMessagesChanged, 
  setTypingStatus, onTypingChanged, onUserStatusChanged, addNotification, 
  removeFriend, getBooks, softDeleteMessage, blockUser, unblockUser, isUserBlocked,
  type Message, type UserProfile, type Book 
} from "@/lib/firestore";
import { 
  ArrowLeft, Send, Loader2, X, BookOpen, UserMinus, Eye, Trash2, UserX
} from "lucide-react";
import { ReportButton } from "@/components/ReportButton";
import { checkContent } from "@/lib/wordFilter";
import { checkRateLimit, recordRateLimitAction } from "@/lib/rateLimiter";
import { connectionManager } from "@/lib/connectionManager";
import { PageTransition } from "@/components/PageTransition";
import { UserAvatar, BadgeIcon } from "@/components/ui/user-avatar";
import { calculateLevel } from "@/lib/firestore";
import { UserProfileModal } from "@/components/UserProfileModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/Toast";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [friendProfile, setFriendProfile] = useState<UserProfile | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [friendOnline, setFriendOnline] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockingLoading, setBlockingLoading] = useState(false);
  
  // Modals & Gimmicks State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showConfirmUnfriend, setShowConfirmUnfriend] = useState(false);
  const [unfriending, setUnfriending] = useState(false);
  const [booksList, setBooksList] = useState<Book[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load friend profile
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadProfile() {
      try {
        const uProfile = await getUserProfile(userId!);
        if (!cancelled && uProfile) {
          setFriendProfile(uProfile);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadProfile();
    return () => { cancelled = true; };
  }, [userId]);

  // Check blocked status
  useEffect(() => {
    if (!user || !userId) return;
    isUserBlocked(user.uid, userId).then(setIsBlocked).catch(() => {});
  }, [user, userId]);

  // Load books for Book Recommendation Gimmick
  useEffect(() => {
    async function loadBooks() {
      try {
        const books = await getBooks();
        setBooksList(books.slice(0, 8));
      } catch (err) { console.error(err); }
    }
    loadBooks();
  }, []);

  // Setup realtime listeners with connectionManager (detaches on tab hidden)
  useEffect(() => {
    if (!user || !userId) return;

    markMessagesAsRead(userId, user.uid).catch(console.error);

    const cleanup = connectionManager.register(`chat_${user.uid}_${userId}`, () => {
      const unsubMessages = onMessagesChanged(user.uid, userId, (msgs) => {
        setMessages(msgs);
        setLoading(false);
      });
      const unsubTyping = onTypingChanged(user.uid, userId, setIsTyping);
      const unsubOnline = onUserStatusChanged(userId, setFriendOnline);

      return () => {
        unsubMessages();
        unsubTyping();
        unsubOnline();
      };
    });

    return () => {
      cleanup();
    };
  }, [user, userId]);

  // Auto scroll to bottom
  useEffect(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [messages]);

  const handleTyping = useCallback(() => {
    if (!user || !userId || isBlocked) return;
    setTypingStatus(user.uid, userId, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(user.uid!, userId, false);
    }, 3000);
  }, [user, userId, isBlocked]);

  async function handleSend(textToSend?: string) {
    const text = (textToSend || newMessage).trim();
    if (!user || !profile || !userId || !text) return;

    if (isBlocked) {
      toast("error", "Tidak dapat mengirim pesan ke pengguna yang diblokir");
      return;
    }

    // Rate limiting: max 20 messages per minute
    const rl = checkRateLimit(`chat_${user.uid}`, 20, 60000);
    if (!rl.allowed) {
      toast("error", `Terlalu cepat mengirim pesan. Tunggu ${rl.waitSeconds} detik.`);
      return;
    }

    // Word filter
    const contentCheck = checkContent(text);
    if (!contentCheck.clean) {
      toast("error", "Pesan mengandung kata yang tidak pantas.");
      return;
    }

    recordRateLimitAction(`chat_${user.uid}`, 60000);
    setSending(true);
    try {
      await sendMessage(user.uid, profile.nama, userId, text);

      await addNotification(userId, {
        type: "message",
        fromUserId: user.uid,
        title: `Pesan dari ${profile.nama}`,
        body: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
        link: `/chat/${user.uid}`,
      });

      setTypingStatus(user.uid, userId, false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (!textToSend) setNewMessage("");
    } catch (err: any) {
      toast("error", err?.message || "Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  }

  async function handleToggleBlock() {
    if (!user || !userId) return;
    setBlockingLoading(true);
    try {
      if (isBlocked) {
        await unblockUser(user.uid, userId);
        setIsBlocked(false);
        toast("info", "Pengguna tidak lagi diblokir");
      } else {
        await blockUser(user.uid, userId);
        setIsBlocked(true);
        toast("warning", "Pengguna berhasil diblokir");
      }
    } catch {
      toast("error", "Gagal memperbarui status blokir");
    } finally {
      setBlockingLoading(false);
    }
  }

  async function handleDeleteMessage(msgId: string) {
    if (!user || !userId) return;
    try {
      await softDeleteMessage(user.uid, userId, msgId, user.uid);
      toast("info", "Pesan telah dihapus");
    } catch {
      toast("error", "Gagal menghapus pesan");
    }
  }

  async function handleUnfriend() {
    if (!user || !userId) return;
    setUnfriending(true);
    try {
      await removeFriend(user.uid, userId);
      toast("success", `${friendName} telah dihapus dari daftar teman.`);
      setShowConfirmUnfriend(false);
      navigate("/social");
    } catch (err: any) {
      toast("error", "Gagal menghapus pertemanan");
    } finally {
      setUnfriending(false);
    }
  }

  function handleShareBook(book: Book) {
    const recommendationText = `Rekomendasi Buku: "${book.judul}" oleh ${book.penulis}. Penasaran banget dengan ceritanya, yuk baca bareng!`;
    handleSend(recommendationText);
    setShowBookPicker(false);
    toast("success", `Membagikan rekomendasi "${book.judul}"`);
  }

  const isMyMessage = (msg: Message) => msg.senderId === user?.uid;

  const friendName = friendProfile?.nama || (() => {
    const lastMsg = [...messages].reverse().find(m => m.senderId === userId);
    return lastMsg?.senderName || "Pengguna";
  })();
  const friendPhoto = friendProfile?.photoURL || null;
  const levelInfo = friendProfile?.totalPoints ? calculateLevel(friendProfile.totalPoints) : null;

  return (
    <PageTransition>
      <div className="flex flex-col bg-[#f7f3ea] h-screen">
        
        {/* ── HEADER CHAT ── */}
        <div className="flex-shrink-0 border-b border-[#dbd0ba] bg-[#fffcf5] z-20">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            
            {/* Back Button & User Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Link 
                to="/social" 
                className="w-9 h-9 rounded-full bg-[#ece5d8] hover:bg-[#dbd0ba] text-[#4a3f35] flex items-center justify-center transition-colors flex-shrink-0"
              >
                <ArrowLeft size={16} />
              </Link>

              {/* Clickable Friend Profile Badge */}
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-3 min-w-0 text-left hover:opacity-80 transition-opacity group"
              >
                <div className="relative flex-shrink-0">
                  <UserAvatar 
                    src={friendPhoto || undefined} 
                    name={friendName} 
                    size="md" 
                    showBadge={!!friendProfile?.displayBadge} 
                    badge={friendProfile?.displayBadge} 
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#fffcf5] ${
                      friendOnline ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-black text-[#4a3f35] truncate group-hover:text-[#a67c52] transition-colors">{friendName}</p>
                    {levelInfo && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#a67c52] text-white font-bold rounded-full">
                        Lv.{levelInfo.level}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${friendOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
                    <p className="text-xs font-semibold text-[#7d6b56]">
                      {isTyping ? "Mengetik..." : friendOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Top Right Action Icons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Block Button */}
              <button
                onClick={handleToggleBlock}
                disabled={blockingLoading}
                className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                  isBlocked
                    ? "bg-rose-100 text-rose-800"
                    : "bg-[#ece5d8] hover:bg-[#dbd0ba] text-[#4a3f35]"
                }`}
                title={isBlocked ? "Buka Blokir Pengguna" : "Blokir Pengguna"}
              >
                <UserX size={16} className={isBlocked ? "text-rose-700" : ""} />
              </button>

              {/* Detail Profile Modal */}
              <button
                onClick={() => setShowProfileModal(true)}
                className="p-2 bg-[#ece5d8] hover:bg-[#dbd0ba] text-[#4a3f35] rounded-xl text-xs font-bold transition-colors"
                title="Lihat Detail Profil"
              >
                <Eye size={16} />
              </button>

              {/* Unfriend Button */}
              <button
                onClick={() => setShowConfirmUnfriend(true)}
                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors border border-rose-200"
                title="Hapus Pertemanan"
              >
                <UserMinus size={16} />
              </button>
            </div>

          </div>
        </div>

        {/* ── MESSAGES CANAL ── */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#f7f3ea] relative">
          <div className="max-w-3xl mx-auto space-y-3 relative z-10">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-[#a67c52]">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : messages.length === 0 ? (
              <div className="bg-[#fffcf5] border border-[#dbd0ba] rounded-3xl p-8 text-center max-w-sm mx-auto my-12 shadow-xs">
                <BookOpen size={36} className="mx-auto text-[#a67c52] mb-3 opacity-60" />
                <h3 className="text-base font-black text-[#4a3f35] uppercase">Mulai Percakapan</h3>
                <p className="text-xs text-[#7d6b56] mt-1 leading-relaxed">
                  Sapa {friendName} atau bagikan rekomendasi buku favorit Anda di sini.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const mine = isMyMessage(msg);
                const isBookRec = !msg.deleted && msg.text.startsWith("Rekomendasi Buku:");

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative group max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs ${
                        mine
                          ? "bg-[#4a3f35] text-[#fffcf5] rounded-br-xs"
                          : "bg-[#fffcf5] text-[#4a3f35] border border-[#dbd0ba] rounded-bl-xs"
                      }`}
                    >
                      {msg.deleted ? (
                        <p className="italic text-stone-400 font-medium">
                          Pesan ini telah dihapus
                        </p>
                      ) : isBookRec ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-amber-600 font-black uppercase text-[10px]">
                            <BookOpen size={13} />
                            <span>Rekomendasi Buku</span>
                          </div>
                          <p className="font-semibold leading-relaxed break-words">
                            {msg.text.replace("Rekomendasi Buku:", "")}
                          </p>
                        </div>
                      ) : (
                        <p className="break-words font-medium leading-relaxed">{msg.text}</p>
                      )}

                      <div className="flex items-center justify-between gap-2 mt-1.5 pt-0.5">
                        <div className="flex items-center gap-1">
                          {/* Soft delete own message */}
                          {mine && !msg.deleted && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-300 hover:text-rose-300 p-0.5 rounded"
                              title="Hapus pesan"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                          {/* Report friend's message */}
                          {!mine && !msg.deleted && (
                            <ReportButton
                              targetType="message"
                              targetId={msg.id}
                              targetUserId={userId!}
                              targetUserName={friendName}
                              contentSnapshot={msg.text}
                              iconSize={12}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          )}
                        </div>

                        <p className={`text-[9px] font-semibold opacity-75 ${mine ? "text-amber-200" : "text-[#7d6b56]"}`}>
                          {new Date(msg.createdAt || 0).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}

            {/* Typing Indicator Bubble */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[#fffcf5] border border-[#dbd0ba] p-3 rounded-2xl rounded-bl-xs text-xs">
                  <div className="flex items-center gap-1 text-[#7d6b56]">
                    <span className="w-1.5 h-1.5 bg-[#a67c52] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#a67c52] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#a67c52] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── BOOK RECOMMENDATION PICKER POPOVER ── */}
        <AnimatePresence>
          {showBookPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="max-w-4xl mx-auto px-4 pb-2 w-full z-30"
            >
              <div className="bg-[#fffcf5] border border-[#dbd0ba] rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#4a3f35] uppercase">
                    <BookOpen size={15} className="text-[#a67c52]" />
                    <span>Bagikan Rekomendasi Buku</span>
                  </div>
                  <button onClick={() => setShowBookPicker(false)} className="p-1 text-[#7d6b56] hover:text-[#4a3f35]">
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {booksList.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleShareBook(b)}
                      className="p-2.5 bg-[#fbf8f0] hover:bg-[#ece5d8] border border-[#dbd0ba] rounded-xl text-left transition-colors"
                    >
                      <p className="text-xs font-bold text-[#4a3f35] line-clamp-1">{b.judul}</p>
                      <p className="text-[10px] text-[#7d6b56] truncate">{b.penulis}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CHAT INPUT COMPOSER ── */}
        <div className="flex-shrink-0 border-t border-[#dbd0ba] bg-[#fffcf5] p-3 z-20">
          {isBlocked ? (
            <div className="max-w-4xl mx-auto py-2 px-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-center font-semibold">
              Pengguna ini sedang diblokir. Buka blokir untuk melanjutkan percakapan.
            </div>
          ) : (
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
              className="max-w-4xl mx-auto flex items-center gap-2"
            >
              {/* Book Recommendation Button Gimmick */}
              <button
                type="button"
                onClick={() => setShowBookPicker(!showBookPicker)}
                className={`p-2.5 rounded-2xl border transition-colors flex-shrink-0 ${
                  showBookPicker 
                    ? "bg-[#a67c52] text-white border-[#8d6e4c]" 
                    : "bg-[#ece5d8] text-[#4a3f35] border-[#dbd0ba] hover:bg-[#dbd0ba]"
                }`}
                title="Bagikan Rekomendasi Buku"
              >
                <BookOpen size={18} />
              </button>

              {/* Main Text Input */}
              <input
                type="text"
                value={newMessage}
                maxLength={500}
                onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                placeholder={`Tulis pesan untuk ${friendName}... (maks 500 karakter)`}
                className="flex-1 px-4 py-2.5 bg-[#f7f3ea] border border-[#dbd0ba] rounded-2xl text-xs font-bold text-[#4a3f35] placeholder:text-[#7d6b56]/60 focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30 transition-all"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="px-5 py-2.5 bg-[#a67c52] hover:bg-[#8d6e4c] text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-40 flex-shrink-0 active:scale-95"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                <span className="hidden sm:inline">Kirim</span>
              </button>
            </form>
          )}
        </div>

        {/* User Profile Modal */}
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          targetUserId={userId || null}
          currentUserId={user?.uid}
          currentUserName={profile?.nama}
          onUnfriendSuccess={() => navigate("/social")}
        />

        {/* Unfriend Dialog */}
        <ConfirmDialog
          open={showConfirmUnfriend}
          onCancel={() => setShowConfirmUnfriend(false)}
          onConfirm={handleUnfriend}
          title="Hapus Pertemanan?"
          message={`Apakah Anda yakin ingin menghapus ${friendName} dari daftar teman Anda?`}
          confirmText="Hapus Teman"
          cancelText="Batal"
          variant="danger"
        />

      </div>
    </PageTransition>
  );
}
