import { Loader2, X } from "lucide-react";
import type { useAdminPrograms } from "@/hooks/admin/useAdminPrograms";

type Props = Pick<
  ReturnType<typeof useAdminPrograms>,
  | "showAddAnnouncement"
  | "setShowAddAnnouncement"
  | "handleCreateAnnouncement"
  | "announcementTitle"
  | "setAnnouncementTitle"
  | "announcementBody"
  | "setAnnouncementBody"
  | "creatingAnnouncement"
>;

export function AnnouncementModal({
  showAddAnnouncement,
  setShowAddAnnouncement,
  handleCreateAnnouncement,
  announcementTitle,
  setAnnouncementTitle,
  announcementBody,
  setAnnouncementBody,
  creatingAnnouncement,
}: Props) {
  return (
    <>
      {showAddAnnouncement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setShowAddAnnouncement(false)}
        >
          <div
            className="bg-[#FFF9EF] dark:bg-[#1B2E27] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#DEDDD0] dark:border-[#3A5B4F] space-y-4 text-[#304D42] dark:text-[#FFF9EF]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#DEDDD0] dark:border-[#3A5B4F]">
              <h3 className="text-sm font-bold tracking-tight">Buat Pengumuman Sekolah</h3>
              <button
                onClick={() => setShowAddAnnouncement(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF] hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer"
                aria-label="Tutup modal"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] placeholder-[#797D6E] dark:placeholder-[#BAC0B3] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                  placeholder="Contoh: Jadwal Layanan Selama Ujian Sekolah"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                  Isi Pesan Pengumuman
                </label>
                <textarea
                  value={announcementBody}
                  onChange={(e) => setAnnouncementBody(e.target.value)}
                  className="min-h-[100px] w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] placeholder-[#797D6E] dark:placeholder-[#BAC0B3] focus:outline-none focus:ring-2 focus:ring-[#94492C] resize-none"
                  placeholder="Tuliskan isi pengumuman untuk siswa..."
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DEDDD0] dark:border-[#3A5B4F]">
                <button
                  type="button"
                  onClick={() => setShowAddAnnouncement(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingAnnouncement || !announcementTitle.trim() || !announcementBody.trim()}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#304D42] dark:bg-[#9E5336] hover:opacity-90 disabled:opacity-50 text-[#FFF9EF] text-xs font-bold transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {creatingAnnouncement ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <span>Terbitkan Pengumuman</span>
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
