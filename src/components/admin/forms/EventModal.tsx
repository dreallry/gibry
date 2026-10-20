import { Loader2, X } from "lucide-react";
import type { useAdminPrograms } from "@/hooks/admin/useAdminPrograms";

type Props = Pick<
  ReturnType<typeof useAdminPrograms>,
  | "showAddEvent"
  | "setShowAddEvent"
  | "handleCreateEvent"
  | "eventTitle"
  | "setEventTitle"
  | "eventDesc"
  | "setEventDesc"
  | "eventType"
  | "setEventType"
  | "eventStartDate"
  | "setEventStartDate"
  | "eventEndDate"
  | "setEventEndDate"
  | "eventTarget"
  | "setEventTarget"
  | "eventPoints"
  | "setEventPoints"
  | "creatingEvent"
>;

export function EventModal({
  showAddEvent,
  setShowAddEvent,
  handleCreateEvent,
  eventTitle,
  setEventTitle,
  eventDesc,
  setEventDesc,
  eventType,
  setEventType,
  eventStartDate,
  setEventStartDate,
  eventEndDate,
  setEventEndDate,
  eventTarget,
  setEventTarget,
  eventPoints,
  setEventPoints,
  creatingEvent,
}: Props) {
  return (
    <>
      {showAddEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setShowAddEvent(false)}
        >
          <div
            className="bg-[#FFF9EF] dark:bg-[#1B2E27] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#DEDDD0] dark:border-[#3A5B4F] space-y-4 max-h-[85vh] overflow-y-auto text-[#304D42] dark:text-[#FFF9EF]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#DEDDD0] dark:border-[#3A5B4F]">
              <h3 className="text-sm font-bold tracking-tight">Buat Tantangan Membaca</h3>
              <button
                onClick={() => setShowAddEvent(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF] hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer"
                aria-label="Tutup modal"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                  Nama Tantangan
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] placeholder-[#797D6E] dark:placeholder-[#BAC0B3] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                  placeholder="Contoh: Tantangan 5 Buku Bulan Ini"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                  Deskripsi
                </label>
                <textarea
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="min-h-[70px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] placeholder-[#797D6E] dark:placeholder-[#BAC0B3] focus:outline-none focus:ring-2 focus:ring-[#94492C] resize-none"
                  placeholder="Keterangan aturan tantangan..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                  Tipe Tantangan
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as typeof eventType)}
                  className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                >
                  <option value="reading_challenge">Target Jumlah Buku</option>
                  <option value="streak_challenge">Konsistensi Hari Berturut-turut</option>
                  <option value="genre_challenge">Eksplorasi Variasi Genre</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                    Mulai
                  </label>
                  <input
                    type="date"
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                    Selesai
                  </label>
                  <input
                    type="date"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                    Target (Buku/Hari)
                  </label>
                  <input
                    type="number"
                    value={eventTarget}
                    onChange={(e) => setEventTarget(Number(e.target.value))}
                    className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                    Imbalan Poin
                  </label>
                  <input
                    type="number"
                    value={eventPoints}
                    onChange={(e) => setEventPoints(Number(e.target.value))}
                    className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DEDDD0] dark:border-[#3A5B4F]">
                <button
                  type="button"
                  onClick={() => setShowAddEvent(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingEvent || !eventTitle.trim()}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#304D42] dark:bg-[#9E5336] hover:opacity-90 disabled:opacity-50 text-[#FFF9EF] text-xs font-bold transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {creatingEvent ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Terbitkan Tantangan</span>
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
