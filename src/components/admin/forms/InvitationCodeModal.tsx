import { Loader2, X, Key } from "lucide-react";
import type { useAdminInvitations } from "@/hooks/admin/useAdminInvitations";

type Props = Pick<
  ReturnType<typeof useAdminInvitations>,
  | "showGenCodeModal"
  | "setShowGenCodeModal"
  | "codeClass"
  | "setCodeClass"
  | "setCodeBatchCount"
  | "codeBatchCount"
  | "generatingCodes"
  | "handleGenerateCodes"
>;

export function InvitationCodeModal({
  showGenCodeModal,
  setShowGenCodeModal,
  codeClass,
  setCodeClass,
  setCodeBatchCount,
  codeBatchCount,
  generatingCodes,
  handleGenerateCodes,
}: Props) {
  return (
    <>
      {showGenCodeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setShowGenCodeModal(false)}
        >
          <div
            className="bg-[#FFF9EF] dark:bg-[#1B2E27] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#DEDDD0] dark:border-[#3A5B4F] space-y-4 text-[#304D42] dark:text-[#FFF9EF]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#DEDDD0] dark:border-[#3A5B4F]">
              <div className="flex items-center gap-2">
                <Key size={18} className="text-[#AD6549] dark:text-[#C57B5F]" />
                <h3 className="text-sm font-bold tracking-tight">Generate Kode Undangan Siswa</h3>
              </div>
              <button
                onClick={() => setShowGenCodeModal(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#797D6E] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF] hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer"
                aria-label="Tutup modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                  Kelas / Peruntukan
                </label>
                <select
                  value={codeClass}
                  onChange={(e) => setCodeClass(e.target.value)}
                  className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                >
                  {[
                    "X PPLG 1", "X PPLG 2", "X DKV 1", "X DKV 2", "X TJKT 1", "X TJKT 2",
                    "XI PPLG 1", "XI PPLG 2", "XI DKV 1", "XI DKV 2", "XI TJKT 1", "XI TJKT 2",
                    "XII RPL 1", "XII RPL 2", "XII DKV 1", "XII DKV 2", "XII TKJ 1", "XII TKJ 2",
                    "Guru / Tendik", "Umum"
                  ].map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1.5 text-[#304D42] dark:text-[#FFF9EF]">
                  Jumlah Kode yang Dibuat
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 5, 10, 35].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setCodeBatchCount(cnt)}
                      className={`min-h-[40px] py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${codeBatchCount === cnt
                          ? "bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] border-[#304D42] dark:border-[#C57B5F] shadow-2xs"
                          : "bg-[#F2ECDF] dark:bg-[#233B32] border-[#DEDDD0] dark:border-[#3A5B4F] text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF]"
                        }`}
                    >
                      {cnt} {cnt === 35 ? "(1 Kelas)" : "Kode"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#F2ECDF]/70 dark:bg-[#233B32] rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] text-[#565D4F] dark:text-[#BAC0B3] text-[11px] leading-relaxed">
                Setiap kode bersifat sekali pakai per siswa dan akan mengunci identitas kelas secara otomatis saat pendaftaran. Berlaku selama 30 hari.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DEDDD0] dark:border-[#3A5B4F]">
              <button
                type="button"
                onClick={() => setShowGenCodeModal(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={generatingCodes}
                onClick={handleGenerateCodes}
                className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold bg-[#304D42] dark:bg-[#9E5336] hover:opacity-90 disabled:opacity-50 text-[#FFF9EF] transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {generatingCodes ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
                <span>{generatingCodes ? "Membuat Kode..." : `Generate ${codeBatchCount} Kode`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
