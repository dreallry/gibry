import React from "react";
import {
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Ban,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { AdminCard, AdminCardHeader, AdminCardContent } from "../shared/AdminCard";
import { AdminBadge } from "../shared/AdminBadge";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import type { ContentReport } from "@/lib/firestore";

interface ModerationTabProps {
  reports: ContentReport[];
  loading: boolean;
  filter: "pending" | "all";
  onFilterChange: (filter: "pending" | "all") => void;
  processingReportId: string | null;
  onProcessReport: (reportId: string, action: string, note: string) => void;
  onBanReportedUser: (report: ContentReport) => void;
}

export function ModerationTab({
  reports,
  loading,
  filter,
  onFilterChange,
  processingReportId,
  onProcessReport,
  onBanReportedUser,
}: ModerationTabProps) {
  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const filteredReports =
    filter === "pending" ? reports.filter((r) => r.status === "pending") : reports;

  return (
    <div className="space-y-4 max-w-5xl">
      <AdminCard>
        <AdminCardHeader
          title="Moderasi Konten & Ulasan Komunitas"
          subtitle="Tinjau laporan dugaan kata kasar, ujaran tidak pantas, atau pelanggaran norma dari siswa"
          badge={
            <AdminBadge variant={pendingCount > 0 ? "terracotta" : "sage"} dot={true}>
              {pendingCount > 0 ? `${pendingCount} Perlu Ditinjau` : "Semua Bersih"}
            </AdminBadge>
          }
          action={
            <div className="flex bg-[#F2ECDF] dark:bg-[#1B2E27] p-1 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F]">
              <button
                type="button"
                onClick={() => onFilterChange("pending")}
                className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filter === "pending"
                    ? "bg-[#FFF9EF] dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs font-bold"
                    : "text-[#797D6E] dark:text-[#BAC0B3]"
                }`}
              >
                Menunggu ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => onFilterChange("all")}
                className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filter === "all"
                    ? "bg-[#FFF9EF] dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs font-bold"
                    : "text-[#797D6E] dark:text-[#BAC0B3]"
                }`}
              >
                Semua ({reports.length})
              </button>
            </div>
          }
        />
      </AdminCard>

      {loading ? (
        <AdminCard className="p-12 text-center text-xs text-[#797D6E] dark:text-[#BAC0B3]">
          <Loader2
            size={24}
            className="animate-spin mx-auto mb-2 text-[#304D42] dark:text-[#FFF9EF]"
          />
          Memuat data laporan moderasi...
        </AdminCard>
      ) : filteredReports.length === 0 ? (
        <AdminCard className="p-12 text-center">
          <AdminEmptyState
            icon={CheckCircle2}
            title="Tidak Ada Laporan yang Menunggu"
            description="Lingkungan komunitas perpustakaan terpantau aman dan tertib. Semua laporan telah selesai diverifikasi."
          />
        </AdminCard>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((rep) => {
            const isPending = rep.status === "pending";
            return (
              <AdminCard key={rep.id} className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider bg-[#F2ECDF] dark:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF] border border-[#DEDDD0] dark:border-[#3A5B4F]">
                      {rep.reason.replace("_", " ")}
                    </span>
                    <span className="text-[11px] text-[#797D6E] dark:text-[#BAC0B3]">
                      Tipe: <strong>{rep.targetType}</strong>
                    </span>
                    <AdminBadge
                      variant={
                        rep.status === "pending"
                          ? "ochre"
                          : rep.status === "action_taken"
                            ? "terracotta"
                            : "neutral"
                      }
                      dot={true}
                    >
                      {rep.status === "pending"
                        ? "Menunggu Verifikasi"
                        : rep.status === "action_taken"
                          ? "Ditindaklanjuti"
                          : "Diabaikan"}
                    </AdminBadge>
                  </div>
                  <span className="text-[11px] text-[#797D6E] dark:text-[#BAC0B3]">
                    {new Date(rep.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>

                {/* Konten yang Dilaporkan */}
                <div className="p-3.5 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#FFF9EF]/80 dark:bg-[#1B2E27]/60 space-y-1.5 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#797D6E] dark:text-[#BAC0B3]">
                    Kutipan Konten yang Dilaporkan:
                  </p>
                  <p className="italic font-serif text-[#304D42] dark:text-[#FFF9EF]">
                    "{rep.contentSnapshot}"
                  </p>
                  {rep.description && (
                    <p className="text-[11px] text-[#797D6E] dark:text-[#BAC0B3] pt-1.5 border-t border-[#DEDDD0] dark:border-[#3A5B4F]">
                      <strong>Catatan pelapor:</strong> {rep.description}
                    </p>
                  )}
                </div>

                {/* Info Pengguna & Tombol Tindakan */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#DEDDD0] dark:border-[#3A5B4F]">
                  <div className="text-xs">
                    <p className="text-[#304D42] dark:text-[#FFF9EF]">
                      Pengguna dilaporkan: <strong>{rep.targetUserName}</strong>{" "}
                      <span className="text-[10px] text-[#797D6E] dark:text-[#BAC0B3]">
                        ({rep.targetUserId.slice(0, 8)})
                      </span>
                    </p>
                    <p className="text-[11px] text-[#797D6E] dark:text-[#BAC0B3]">
                      Dilaporkan oleh: {rep.reporterName}
                    </p>
                  </div>

                  {isPending && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={processingReportId === rep.id}
                        onClick={() =>
                          onProcessReport(
                            rep.id,
                            "none",
                            "Konten dinilai wajar dan tidak melanggar tata tertib"
                          )
                        }
                        className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] transition-colors cursor-pointer"
                      >
                        Abaikan
                      </button>
                      <button
                        type="button"
                        disabled={processingReportId === rep.id}
                        onClick={() =>
                          onProcessReport(
                            rep.id,
                            "content_deleted",
                            "Konten melanggar norma dan telah dihapus"
                          )
                        }
                        className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[#AD6549]/30 bg-[#AD6549]/15 dark:bg-[#C57B5F]/20 text-[#AD6549] dark:text-[#C57B5F] hover:bg-[#AD6549]/25 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 size={13} />
                        <span>Hapus Konten</span>
                      </button>
                      <button
                        type="button"
                        disabled={processingReportId === rep.id}
                        onClick={() => onBanReportedUser(rep)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-[#B54A35] text-white hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Ban size={13} />
                        <span>Blokir Siswa</span>
                      </button>
                    </div>
                  )}
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
