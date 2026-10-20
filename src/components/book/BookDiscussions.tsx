import { useState, useEffect, useCallback } from "react";
import { getBookDiscussions, postDiscussion, toggleDiscussionLike, deleteDiscussion, type Discussion } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { MessageCircle, Heart, Send, Trash2, Reply } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { checkContent } from "@/lib/wordFilter";
import { checkRateLimit, recordRateLimitAction } from "@/lib/rateLimiter";
import { ReportButton } from "@/components/ReportButton";

interface Props {
  bookId: string;
}

export function BookDiscussions({ bookId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadDiscussions = useCallback(async () => {
    setLoading(true);
    try {
      setDiscussions(await getBookDiscussions(bookId));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    loadDiscussions();
  }, [bookId, loadDiscussions]);

  async function handleSubmit() {
    if (!user || !newComment.trim()) return;

    // Rate limit: max 5 comments per minute
    const rl = checkRateLimit(`discussion_${user.uid}`, 5, 60000);
    if (!rl.allowed) {
      toast("error", `Terlalu cepat mengirim komentar. Tunggu ${rl.waitSeconds} detik.`);
      return;
    }

    // Word filter
    const contentCheck = checkContent(newComment);
    if (!contentCheck.clean) {
      toast("error", "Komentar mengandung kata yang tidak pantas.");
      return;
    }

    setSubmitting(true);
    try {
      await postDiscussion({
        bookId,
        userId: user.uid,
        text: newComment.trim(),
        parentId: replyTo,
      });
      recordRateLimitAction(`discussion_${user.uid}`, 60000);
      setNewComment("");
      setReplyTo(null);
      await loadDiscussions();
      toast("success", "Komentar berhasil dikirim!");
    } catch (err) {
      toast("error", "Gagal mengirim komentar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(discussionId: string) {
    if (!user) return;
    // Optimistic UI update
    setDiscussions((prev) =>
      prev.map((d) => {
        if (d.id !== discussionId) return d;
        const likedBy = d.likedBy || [];
        const isLiked = likedBy.includes(user.uid);
        const newLikes = isLiked ? Math.max(0, (d.likes || 1) - 1) : (d.likes || 0) + 1;
        const newLikedBy = isLiked ? likedBy.filter((id) => id !== user.uid) : [...likedBy, user.uid];
        return { ...d, likes: newLikes, likedBy: newLikedBy };
      })
    );

    try {
      await toggleDiscussionLike(discussionId, user.uid);
    } catch {
      // Revert on error
      await loadDiscussions();
    }
  }

  async function handleDelete(discussionId: string) {
    if (!user) return;
    // Optimistic delete
    setDiscussions((prev) => prev.filter((d) => d.id !== discussionId));
    try {
      await deleteDiscussion(discussionId, user.uid);
      toast("success", "Komentar dihapus");
    } catch (err: any) {
      toast("error", err?.message || "Gagal menghapus komentar");
      await loadDiscussions();
    }
  }

  function formatTime(timestamp?: number) {
    if (!timestamp) return "";
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "Baru saja";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
    return `${Math.floor(diff / 86400000)} hari lalu`;
  }

  const topLevel = discussions.filter(d => !d.parentId);
  const getReplies = (parentId: string) => discussions.filter(d => d.parentId === parentId);

  return (
    <div className="space-y-4">
      {/* Comment input */}
      {user ? (
        <div className="flex gap-3">
          <UserAvatar src={user.photoURL || undefined} name={user.displayName || "User"} size="sm" />
          <div className="flex-1">
            {replyTo && (
              <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                <Reply size={12} /> Membalas komentar...
                <button onClick={() => setReplyTo(null)} className="underline" style={{ color: "var(--color-primary)" }}>Batal</button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
                placeholder="Tulis diskusi..."
                className="flex-1 px-3 py-2 rounded-xl text-sm border"
                style={{ borderColor: "var(--color-border)", background: "var(--color-background)" }}
              />
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || submitting}
                className="p-2 rounded-xl transition-all disabled:opacity-50"
                style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)" }}>Login untuk berdiskusi</p>
      )}

      {/* Discussions */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
        </div>
      ) : topLevel.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle size={32} className="mx-auto mb-3" style={{ color: "var(--color-border)" }} />
          <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Belum ada diskusi. Mulai percakapan!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevel.map((disc) => {
            const replies = getReplies(disc.id);
            const isLiked = disc.likedBy?.includes(user?.uid || "");
            return (
              <div key={disc.id} className="space-y-2">
                <div className="flex gap-3 p-3 rounded-xl" style={{ background: "var(--color-muted)" }}>
                  <UserAvatar src={disc.userPhoto || undefined} name={disc.userName || "User"} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{disc.userName}</span>
                      <span className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{formatTime(disc.createdAt)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{disc.text}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <button
                        onClick={() => handleLike(disc.id)}
                        className="flex items-center gap-1 text-xs transition-all"
                        style={{ color: isLiked ? "#ef4444" : "var(--color-muted-foreground)" }}
                      >
                        <Heart size={12} className={isLiked ? "fill-current" : ""} />
                        {disc.likes || 0}
                      </button>
                      <button
                        onClick={() => setReplyTo(disc.id)}
                        className="flex items-center gap-1 text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        <Reply size={12} /> Balas
                      </button>
                      {user && user.uid !== disc.userId && (
                        <ReportButton
                          targetType="discussion"
                          targetId={disc.id}
                          targetUserId={disc.userId}
                          targetUserName={disc.userName || "User"}
                          contentSnapshot={disc.text}
                          iconSize={12}
                          className="p-1 text-stone-400 hover:text-amber-700 rounded"
                        />
                      )}
                      {disc.userId === user?.uid && (
                        <button
                          onClick={() => handleDelete(disc.id)}
                          className="flex items-center gap-1 text-xs"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="ml-8 space-y-2">
                    {replies.map((reply) => {
                      const isReplyLiked = reply.likedBy?.includes(user?.uid || "");
                      return (
                        <div key={reply.id} className="flex gap-3 p-3 rounded-xl" style={{ background: "var(--color-muted)" }}>
                          <UserAvatar src={reply.userPhoto || undefined} name={reply.userName || "User"} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold">{reply.userName}</span>
                              <span className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{formatTime(reply.createdAt)}</span>
                            </div>
                            <p className="text-xs whitespace-pre-wrap">{reply.text}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <button
                                onClick={() => handleLike(reply.id)}
                                className="flex items-center gap-1 text-[10px] transition-all"
                                style={{ color: isReplyLiked ? "#ef4444" : "var(--color-muted-foreground)" }}
                              >
                                <Heart size={10} className={isReplyLiked ? "fill-current" : ""} />
                                {reply.likes || 0}
                              </button>
                              {user && user.uid !== reply.userId && (
                                <ReportButton
                                  targetType="discussion"
                                  targetId={reply.id}
                                  targetUserId={reply.userId}
                                  targetUserName={reply.userName || "User"}
                                  contentSnapshot={reply.text}
                                  iconSize={10}
                                  className="p-0.5 text-stone-400 hover:text-amber-700 rounded"
                                />
                              )}
                              {reply.userId === user?.uid && (
                                <button
                                  onClick={() => handleDelete(reply.id)}
                                  className="flex items-center gap-1 text-[10px]"
                                  style={{ color: "var(--color-muted-foreground)" }}
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
