import React, { useState } from "react";
import { Flag, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { submitContentReport } from "../lib/firestore";
import type { ContentReport } from "../lib/types/moderation";

interface ReportButtonProps {
  targetType: ContentReport["targetType"];
  targetId: string;
  targetUserId: string;
  targetUserName: string;
  contentSnapshot: string;
  className?: string;
  iconSize?: number;
}

const REPORT_REASONS: { value: ContentReport["reason"]; label: string; desc: string }[] = [
  { value: "kata_kasar", label: "Kata Kasar / Tidak Pantas", desc: "Menggunakan kata kotor, makian, atau penghinaan" },
  { value: "bullying", label: "Perundungan (Bullying)", desc: "Menyerang, mengintimidasi, atau mempermalukan siswa" },
  { value: "sara", label: "SARA / Kebencian", desc: "Ujaran kebencian berbasis suku, agama, ras, antargolongan" },
  { value: "spam", label: "Spam / Pengulangan", desc: "Pesan berulang atau iklan yang mengganggu" },
  { value: "impersonasi", label: "Meniru Identitas", desc: "Mengaku sebagai siswa/guru/pihak lain" },
  { value: "lainnya", label: "Pelanggaran Lainnya", desc: "Pelanggaran tata tertib sekolah lainnya" },
];

export const ReportButton: React.FC<ReportButtonProps> = ({
  targetType,
  targetId,
  targetUserId,
  targetUserName,
  contentSnapshot,
  className = "",
  iconSize = 15,
}) => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ContentReport["reason"]>("kata_kasar");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Do not report self
  if (!user || user.uid === targetUserId) {
    return null;
  }

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
    setDescription("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      await submitContentReport({
        reporterId: user.uid,
        reporterName: profile?.nama || user.email || "Siswa",
        targetType,
        targetId,
        targetUserId,
        targetUserName,
        contentSnapshot: contentSnapshot.slice(0, 500),
        reason,
        description: description.trim() || undefined,
        status: "pending",
      });

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Gagal mengirim laporan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="Laporkan konten ini"
        className={`inline-flex items-center justify-center text-stone-400 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 ${className}`}
      >
        <Flag size={iconSize} />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2 text-rose-600 dark:rose-400 font-semibold">
                <AlertTriangle size={18} />
                <span>Laporkan Konten</span>
              </div>
              <button
                onClick={handleClose}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {success ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500 animate-bounce" />
                <h4 className="text-base font-semibold text-stone-800 dark:text-stone-100">
                  Laporan Berhasil Terkirim
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Terima kasih sudah membantu menjaga lingkungan perpustakaan tetap aman dan nyaman.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200/60 dark:border-stone-700/50 text-xs">
                  <span className="text-stone-400 block mb-0.5">Pengguna yang dilaporkan:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    {targetUserName}
                  </span>
                  {contentSnapshot && (
                    <p className="mt-1 text-stone-600 dark:text-stone-300 italic line-clamp-2 border-l-2 border-rose-300 pl-2">
                      "{contentSnapshot}"
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                    Alasan Pelaporan:
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {REPORT_REASONS.map((r) => (
                      <label
                        key={r.value}
                        className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          reason === r.value
                            ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                            : "bg-white dark:bg-stone-850 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                        }`}
                      >
                        <input
                          type="radio"
                          name="reportReason"
                          value={r.value}
                          checked={reason === r.value}
                          onChange={() => setReason(r.value)}
                          className="mt-0.5 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium">{r.label}</div>
                          <div className="text-[11px] text-stone-400 dark:text-stone-400">
                            {r.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Keterangan Tambahan (Opsional):
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={300}
                    rows={2}
                    placeholder="Ceritakan konteks kejadian..."
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 outline-hidden"
                  />
                </div>

                {error && (
                  <div className="text-xs text-rose-600 dark:rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="px-4 py-2 text-xs font-medium rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-xs font-medium rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
                  >
                    {loading ? "Mengirim..." : "Kirim Laporan"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
