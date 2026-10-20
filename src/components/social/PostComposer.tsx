import { X, Send, Quote, HelpCircle, Plus } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { CommunityTimelineProps } from "./CommunityTimeline";

type Props = Pick<CommunityTimelineProps,
  | "composerOpen"
  | "setComposerOpen"
  | "profile"
  | "handleCreatePost"
  | "setComposerType"
  | "composerType"
  | "quoteContent"
  | "setQuoteContent"
  | "quoteBookTitle"
  | "setQuoteBookTitle"
  | "quoteBookAuthor"
  | "setQuoteBookAuthor"
  | "quotePageNumber"
  | "setQuotePageNumber"
  | "quoteReflection"
  | "setQuoteReflection"
  | "askContent"
  | "setAskContent"
  | "askTags"
  | "setAskTags"
  | "submittingPost"
>;

export function PostComposer({
  composerOpen,
  setComposerOpen,
  profile,
  handleCreatePost,
  setComposerType,
  composerType,
  quoteContent,
  setQuoteContent,
  quoteBookTitle,
  setQuoteBookTitle,
  quoteBookAuthor,
  setQuoteBookAuthor,
  quotePageNumber,
  setQuotePageNumber,
  quoteReflection,
  setQuoteReflection,
  askContent,
  setAskContent,
  askTags,
  setAskTags,
  submittingPost,
}: Props) {
  return (
    <div className="bg-[#fffcf5] border border-[#dbd0ba] rounded-2xl shadow-xs overflow-hidden transition-all">
      {!composerOpen ? (
        <div
          onClick={() => setComposerOpen(true)}
          className="p-4 flex items-center gap-3 cursor-pointer hover:bg-[#fbf7ee] transition-colors"
        >
          <UserAvatar
            src={profile?.photoURL}
            name={profile?.nama || "Pengguna"}
            size="md"
            showBadge={!!profile?.displayBadge}
            badge={profile?.displayBadge}
          />
          <div className="flex-1 bg-[#f7f3ea] border border-[#dbd0ba] rounded-xl px-4 py-2.5 text-xs text-[#7d6b56] hover:text-[#4a3f35] flex items-center justify-between transition-colors">
            <span>Bagikan kutipan buku favorit atau ajukan tanya rekomendasi...</span>
            <Plus size={15} className="text-[#a67c52]" />
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreatePost} className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#dbd0ba] pb-3">
            <div className="flex items-center gap-1.5 bg-[#ece5d8] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setComposerType("quote")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${composerType === "quote"
                    ? "bg-[#fffcf5] text-[#4a3f35] shadow-2xs border border-[#dbd0ba]"
                    : "text-[#7d6b56]"
                  }`}
              >
                <Quote size={13} className="text-[#a67c52]" />
                <span>Kutipan Buku</span>
              </button>
              <button
                type="button"
                onClick={() => setComposerType("ask")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${composerType === "ask"
                    ? "bg-[#fffcf5] text-[#4a3f35] shadow-2xs border border-[#dbd0ba]"
                    : "text-[#7d6b56]"
                  }`}
              >
                <HelpCircle size={13} className="text-[#a67c52]" />
                <span>Tanya Rekomendasi</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setComposerOpen(false)}
              className="p-1 text-[#7d6b56] hover:text-[#4a3f35] rounded-lg"
            >
              <X size={16} />
            </button>
          </div>

          {/* FORM TYPE: KUTIPAN BUKU */}
          {composerType === "quote" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#4a3f35] mb-1">
                  Teks Kutipan / Sorotan Favorit *
                </label>
                <textarea
                  rows={3}
                  value={quoteContent}
                  onChange={(e) => setQuoteContent(e.target.value)}
                  placeholder="Ketik kalimat atau paragraf dari buku yang sangat berkesan bagimu..."
                  className="w-full p-3 bg-[#fbf8f0] border border-[#dbd0ba] rounded-xl text-xs font-serif italic text-[#4a3f35] placeholder:italic placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#7d6b56] mb-1">
                    Judul Buku
                  </label>
                  <input
                    type="text"
                    value={quoteBookTitle}
                    onChange={(e) => setQuoteBookTitle(e.target.value)}
                    placeholder="Contoh: Filosofi Teras"
                    className="w-full px-3 py-2 bg-[#fbf8f0] border border-[#dbd0ba] rounded-xl text-xs font-medium text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#7d6b56] mb-1">
                    Penulis Buku
                  </label>
                  <input
                    type="text"
                    value={quoteBookAuthor}
                    onChange={(e) => setQuoteBookAuthor(e.target.value)}
                    placeholder="Contoh: Henry Manampiring"
                    className="w-full px-3 py-2 bg-[#fbf8f0] border border-[#dbd0ba] rounded-xl text-xs font-medium text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#7d6b56] mb-1">
                    Halaman (Opsional)
                  </label>
                  <input
                    type="number"
                    value={quotePageNumber}
                    onChange={(e) => setQuotePageNumber(e.target.value)}
                    placeholder="Contoh: 42"
                    className="w-full px-3 py-2 bg-[#fbf8f0] border border-[#dbd0ba] rounded-xl text-xs font-medium text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#7d6b56] mb-1">
                  Catatan / Refleksi Pribadi (Opsional)
                </label>
                <input
                  type="text"
                  value={quoteReflection}
                  onChange={(e) => setQuoteReflection(e.target.value)}
                  placeholder="Apa arti kutipan ini buatmu? (misal: 'Bikin sadar buat ga overthinking lagi')"
                  className="w-full px-3 py-2 bg-[#fbf8f0] border border-[#dbd0ba] rounded-xl text-xs font-medium text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30"
                />
              </div>
            </div>
          )}

          {/* FORM TYPE: TANYA REKOMENDASI */}
          {composerType === "ask" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#4a3f35] mb-1">
                  Pertanyaan Rekomendasi *
                </label>
                <textarea
                  rows={3}
                  value={askContent}
                  onChange={(e) => setAskContent(e.target.value)}
                  placeholder="Contoh: Ada yang tahu buku rekomendasi buat belajar public speaking yang bahasanya santai untuk pemula?"
                  className="w-full p-3 bg-[#fbf8f0] border border-[#dbd0ba] rounded-xl text-xs font-medium text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#7d6b56] mb-1">
                  Tag Topik (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={askTags}
                  onChange={(e) => setAskTags(e.target.value)}
                  placeholder="Contoh: public speaking, self improvement, pemula"
                  className="w-full px-3 py-2 bg-[#fbf8f0] border border-[#dbd0ba] rounded-xl text-xs font-medium text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#dbd0ba]">
            <button
              type="button"
              onClick={() => setComposerOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#7d6b56] hover:bg-[#ece5d8] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submittingPost}
              className="px-5 py-2 bg-[#a67c52] hover:bg-[#8d6e4c] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Send size={13} />
              <span>{submittingPost ? "Mempublikasikan..." : "Bagikan"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
