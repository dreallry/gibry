import React, { useState, useEffect } from "react";
import { X, Lightbulb, ThumbsUp, Plus, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import {
  suggestBook,
  getBookSuggestions,
  toggleVoteBookSuggestion,
  type BookSuggestion,
} from "@/lib/firestore";
import { checkContent } from "@/lib/wordFilter";
import { checkRateLimit, recordRateLimitAction } from "@/lib/rateLimiter";

interface BookSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BookSuggestionModal: React.FC<BookSuggestionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});

  // Form states
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen]);

  async function loadSuggestions() {
    setLoading(true);
    try {
      const data = await getBookSuggestions();
      setSuggestions(data);
      const initialVotes: Record<string, boolean> = {};
      data.forEach((s) => {
        if (s.hasVoted) initialVotes[s.id] = true;
      });
      setUserVotes(initialVotes);
    } catch (err: any) {
      console.error("Error loading suggestions:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(suggestionId: string) {
    if (!user) {
      toast("info", "Silakan login terlebih dahulu untuk memberikan dukungan.");
      return;
    }
    setVotingId(suggestionId);
    try {
      const hasVoted = await toggleVoteBookSuggestion(suggestionId, user.uid);
      setUserVotes((prev) => ({ ...prev, [suggestionId]: hasVoted }));
      setSuggestions((prev) =>
        prev.map((s) => {
          if (s.id !== suggestionId) return s;
          const currentCount = s.voteCount || 0;
          return {
            ...s,
            voteCount: hasVoted ? currentCount + 1 : Math.max(0, currentCount - 1),
          };
        })
      );
      toast("success", hasVoted ? "Dukungan berhasil ditambahkan!" : "Dukungan dibatalkan.");
    } catch (err: any) {
      toast("error", "Gagal memproses vote: " + err.message);
    } finally {
      setVotingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) {
      toast("info", "Silakan login untuk mengusulkan buku.");
      return;
    }

    if (!title.trim() || !reason.trim()) {
      toast("error", "Judul buku dan alasan harus diisi.");
      return;
    }

    // Rate limit: max 3 suggestions per hour
    const rl = checkRateLimit(`suggest_book_${user.uid}`, 3, 3600000);
    if (!rl.allowed) {
      toast("error", `Terlalu sering mengusulkan buku. Coba lagi dalam ${Math.ceil(rl.waitSeconds / 60)} menit.`);
      return;
    }

    // Word filter
    const checkT = checkContent(title);
    const checkR = checkContent(reason);
    if (!checkT.clean || !checkR.clean) {
      toast("error", "Usulan mengandung kata yang tidak sesuai tata tertib sekolah.");
      return;
    }

    setSubmitting(true);
    try {
      await suggestBook(
        user.uid,
        profile.nama || "Siswa",
        title.trim(),
        reason.trim(),
        author.trim() || undefined
      );
      recordRateLimitAction(`suggest_book_${user.uid}`, 3600000);
      toast("success", "Usulan buku berhasil dikirimkan ke pustakawan!");
      setTitle("");
      setAuthor("");
      setReason("");
      setActiveTab("list");
      await loadSuggestions();
    } catch (err: any) {
      toast("error", "Gagal mengirimkan usulan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      onClick={onClose}
    >
      <div
        className="rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-600">
              <Lightbulb size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-foreground)]">
                Papan Usulan Pengadaan Buku
              </h3>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Bantu perpustakaan memilih buku baru favoritmu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-slate-100"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex p-2 gap-1 border-b" style={{ background: "var(--color-muted)", borderColor: "var(--color-border)" }}>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "list"
                ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-xs"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            Daftar Usulan Siswa ({suggestions.length})
          </button>
          <button
            onClick={() => setActiveTab("form")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "form"
                ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-xs"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <Plus size={13} />
            <span>Usulkan Buku Baru</span>
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "list" ? (
            loading ? (
              <div className="py-12 text-center text-xs text-[var(--color-muted-foreground)]">
                <Loader2 size={24} className="animate-spin mx-auto mb-2 text-amber-600" />
                Memuat usulan buku...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Lightbulb size={36} className="mx-auto text-amber-500 opacity-50" />
                <h4 className="text-sm font-bold text-[var(--color-foreground)]">Belum Ada Usulan Buku</h4>
                <p className="text-xs text-[var(--color-muted-foreground)] max-w-xs mx-auto">
                  Belum ada siswa yang mengusulkan buku. Jadilah yang pertama merekomendasikan buku impianmu!
                </p>
                <button
                  onClick={() => setActiveTab("form")}
                  className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 hover:bg-amber-700 transition-colors"
                >
                  <Plus size={13} /> Usulkan Sekarang
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl border transition-all space-y-2.5"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-[var(--color-foreground)]">{s.title}</h4>
                        {s.author && (
                          <p className="text-xs text-[var(--color-muted-foreground)]">karya {s.author}</p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          s.status === "accepted"
                            ? "bg-emerald-100 text-emerald-800"
                            : s.status === "acquired"
                            ? "bg-blue-100 text-blue-800"
                            : s.status === "rejected"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {s.status === "accepted"
                          ? "Disetujui"
                          : s.status === "acquired"
                          ? "Tersedia di Rak"
                          : s.status === "rejected"
                          ? "Ditolak"
                          : "Diajukan"}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed italic">
                      "{s.reason}"
                    </p>

                    {s.adminNote && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <strong>Catatan Pustakawan:</strong> {s.adminNote}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t text-xs" style={{ borderColor: "var(--color-border)" }}>
                      <span className="text-[10px] text-[var(--color-muted-foreground)]">
                        Oleh <strong>{s.userName}</strong> • {new Date(s.createdAt).toLocaleDateString("id-ID")}
                      </span>

                      <button
                        type="button"
                        disabled={votingId === s.id}
                        onClick={() => handleVote(s.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          (userVotes[s.id] ?? s.hasVoted)
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-[var(--color-muted)] text-[var(--color-foreground)] hover:bg-amber-100 hover:text-amber-900"
                        }`}
                      >
                        <ThumbsUp size={12} className={(userVotes[s.id] ?? s.hasVoted) ? "fill-white" : ""} />
                        <span>{s.voteCount || 0} Dukungan</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                  Judul Buku *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Atomic Habits atau Struktur Data C++"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  style={{ background: "var(--color-card)", borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                  Penulis / Pengarang
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Contoh: James Clear"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  style={{ background: "var(--color-card)", borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                  Mengapa Buku Ini Perlu Ada di Perpustakaan? *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Jelaskan manfaat buku ini untuk pembelajaran atau minat baca teman-temanmu..."
                  className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  style={{ background: "var(--color-card)", borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                Usulan yang mendapatkan banyak dukungan dari siswa lain akan diprioritaskan pustakawan pada pengadaan koleksi perpustakaan berikutnya.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Lightbulb size={13} />}
                  <span>{submitting ? "Mengirim Usulan..." : "Kirim Usulan"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
