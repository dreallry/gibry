import { useState, useEffect, useCallback } from "react";
import { Star, Send, Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { addReview, getBookReviews, getBookAverageRating, type Review } from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import { checkContent } from "@/lib/wordFilter";
import { checkRateLimit, recordRateLimitAction } from "@/lib/rateLimiter";
import { ReportButton } from "@/components/ReportButton";

interface Props { bookId: string; }

export function BookReviews({ bookId }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [avgRating, setAvgRating] = useState({ avg: 0, count: 0 });

  const loadData = useCallback(async () => {
    const r = await getBookReviews(bookId);
    setReviews(r); setAvgRating(await getBookAverageRating(bookId, r));
  }, [bookId]);

  useEffect(() => { loadData(); }, [bookId, loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile || !comment.trim()) return;

    // Rate limit: max 5 reviews per 5 minutes
    const rl = checkRateLimit(`review_${user.uid}`, 5, 300000);
    if (!rl.allowed) {
      toast("error", `Terlalu cepat mengirim ulasan. Tunggu ${rl.waitSeconds} detik.`);
      return;
    }

    // Word filter
    const contentCheck = checkContent(comment);
    if (!contentCheck.clean) {
      toast("error", "Ulasan mengandung kata yang tidak pantas.");
      return;
    }

    setSubmitting(true);
    try {
      await addReview(user.uid, profile.nama, profile.photoURL, bookId, rating, comment.trim());
      recordRateLimitAction(`review_${user.uid}`, 300000);
      setComment("");
      setRating(5);
      toast("success", "Ulasan berhasil dikirim!");
      loadData();
    } catch (err: any) {
      toast("error", "Gagal mengirim ulasan: " + (err.message || ""));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} className={i < Math.round(avgRating.avg) ? "fill-amber-400 text-amber-400" : ""} style={i >= Math.round(avgRating.avg) ? { color: "var(--color-border)" } : {}} />)}</div>
        <span className="text-sm font-medium">{avgRating.avg}</span>
        <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>({avgRating.count} ulasan)</span>
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-2xl" style={{ background: "var(--color-muted)" }}>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(s)} className="cursor-pointer hover:scale-110 transition-transform">
                <Star size={20} className={`transition-colors ${s <= (hoverRating || rating) ? "fill-amber-400 text-amber-400" : ""}`} style={s > (hoverRating || rating) ? { color: "var(--color-border)" } : {}} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full p-3 rounded-xl text-sm resize-none outline-none transition-colors" style={{ border: "1px solid var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)" }} rows={3} placeholder="Tulis ulasan Anda..." />
          <button type="submit" disabled={submitting || !comment.trim()} className="mt-2 px-4 py-2 text-white rounded-full text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: "var(--color-primary)" }}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Kirim
          </button>
        </form>
      )}

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-6"><MessageSquare size={24} className="mx-auto mb-2" style={{ color: "var(--color-border)" }} /><p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Belum ada ulasan.</p></div>
        ) : reviews.map((r) => (
          <div key={r.id} className="pb-4 last:border-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden" style={{ background: r.userPhoto ? "transparent" : "var(--color-muted)" }}>
                {r.userPhoto ? <img src={r.userPhoto} alt="" className="w-full h-full object-cover" /> : (r.userName?.charAt(0) || "?")}
              </div>
              <span className="text-sm font-medium">{r.userName}</span>
              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className={i < r.rating ? "fill-amber-400 text-amber-400" : ""} style={i >= r.rating ? { color: "var(--color-border)" } : {}} />
                  ))}
                </div>
                {user && user.uid !== r.userId && (
                  <ReportButton
                    targetType="review"
                    targetId={r.id}
                    targetUserId={r.userId}
                    targetUserName={r.userName}
                    contentSnapshot={r.comment}
                    iconSize={12}
                    className="p-1 text-stone-400 hover:text-amber-700 rounded"
                  />
                )}
              </div>
            </div>
            <p className="text-sm ml-9" style={{ color: "var(--color-secondary-foreground)" }}>{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
