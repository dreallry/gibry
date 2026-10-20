import { getGenreCategories } from "@/lib/firestore";
import { BookOpen, Plus, Loader2, X } from "lucide-react";
import type { useAdminBooks } from "@/hooks/admin/useAdminBooks";
import type { useToast } from "@/components/Toast";

type Props = Pick<
  ReturnType<typeof useAdminBooks>,
  | "showBookModal"
  | "editingBook"
  | "setShowBookModal"
  | "handleSaveBook"
  | "bookFormData"
  | "setBookFormData"
  | "savingBook"
> &
  Pick<ReturnType<typeof useToast>, "toast">;

export function BookEditorModal({
  showBookModal,
  editingBook,
  setShowBookModal,
  handleSaveBook,
  bookFormData,
  setBookFormData,
  toast,
  savingBook,
}: Props) {
  return (
    <>
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-[#FFF9EF] dark:bg-[#1B2E27] rounded-2xl shadow-xl border border-[#DEDDD0] dark:border-[#3A5B4F] overflow-hidden flex flex-col max-h-[90vh] text-[#304D42] dark:text-[#FFF9EF]">
            <div className="bg-[#F2ECDF] dark:bg-[#233B32] border-b border-[#DEDDD0] dark:border-[#3A5B4F] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-[#AD6549] dark:text-[#C57B5F]" />
                <h3 className="text-sm font-bold tracking-tight">
                  {editingBook ? "Edit Data Buku" : "Tambah Buku Baru"}
                </h3>
              </div>
              <button
                onClick={() => setShowBookModal(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF] hover:bg-[#E8EBDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer"
                aria-label="Tutup modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-[#304D42] dark:text-[#FFF9EF]">
                    Judul Buku *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookFormData.judul}
                    onChange={(e) => setBookFormData({ ...bookFormData, judul: e.target.value })}
                    className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#233B32] border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-semibold text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                    placeholder="Masukkan judul buku..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-[#304D42] dark:text-[#FFF9EF]">
                    Penulis *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookFormData.penulis}
                    onChange={(e) => setBookFormData({ ...bookFormData, penulis: e.target.value })}
                    className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#233B32] border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-semibold text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                    placeholder="Nama penulis..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-[#304D42] dark:text-[#FFF9EF]">
                    Penerbit
                  </label>
                  <input
                    type="text"
                    value={bookFormData.penerbit}
                    onChange={(e) => setBookFormData({ ...bookFormData, penerbit: e.target.value })}
                    className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#233B32] border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-medium text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                    placeholder="Nama penerbit..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-[#304D42] dark:text-[#FFF9EF]">
                    Genre / Kategori
                  </label>
                  <select
                    value={bookFormData.genre}
                    onChange={(e) => setBookFormData({ ...bookFormData, genre: e.target.value })}
                    className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#233B32] border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-medium text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                  >
                    {getGenreCategories().map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-[#304D42] dark:text-[#FFF9EF]">
                    Tahun Terbit
                  </label>
                  <input
                    type="number"
                    value={bookFormData.tahun}
                    onChange={(e) => setBookFormData({ ...bookFormData, tahun: Number(e.target.value) })}
                    className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#233B32] border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-medium text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-[#304D42] dark:text-[#FFF9EF]">
                    Jumlah Halaman
                  </label>
                  <input
                    type="number"
                    value={bookFormData.halaman}
                    onChange={(e) => setBookFormData({ ...bookFormData, halaman: Number(e.target.value) })}
                    className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#233B32] border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-medium text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-[#304D42] dark:text-[#FFF9EF]">
                    Kode ISBN
                  </label>
                  <input
                    type="text"
                    value={bookFormData.isbn}
                    onChange={(e) => setBookFormData({ ...bookFormData, isbn: e.target.value })}
                    className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#233B32] border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-medium text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                    placeholder="978-..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-[#304D42] dark:text-[#FFF9EF]">
                    Format Buku
                  </label>
                  <select
                    value={bookFormData.type}
                    onChange={(e) => setBookFormData({ ...bookFormData, type: e.target.value as "digital" | "fisik" })}
                    className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#233B32] border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-bold text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                  >
                    <option value="digital">Buku Digital (E-Book)</option>
                    <option value="fisik">Buku Fisik (Perpustakaan)</option>
                  </select>
                </div>
              </div>

              {/* Konfigurasi Format Buku */}
              {bookFormData.type === "digital" ? (
                <div className="p-4 rounded-xl bg-[#F2ECDF]/70 dark:bg-[#233B32] border border-[#DEDDD0] dark:border-[#3A5B4F] space-y-3">
                  <p className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF]">
                    Konfigurasi E-Book Digital
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-[#304D42] dark:text-[#FFF9EF]">
                        URL Berkas PDF
                      </label>
                      <input
                        type="url"
                        value={bookFormData.pdfUrl}
                        onChange={(e) => setBookFormData({ ...bookFormData, pdfUrl: e.target.value })}
                        className="min-h-[44px] w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1B2E27] border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-medium text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                        placeholder="https://example.com/buku.pdf"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#F2ECDF]/70 dark:bg-[#233B32] border border-[#DEDDD0] dark:border-[#3A5B4F] space-y-3">
                  <p className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF]">
                    Konfigurasi Buku Fisik
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold mb-1 text-[#304D42] dark:text-[#FFF9EF]">
                      Lokasi Rak di Perpustakaan
                    </label>
                    <input
                      type="text"
                      value={bookFormData.lokasiRak}
                      onChange={(e) => setBookFormData({ ...bookFormData, lokasiRak: e.target.value })}
                      className="min-h-[44px] w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1B2E27] border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-semibold text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                      placeholder="Contoh: Rak A-02, Lantai 1"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1 text-[#304D42] dark:text-[#FFF9EF]">
                  Sampul Buku (Cover)
                </label>
                {bookFormData.cover ? (
                  <div className="relative group w-28 h-40 rounded-xl overflow-hidden border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27]">
                    <img src={bookFormData.cover} alt="Pratinjau Sampul" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setBookFormData({ ...bookFormData, cover: "" })}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Hapus gambar sampul"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <label className="min-h-[44px] flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#F2ECDF] dark:bg-[#2C473D] border-2 border-dashed border-[#DEDDD0] dark:border-[#3A5B4F] text-xs text-[#565D4F] dark:text-[#BAC0B3] cursor-pointer hover:border-[#AD6549] transition-colors">
                      <Plus size={14} />
                      <span>Unggah Sampul (Maks. 2MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) { toast("error", "Ukuran gambar maksimal 2MB."); return; }
                          try {
                            const { compressImageToBase64 } = await import("@/lib/storage");
                            const dataUrl = await compressImageToBase64(file, 400, 600, 0.85);
                            setBookFormData({ ...bookFormData, cover: dataUrl });
                          } catch { toast("error", "Gagal memproses gambar."); }
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <input
                      type="url"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) setBookFormData({ ...bookFormData, cover: e.target.value });
                      }}
                      className="min-h-[44px] flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#233B32] border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-medium text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                      placeholder="Atau tempel tautan URL gambar..."
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-[#304D42] dark:text-[#FFF9EF]">
                  Sinopsis Ringkas
                </label>
                <textarea
                  rows={3}
                  value={bookFormData.deskripsi}
                  onChange={(e) => setBookFormData({ ...bookFormData, deskripsi: e.target.value })}
                  className="min-h-[70px] w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#233B32] border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-medium text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                  placeholder="Ringkasan atau sinopsis buku..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DEDDD0] dark:border-[#3A5B4F]">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingBook}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-bold bg-[#304D42] dark:bg-[#9E5336] hover:opacity-90 disabled:opacity-50 text-[#FFF9EF] transition-opacity shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {savingBook ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
                  <span>{savingBook ? "Menyimpan Data..." : editingBook ? "Perbarui Buku" : "Simpan Buku Baru"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
