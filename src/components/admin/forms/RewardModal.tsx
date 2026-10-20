import { Loader2, X } from "lucide-react";
import type { useAdminPrograms } from "@/hooks/admin/useAdminPrograms";

type Props = Pick<
  ReturnType<typeof useAdminPrograms>,
  | "showAddReward"
  | "setShowAddReward"
  | "handleCreateReward"
  | "rewardTitle"
  | "setRewardTitle"
  | "rewardDesc"
  | "setRewardDesc"
  | "rewardType"
  | "setRewardType"
  | "rewardPoints"
  | "setRewardPoints"
  | "rewardStock"
  | "setRewardStock"
  | "creatingReward"
>;

export function RewardModal({
  showAddReward,
  setShowAddReward,
  handleCreateReward,
  rewardTitle,
  setRewardTitle,
  rewardDesc,
  setRewardDesc,
  rewardType,
  setRewardType,
  rewardPoints,
  setRewardPoints,
  rewardStock,
  setRewardStock,
  creatingReward,
}: Props) {
  return (
    <>
      {showAddReward && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setShowAddReward(false)}
        >
          <div
            className="bg-[#FFF9EF] dark:bg-[#1B2E27] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#DEDDD0] dark:border-[#3A5B4F] space-y-4 max-h-[85vh] overflow-y-auto text-[#304D42] dark:text-[#FFF9EF]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#DEDDD0] dark:border-[#3A5B4F]">
              <h3 className="text-sm font-bold tracking-tight">Tambah Hadiah Baru</h3>
              <button
                onClick={() => setShowAddReward(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF] hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer"
                aria-label="Tutup modal"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateReward} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                  Nama Hadiah
                </label>
                <input
                  type="text"
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] placeholder-[#797D6E] dark:placeholder-[#BAC0B3] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                  placeholder="Contoh: Pembatas Buku Eksklusif Gibry"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                  Deskripsi Hadiah
                </label>
                <textarea
                  value={rewardDesc}
                  onChange={(e) => setRewardDesc(e.target.value)}
                  className="min-h-[70px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] placeholder-[#797D6E] dark:placeholder-[#BAC0B3] focus:outline-none focus:ring-2 focus:ring-[#94492C] resize-none"
                  placeholder="Keterangan hadiah atau syarat penukaran..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                  Kategori Hadiah
                </label>
                <select
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value as typeof rewardType)}
                  className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                >
                  <option value="physical_prize">Hadiah Fisik (Alat Tulis, Merchandise)</option>
                  <option value="priority_borrow">Prioritas Pinjam Buku Populer</option>
                  <option value="extended_deadline">Perpanjangan Batas Pinjam</option>
                  <option value="badge">Lencana Kehormatan Siswa</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                    Harga Poin
                  </label>
                  <input
                    type="number"
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(Number(e.target.value))}
                    className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                    Jumlah Stok
                  </label>
                  <input
                    type="number"
                    value={rewardStock}
                    onChange={(e) => setRewardStock(Number(e.target.value))}
                    className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DEDDD0] dark:border-[#3A5B4F]">
                <button
                  type="button"
                  onClick={() => setShowAddReward(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingReward || !rewardTitle.trim()}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#304D42] dark:bg-[#9E5336] hover:opacity-90 disabled:opacity-50 text-[#FFF9EF] text-xs font-bold transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {creatingReward ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Tambahkan Hadiah</span>
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
