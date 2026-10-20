import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserNotes, addNote, deleteNote, type ReadingNote } from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import { 
  StickyNote, Plus, Trash2, X, Loader2, BookOpen, Search, 
  Quote, Calendar, Copy, Bookmark, PenLine
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// --- CREATIVE WORKSPACE & SCRAPBOOK ACCENTS (Warm Library Palette) ---

// Washi Tape Accent (Soft Parchment Tone)
const WashiTape = ({ className = "" }: { className?: string }) => (
  <div
    className={`h-4 w-16 rotate-[-3deg] shadow-2xs ${className}`}
    style={{ background: "#e8dfce", border: "1px solid #d4c8aa", opacity: 0.9 }}
  />
);

// Hand-drawn Curved Arrow (SVG Doodle)
const HandDrawnArrow = ({ className = "w-10 h-6 text-[#a67c52]" }: { className?: string }) => (
  <svg viewBox="0 0 60 30" fill="none" className={className}>
    <path d="M5 18 C 20 5, 40 5, 52 16 M40 8 L 54 17 L 44 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Hand-drawn Underline Scribble (SVG Doodle)
const HandDrawnScribble = ({ className = "w-32 h-3 text-[#a67c52]" }: { className?: string }) => (
  <svg viewBox="0 0 120 10" fill="none" className={className}>
    <path d="M2 5 Q 30 1, 60 6 T 118 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// Hand-drawn Star Doodle
const HandStar = ({ className = "w-5 h-5 text-[#a67c52]" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default function NotesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<ReadingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newPage, setNewPage] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) {
      getUserNotes(user.uid).then((n) => { setNotes(n); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [user]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newBookTitle.trim() || !newContent.trim()) return;
    setAdding(true);
    try {
      const pageNum = newPage ? parseInt(newPage, 10) : undefined;
      await addNote(user.uid, "", newBookTitle.trim(), newContent.trim(), pageNum);
      toast("success", "Catatan berhasil disimpan ke jurnal!");
      setShowAdd(false);
      setNewBookTitle("");
      setNewContent("");
      setNewPage("");
      const updated = await getUserNotes(user.uid);
      setNotes(updated);
    } catch (err: any) {
      toast("error", err.message || "Gagal menyimpan catatan");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(noteId: string) {
    if (!user) return;
    try {
      await deleteNote(noteId);
      toast("info", "Catatan telah dihapus");
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (err: any) {
      toast("error", err.message);
    }
  }

  function handleCopy(content: string) {
    navigator.clipboard.writeText(content);
    toast("success", "Kutipan berhasil disalin!");
  }

  const filteredNotes = notes.filter(n =>
    (n.bookTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.content || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageTransition>
      <div
        className="min-h-screen relative pt-24 sm:pt-28 pb-12 px-4 sm:px-6 lg:px-8 text-[#4a3f35] overflow-hidden"
        style={{
          backgroundColor: "#f5f1e6",
          backgroundImage: `
            linear-gradient(#e2d9c8 1px, transparent 1px),
            linear-gradient(90deg, #e2d9c8 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
      >
        {/* ── REAL WORKSPACE ASSETS FROM /assetsscrap/ (Organic Desk Props) ── */}

        {/* Vintage Computer Keyboard (Top Left Corner) */}
        <img
          src="/assetsscrap/computer.png"
          alt="Vintage Keyboard Desk Prop"
          className="absolute top-20 sm:top-24 left-4 sm:left-8 w-28 sm:w-36 lg:w-44 rotate-[-10deg] drop-shadow-md pointer-events-none z-10 hidden sm:block opacity-90"
        />

        {/* Coffee Cup (Top Right Corner) */}
        <img
          src="/assetsscrap/coffeecup.png"
          alt="Coffee Cup Desk Prop"
          className="absolute top-20 sm:top-24 right-6 sm:right-12 w-20 sm:w-28 lg:w-32 rotate-[12deg] drop-shadow-md pointer-events-none z-10 hidden sm:block opacity-90"
        />

        {/* Vintage Phone (Middle Right) */}
        <img
          src="/assetsscrap/phone.png"
          alt="Retro Phone Desk Prop"
          className="absolute top-72 right-4 sm:right-8 w-24 sm:w-32 rotate-[18deg] drop-shadow-md pointer-events-none z-10 hidden md:block opacity-85"
        />

        {/* Magnifying Glass (Middle Left) */}
        <img
          src="/assetsscrap/magnifier.png"
          alt="Magnifier Desk Prop"
          className="absolute top-80 left-4 sm:left-8 w-20 sm:w-28 rotate-[-18deg] drop-shadow-md pointer-events-none z-10 hidden md:block opacity-85"
        />

        {/* Stapler (Bottom Right Corner) */}
        <img
          src="/assetsscrap/stapler.png"
          alt="Stapler Desk Prop"
          className="absolute bottom-16 right-8 w-20 sm:w-28 rotate-[15deg] drop-shadow-md pointer-events-none z-10 hidden lg:block opacity-85"
        />

        {/* Exclamation Mark Cut-out Badge */}
        <img
          src="/assetsscrap/threeexclamationmark.png"
          alt="Exclamation Mark Doodle"
          className="absolute top-48 right-1/4 w-10 sm:w-12 rotate-[10deg] drop-shadow-xs pointer-events-none z-10 hidden lg:block"
        />

        {/* Question Mark Doodle */}
        <img
          src="/assetsscrap/question_mark-removebg-preview.png"
          alt="Question Mark Doodle"
          className="absolute top-44 left-1/4 w-8 sm:w-10 rotate-[-12deg] drop-shadow-xs pointer-events-none z-10 hidden lg:block"
        />

        {/* Reading Recap Stamp Scrap Asset */}
        <img
          src="/assetsscrap/recap.png"
          alt="Recap Stamp"
          className="absolute bottom-20 left-12 w-28 opacity-75 rotate-[-8deg] pointer-events-none z-10 hidden lg:block hover:scale-105 transition-transform"
        />

        {/* Vintage Note Asset */}
        <img
          src="/assetsscrap/4cc29149d259e37cb33034bd61eb83d3-removebg-preview.png"
          alt="Scrap Note"
          className="absolute top-96 right-20 w-32 opacity-70 rotate-[14deg] pointer-events-none z-10 hidden xl:block"
        />

        <div className="max-w-6xl mx-auto pb-24 relative z-10">

          {/* ── HEADER — CREATIVE WORKSPACE COLLAGE ── */}
          <div className="relative mb-12 pt-2 text-center max-w-3xl mx-auto">

            {/* Title Paper Cut-outs Container */}
            <div className="inline-flex flex-col items-center justify-center gap-2 select-none">
              
              {/* Top Handwritten Handle Badge */}
              <div className="flex items-center gap-1.5 mb-1">
                <HandStar className="w-4 h-4 text-[#a67c52]" />
                <span
                  className="text-base sm:text-lg font-bold italic text-[#7d6b56]"
                  style={{ fontFamily: '"Caveat", "Dancing Script", cursive' }}
                >
                  ruang kreatif & jurnal refleksi bacaan
                </span>
                <HandStar className="w-4 h-4 text-[#a67c52]" />
              </div>

              {/* Overlapping Title Blocks (Paper Cut-Out / Stabilo Highlighter Style) */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                {/* Block 1: Dark Cocoa Brown Paper Block */}
                <div 
                  className="relative px-6 py-2.5 rounded-xs shadow-sm rotate-[-3deg] border border-[#3b322a]/20"
                  style={{ background: "#4a3f35", color: "#f5f1e6" }}
                >
                  <span className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight font-sans">
                    CATATAN
                  </span>
                </div>

                {/* Block 2: Warm Amber Accent Block */}
                <div 
                  className="relative px-6 py-2.5 rounded-xs shadow-sm rotate-[3deg] border border-[#8d6e4c]/20"
                  style={{ background: "#a67c52", color: "#ffffff" }}
                >
                  <span className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight font-sans">
                    BACA
                  </span>
                </div>
              </div>

              {/* Block 3: Cream Parchment Sub-block */}
              <div 
                className="px-7 py-2 rounded-xs shadow-xs rotate-[-1.5deg] -mt-1.5 border border-[#dbd0ba]"
                style={{ background: "#fffcf5", color: "#4a3f35" }}
              >
                <span className="text-2xl sm:text-4xl font-black uppercase tracking-tight font-sans">
                  & KUTIPAN BUKU
                </span>
              </div>

            </div>

            {/* Handwritten Script Tagline & Doodle Arrow */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <span
                className="text-base sm:text-xl font-bold italic text-[#7d6b56]"
                style={{ fontFamily: '"Caveat", "Dancing Script", cursive' }}
              >
                simpan pemikiran, rangkuman, & inspirasi dari buku favoritmu
              </span>
              <HandDrawnArrow className="w-8 h-5 text-[#a67c52]" />
            </div>

            {/* Search Bar & Action Buttons */}
            <div className="mt-8 max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3">
              
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7d6b56]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari buku atau kutipan..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#fffcf5] border border-[#dbd0ba] rounded-2xl text-xs font-bold text-[#4a3f35] placeholder:text-[#7d6b56]/60 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30 focus:border-[#a67c52] transition-all"
                />
              </div>

              <button
                onClick={() => setShowAdd(true)}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#a67c52] hover:bg-[#8d6e4c] text-white rounded-2xl border border-[#8d6e4c] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
              >
                <Plus size={16} />
                <span>Tambah Catatan Baru</span>
              </button>

            </div>

          </div>

          {/* ── SCRAPBOOK NOTE CARDS GRID ── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[#fffcf5] border border-[#dbd0ba] rounded-2xl p-6 shadow-xs animate-pulse space-y-3"
                >
                  <div className="h-4 w-1/2 bg-[#ece5d8] rounded" />
                  <div className="h-16 bg-[#f5f1e6] rounded-xl" />
                  <div className="h-3 w-1/3 bg-[#ece5d8] rounded" />
                </div>
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="max-w-md mx-auto bg-[#fffcf5] border border-[#dbd0ba] rounded-3xl p-10 text-center shadow-sm relative z-10 my-8">
              <WashiTape className="absolute -top-3 left-1/2 -translate-x-1/2 z-20" />
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#ece5d8] border border-[#dbd0ba] flex items-center justify-center text-[#a67c52]">
                <StickyNote size={24} />
              </div>
              <h3 className="text-lg font-black text-[#4a3f35] uppercase font-sans">Belum Ada Catatan</h3>
              <p className="text-xs font-semibold text-[#7d6b56] mt-1.5 leading-relaxed">
                Tulis kutipan favorit atau rangkuman menarik dari buku yang Anda baca.
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-5 px-6 py-2.5 bg-[#a67c52] text-white font-black text-xs uppercase tracking-wider rounded-xl border border-[#8d6e4c] shadow-xs inline-flex items-center gap-2 hover:bg-[#8d6e4c] transition-colors"
              >
                <Plus size={14} /> Buat Catatan Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {filteredNotes.map((note, i) => {
                const tilts = ["rotate-[-1.2deg]", "rotate-[1deg]", "rotate-[-0.8deg]", "rotate-[0.6deg]"];
                const tilt = tilts[i % 4];
                const bgColors = ["bg-[#fffcf5]", "bg-[#fbf8f0]", "bg-[#f5efe0]"];
                const bgColor = bgColors[i % 3];

                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`${bgColor} border border-[#dbd0ba] rounded-2xl p-6 shadow-xs flex flex-col justify-between ${tilt} hover:rotate-0 hover:shadow-md transition-all duration-200 relative`}
                  >
                    {/* Washi Tape Accent */}
                    <WashiTape className="absolute -top-3 right-6 z-20" />

                    <div className="space-y-3">
                      {/* Book Title Header */}
                      <div className="flex items-start justify-between gap-2 pr-6">
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} className="text-[#a67c52]" />
                          <span className="text-xs font-black uppercase tracking-wider text-[#4a3f35] line-clamp-1">
                            {note.bookTitle || "Catatan Buku"}
                          </span>
                        </div>
                        {note.page && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#ece5d8] text-[#5c4d3f] border border-[#dbd0ba] shrink-0">
                            HLM. {note.page}
                          </span>
                        )}
                      </div>

                      {/* Quoted Content */}
                      <div className="relative pt-1">
                        <Quote size={18} className="opacity-20 absolute -top-1 -left-1 text-[#a67c52]" />
                        <p className="text-xs sm:text-sm font-medium leading-relaxed text-[#4a3f35] whitespace-pre-wrap pl-3 border-l-2 border-[#a67c52]/30">
                          {note.content}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-4 mt-4 border-t border-[#dbd0ba] flex items-center justify-between text-[11px] font-semibold text-[#7d6b56]">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-[#a67c52]" />
                        <span>{new Date(note.createdAt || Date.now()).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(note.content)}
                          title="Salin Teks"
                          className="p-1.5 rounded-lg hover:bg-[#ece5d8] text-[#4a3f35] transition-colors"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteId(note.id)}
                          title="Hapus"
                          className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-900 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={!!deleteId}
        title="Hapus Catatan?"
        message="Apakah Anda yakin ingin menghapus catatan dari jurnal ini?"
        confirmText="Ya, Hapus"
        variant="danger"
        onConfirm={() => { if (deleteId) handleDelete(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />

      {/* ADD NOTE MODAL — WORKSPACE JOURNAL MODAL */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs" onClick={() => setShowAdd(false)}>
          <motion.div 
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#fffcf5] border border-[#dbd0ba] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl relative z-10 text-[#4a3f35]" 
            onClick={(e) => e.stopPropagation()}
          >
            <WashiTape className="absolute -top-3 left-1/2 -translate-x-1/2 z-20" />

            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#dbd0ba]">
              <div className="flex items-center gap-2">
                <PenLine size={18} className="text-[#a67c52]" />
                <h3 className="text-base font-black text-[#4a3f35] uppercase font-sans">Tambah Catatan Jurnal</h3>
              </div>
              <button 
                onClick={() => setShowAdd(false)} 
                className="w-7 h-7 rounded-full bg-[#ece5d8] border border-[#dbd0ba] flex items-center justify-center text-[#4a3f35] hover:bg-[#d4c8aa] transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#4a3f35] mb-1">
                  Judul Buku / Sumber
                </label>
                <input 
                  type="text" 
                  value={newBookTitle} 
                  onChange={(e) => setNewBookTitle(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-[#f5f1e6] border border-[#dbd0ba] rounded-xl text-xs font-bold text-[#4a3f35] placeholder:text-[#7d6b56]/60 focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30 focus:border-[#a67c52]" 
                  placeholder="Misal: Filosofi Teras, Atomic Habits..." 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#4a3f35] mb-1">
                  Halaman (Opsional)
                </label>
                <input 
                  type="number" 
                  value={newPage} 
                  onChange={(e) => setNewPage(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-[#f5f1e6] border border-[#dbd0ba] rounded-xl text-xs font-bold text-[#4a3f35] placeholder:text-[#7d6b56]/60 focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30 focus:border-[#a67c52]" 
                  placeholder="Contoh: 42" 
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#4a3f35] mb-1">
                  Isi Catatan / Kutipan
                </label>
                <textarea 
                  value={newContent} 
                  onChange={(e) => setNewContent(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-[#f5f1e6] border border-[#dbd0ba] rounded-xl text-xs font-bold text-[#4a3f35] placeholder:text-[#7d6b56]/60 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30 focus:border-[#a67c52] leading-relaxed" 
                  placeholder="Tuliskan pemikiran, rangkuman, atau kutipan favorit dari buku..." 
                  required 
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={adding || !newBookTitle.trim() || !newContent.trim()} 
                  className="w-full py-3 bg-[#a67c52] hover:bg-[#8d6e4c] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> 
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Catatan</span>
                  )}
                </button>
              </div>
            </form>

          </motion.div>
        </div>
      )}

    </PageTransition>
  );
}
