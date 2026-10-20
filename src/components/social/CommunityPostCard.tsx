import { ReportButton } from "@/components/ReportButton";
import {
  X,
  MessageCircle,
  BookOpen,
  Heart,
  Bookmark,
  Send,
  Share2,
  Quote,
  BookMarked,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Trash2,
  Sparkles,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { motion, AnimatePresence } from "framer-motion";
import type { CommunityTimelineProps } from "./CommunityTimeline";
import type { CommunityPost } from "@/lib/types/social";

type Props = Pick<CommunityTimelineProps,
  | "profile"
  | "user"
  | "repliesData"
  | "expandedReplies"
  | "openUserProfile"
  | "formatTimeAgo"
  | "handleToggleLike"
  | "handleToggleSave"
  | "toggleReplies"
  | "handleCopyQuote"
  | "handleDeletePost"
  | "handleDeleteReply"
  | "navigate"
  | "replyInput"
  | "setReplyInput"
  | "replyLinkedBook"
  | "setReplyLinkedBook"
  | "setShowBookPicker"
  | "showBookPicker"
  | "availableBooks"
  | "submittingReply"
  | "handleAddReply"
> & { post: CommunityPost };

export function CommunityPostCard({
  post,
  profile,
  user,
  repliesData,
  expandedReplies,
  openUserProfile,
  formatTimeAgo,
  handleToggleLike,
  handleToggleSave,
  toggleReplies,
  handleCopyQuote,
  handleDeletePost,
  handleDeleteReply,
  navigate,
  replyInput,
  setReplyInput,
  replyLinkedBook,
  setReplyLinkedBook,
  setShowBookPicker,
  showBookPicker,
  availableBooks,
  submittingReply,
  handleAddReply,
}: Props) {

  const isLiked = user && post.likedBy && !!post.likedBy[user.uid];
  const isSaved = user && post.savedBy && !!post.savedBy[user.uid];
  const replies = repliesData[post.id] || [];
  const isExpanded = !!expandedReplies[post.id];

  return (
    <motion.div
      key={post.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#fffcf5] border border-[#dbd0ba] rounded-2xl p-4 sm:p-5 hover:border-[#a67c52]/50 transition-all shadow-2xs space-y-3.5"
    >
      {/* Post Header */}
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => openUserProfile(post.userId)}
        >
          <UserAvatar
            src={post.userPhoto}
            name={post.userName}
            size="md"
            showBadge={!!post.userDisplayBadge}
            badge={post.userDisplayBadge}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#4a3f35] group-hover:text-[#a67c52] transition-colors">
                {post.userName}
              </span>
              {post.userLevel && (
                <span className="text-[9px] px-1.5 py-0.2 bg-[#a67c52] text-white font-bold rounded-full">
                  Lv.{post.userLevel}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#7d6b56]">
              @{post.userUsername || "pembaca"} • {formatTimeAgo(post.createdAt)}
            </p>
          </div>
        </div>

        {/* Post Type Badge */}
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${post.type === "quote"
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
            }`}
        >
          {post.type === "quote" ? "Kutipan Buku" : "Tanya Rekomendasi"}
        </span>
      </div>

      {/* Content Area */}
      {post.type === "quote" ? (
        /* QUOTE CARD DESIGN */
        <div className="space-y-3">
          <div className="relative pl-6 pr-3 py-1 border-l-2 border-[#a67c52]">
            <Quote size={18} className="absolute -left-2.5 -top-1 text-[#a67c52] bg-[#fffcf5] p-0.5 rotate-180" />
            <p className="text-sm sm:text-base font-serif italic text-[#4a3f35] leading-relaxed">
              "{post.content}"
            </p>

            {/* Book Source Attribution */}
            {(post.bookTitle || post.bookAuthor) && (
              <div className="mt-2.5 flex items-center gap-2 text-xs font-medium text-[#7d6b56]">
                <BookOpen size={13} className="text-[#a67c52]" />
                <span className="font-bold text-[#4a3f35]">
                  {post.bookTitle || "Buku"}
                </span>
                {post.bookAuthor && <span>oleh {post.bookAuthor}</span>}
                {post.pageNumber && (
                  <span className="text-[10px] bg-[#ece5d8] px-2 py-0.2 rounded-md font-bold text-[#4a3f35]">
                    Hal. {post.pageNumber}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Student Personal Reflection */}
          {post.reflection && (
            <div className="bg-[#fbf7ee] border border-[#dbd0ba]/70 rounded-xl p-3 text-xs text-[#7d6b56] leading-relaxed flex items-start gap-2">
              <Sparkles size={14} className="text-[#a67c52] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#4a3f35]">Catatan Refleksi: </span>
                {post.reflection}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ASK RECOMMENDATION DESIGN */
        <div className="space-y-2.5">
          <h4 className="text-sm sm:text-base font-bold text-[#4a3f35] leading-snug">
            {post.content}
          </h4>

          {post.topicTags && post.topicTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.topicTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#ece5d8] text-[#7d6b56] border border-[#dbd0ba]/60"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Post Actions Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-[#dbd0ba]/60 text-xs text-[#7d6b56]">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Like Button */}
          <button
            onClick={() => handleToggleLike(post.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${isLiked
                ? "text-rose-600 font-bold bg-rose-50"
                : "hover:text-[#4a3f35] hover:bg-[#ece5d8]"
              }`}
          >
            <Heart size={15} className={isLiked ? "fill-rose-500 text-rose-500" : ""} />
            <span>{post.likesCount || 0}</span>
          </button>

          {/* Save Quote Button (Specifically for Quotes) */}
          {post.type === "quote" && (
            <button
              onClick={() => handleToggleSave(post.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${isSaved
                  ? "text-[#a67c52] font-bold bg-[#ece5d8]"
                  : "hover:text-[#4a3f35] hover:bg-[#ece5d8]"
                }`}
              title={isSaved ? "Tersimpan di koleksimu" : "Simpan kutipan"}
            >
              <Bookmark size={15} className={isSaved ? "fill-[#a67c52] text-[#a67c52]" : ""} />
              <span>{isSaved ? "Tersimpan" : "Simpan"}</span>
            </button>
          )}

          {/* Reply / Discussion Toggle Button */}
          <button
            onClick={() => toggleReplies(post.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:text-[#4a3f35] hover:bg-[#ece5d8] transition-all"
          >
            <MessageCircle size={15} />
            <span>{post.repliesCount || 0} Balasan</span>
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Copy / Share Quote */}
          {post.type === "quote" && (
            <button
              onClick={() => handleCopyQuote(post)}
              className="p-1.5 hover:text-[#4a3f35] hover:bg-[#ece5d8] rounded-lg transition-colors"
              title="Salin kutipan"
            >
              <Share2 size={14} />
            </button>
          )}

          {/* Report Button (if not own post) */}
          {user && user.uid !== post.userId && (
            <ReportButton
              targetType="community_post"
              targetId={post.id}
              targetUserId={post.userId}
              targetUserName={post.userName}
              contentSnapshot={post.content}
              className="p-1.5 text-slate-400 hover:text-amber-700 rounded-lg transition-colors"
            />
          )}

          {/* Delete Post Button (if owner or admin/librarian) */}
          {user && (user.uid === post.userId || profile?.role === "admin" || profile?.role === "librarian") && (
            <button
              onClick={() => handleDeletePost(post.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
              title="Hapus postingan"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── EXPANDABLE REPLIES & DISCUSSION THREAD ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-3 border-t border-[#dbd0ba]/70 space-y-3"
          >
            {/* Replies List */}
            {replies.length > 0 ? (
              <div className="space-y-2.5">
                {replies.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-[#fbf8f0] border border-[#dbd0ba]/70 rounded-xl p-3 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => openUserProfile(rep.userId)}
                      >
                        <UserAvatar src={rep.userPhoto} name={rep.userName} size="sm" />
                        <span className="font-bold text-[#4a3f35]">{rep.userName}</span>
                        {rep.userRole === "librarian" && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                            Pustakawan
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#7d6b56]">
                          {formatTimeAgo(rep.createdAt)}
                        </span>
                        {/* Report Reply */}
                        {user && user.uid !== rep.userId && (
                          <ReportButton
                            targetType="community_reply"
                            targetId={`${post.id}_reply_${rep.id}`}
                            targetUserId={rep.userId}
                            targetUserName={rep.userName}
                            contentSnapshot={rep.text}
                            className="p-0.5 text-slate-400 hover:text-amber-700 rounded"
                          />
                        )}
                        {/* Delete Reply */}
                        {user && (user.uid === rep.userId || profile?.role === "admin" || profile?.role === "librarian") && (
                          <button
                            onClick={() => handleDeleteReply(post.id, rep.id)}
                            className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Hapus balasan"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[#4a3f35] leading-relaxed">{rep.text}</p>

                    {/* Linked Book Card if any */}
                    {rep.linkedBook && (
                      <div
                        onClick={() => navigate(`/book/${rep.linkedBook?.id}`)}
                        className="mt-2 bg-[#fffcf5] border border-[#dbd0ba] rounded-lg p-2 flex items-center justify-between gap-2.5 cursor-pointer hover:border-[#a67c52] transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={rep.linkedBook.cover || "/placeholder-book.png"}
                            alt=""
                            className="w-8 h-11 object-cover rounded border border-[#dbd0ba]"
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-[#4a3f35] truncate">
                              {rep.linkedBook.judul}
                            </p>
                            <p className="text-[9px] text-[#7d6b56] truncate">
                              {rep.linkedBook.penulis}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-[#a67c52] flex items-center gap-1 flex-shrink-0">
                          Lihat Buku <ExternalLink size={10} />
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[11px] text-[#7d6b56] py-2 italic">
                Belum ada balasan. Berikan rekomendasi atau tanggapan pertamamu!
              </p>
            )}

            {/* Reply Input Box */}
            <div className="bg-[#f7f3ea] border border-[#dbd0ba] rounded-xl p-3 space-y-2.5">
              <textarea
                rows={2}
                value={replyInput[post.id] || ""}
                onChange={(e) =>
                  setReplyInput((prev) => ({ ...prev, [post.id]: e.target.value }))
                }
                placeholder={
                  post.type === "ask"
                    ? "Tulis rekomendasi buku atau saran untuk temanmu..."
                    : "Tulis tanggapan atau diskusikan kutipan ini..."
                }
                className="w-full p-2.5 bg-[#fffcf5] border border-[#dbd0ba] rounded-lg text-xs text-[#4a3f35] placeholder:text-[#7d6b56]/70 focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30"
              />

              {/* Selected Linked Book Preview */}
              {replyLinkedBook[post.id] && (
                <div className="bg-[#fffcf5] border border-[#a67c52] rounded-lg p-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <BookMarked size={14} className="text-[#a67c52]" />
                    <span className="font-bold text-[#4a3f35]">
                      Menautkan: {replyLinkedBook[post.id]?.judul}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setReplyLinkedBook((prev) => ({ ...prev, [post.id]: null }))
                    }
                    className="text-rose-600 hover:text-rose-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                {/* Book Linker Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setShowBookPicker((prev) => ({
                        ...prev,
                        [post.id]: !prev[post.id],
                      }))
                    }
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#a67c52] bg-[#fffcf5] border border-[#dbd0ba] hover:bg-[#ece5d8] transition-colors flex items-center gap-1.5"
                  >
                    <BookOpen size={12} />
                    <span>
                      {replyLinkedBook[post.id]
                        ? "Ganti Tautan Buku"
                        : "+ Tautkan Buku Katalog"}
                    </span>
                  </button>

                  {/* Book Picker Popover */}
                  {showBookPicker[post.id] && (
                    <div className="absolute left-0 bottom-full mb-1.5 w-64 max-h-48 overflow-y-auto bg-[#fffcf5] border border-[#dbd0ba] rounded-xl shadow-lg p-2 z-20 space-y-1">
                      <p className="text-[10px] font-bold text-[#7d6b56] px-1 pb-1 border-b border-[#dbd0ba]">
                        Pilih Buku Rekomendasi:
                      </p>
                      {availableBooks.slice(0, 15).map((b) => (
                        <div
                          key={b.id}
                          onClick={() => {
                            setReplyLinkedBook((prev) => ({
                              ...prev,
                              [post.id]: b,
                            }));
                            setShowBookPicker((prev) => ({
                              ...prev,
                              [post.id]: false,
                            }));
                          }}
                          className="p-1.5 hover:bg-[#ece5d8] rounded-lg cursor-pointer flex items-center gap-2 text-left"
                        >
                          <img
                            src={b.coverUrl || b.cover || "/placeholder-book.png"}
                            alt=""
                            className="w-6 h-8 object-cover rounded"
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-[#4a3f35] truncate">
                              {b.judul}
                            </p>
                            <p className="text-[9px] text-[#7d6b56] truncate">
                              {b.penulis}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={submittingReply[post.id]}
                  onClick={() => handleAddReply(post.id)}
                  className="px-4 py-1.5 bg-[#a67c52] hover:bg-[#8d6e4c] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Send size={12} />
                  <span>
                    {submittingReply[post.id] ? "Mengirim..." : "Kirim"}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

}
