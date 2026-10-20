import { Loader2, X } from "lucide-react";
import type { useAdminPrograms } from "@/hooks/admin/useAdminPrograms";
import type { useAdminData } from "@/hooks/admin/useAdminData";

type Props = Pick<
  ReturnType<typeof useAdminPrograms>,
  | "showAddReadingList"
  | "setShowAddReadingList"
  | "handleCreateReadingList"
  | "readingListTitle"
  | "setReadingListTitle"
  | "readingListDesc"
  | "setReadingListDesc"
  | "readingListBookIds"
  | "setReadingListBookIds"
  | "creatingReadingList"
> &
  Pick<ReturnType<typeof useAdminData>, "books">;

export function ReadingListModal({
  showAddReadingList,
  setShowAddReadingList,
  handleCreateReadingList,
  readingListTitle,
  setReadingListTitle,
  readingListDesc,
  setReadingListDesc,
  readingListBookIds,
  books,
  setReadingListBookIds,
  creatingReadingList,
}: Props) {
  return (
    <>
      {showAddReadingList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setShowAddReadingList(false)}
        >
          <div
            className="bg-[#FFF9EF] dark:bg-[#1B2E27] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#DEDDD0] dark:border-[#3A5B4F] space-y-4 max-h-[85vh] overflow-y-auto text-[#304D42] dark:text-[#FFF9EF]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#DEDDD0] dark:border-[#3A5B4F]">
              <h3 className="text-sm font-bold tracking-tight">Buat Rekomendasi Koleksi</h3>
              <button
                onClick={() => setShowAddReadingList(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF] hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer"
                aria-label="Tutup modal"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateReadingList} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                  Judul Koleksi
                </label>
                <input
                  type="text"
                  value={readingListTitle}
                  onChange={(e) => setReadingListTitle(e.target.value)}
                  className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] placeholder-[#797D6E] dark:placeholder-[#BAC0B3] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                  placeholder="Contoh: 10 Buku Favorit Pilihan Pustakawan"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                  Deskripsi Koleksi
                </label>
                <textarea
                  value={readingListDesc}
                  onChange={(e) => setReadingListDesc(e.target.value)}
                  className="min-h-[70px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] placeholder-[#797D6E] dark:placeholder-[#BAC0B3] focus:outline-none focus:ring-2 focus:ring-[#94492C] resize-none"
                  placeholder="Deskripsi singkat tema koleksi ini..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                  Pilih Buku ({readingListBookIds.length} terpilih)
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto divide-y divide-[#DEDDD0]/60 dark:divide-[#3A5B4F]/60 border border-[#DEDDD0] dark:border-[#3A5B4F] rounded-xl p-2 bg-white dark:bg-[#233B32]">
                  {books.map((book) => (
                    <label
                      key={book.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-[#F2ECDF] dark:hover:bg-[#1B2E27] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={readingListBookIds.includes(book.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setReadingListBookIds([...readingListBookIds, book.id]);
                          } else {
                            setReadingListBookIds(readingListBookIds.filter((id) => id !== book.id));
                          }
                        }}
                        className="w-4 h-4 rounded text-[#304D42] focus:ring-[#94492C]"
                      />
                      <span className="text-xs text-[#304D42] dark:text-[#FFF9EF] truncate">
                        {book.judul}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DEDDD0] dark:border-[#3A5B4F]">
                <button
                  type="button"
                  onClick={() => setShowAddReadingList(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingReadingList || !readingListTitle.trim()}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#304D42] dark:bg-[#9E5336] hover:opacity-90 disabled:opacity-50 text-[#FFF9EF] text-xs font-bold transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {creatingReadingList ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Koleksi</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
