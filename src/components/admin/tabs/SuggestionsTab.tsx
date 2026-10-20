import React, { useState } from "react";
import {
  Lightbulb,
  ThumbsUp,
  Check,
  X,
  Trash2,
  BookOpen,
  Loader2,
} from "lucide-react";
import { AdminCard, AdminCardHeader, AdminCardContent } from "../shared/AdminCard";
import { AdminBadge } from "../shared/AdminBadge";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import type { BookSuggestion } from "@/lib/firestore";

interface SuggestionsTabProps {
  suggestions: BookSuggestion[];
  loading: boolean;
  processingSuggestionId: string | null;
  onUpdateSuggestion: (
    suggestionId: string,
    status: BookSuggestion["status"],
    note?: string
  ) => void;
  onDeleteSuggestion: (suggestionId: string) => void;
}

export function SuggestionsTab({
  suggestions,
  loading,
  processingSuggestionId,
  onUpdateSuggestion,
  onDeleteSuggestion,
}: SuggestionsTabProps) {
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const pendingCount = suggestions.filter((s) => s.status === "open").length;

  return (
    <div className="space-y-4 max-w-5xl">
      <AdminCard>
        <AdminCardHeader
          title="Usulan Pengadaan Buku dari Siswa"
          subtitle="Daftar buku yang diajukan oleh siswa beserta dukungan suara dari sesama pembaca"
          badge={
            <AdminBadge variant={pendingCount > 0 ? "ochre" : "sage"} dot={true}>
              {pendingCount > 0 ? `${pendingCount} Menunggu Keputusan` : "Semua Terproses"}
            </AdminBadge>
          }
        />
      </AdminCard>

      {loading ? (
        <AdminCard className="p-12 text-center text-xs text-[#797D6E] dark:text-[#BAC0B3]">
          <Loader2
            size={24}
            className="animate-spin mx-auto mb-2 text-[#304D42] dark:text-[#FFF9EF]"
          />
          Memuat data usulan buku...
        </AdminCard>
      ) : suggestions.length === 0 ? (
        <AdminCard className="p-12 text-center">
          <AdminEmptyState
            icon={Lightbulb}
            title="Belum Ada Usulan Buku"
            description="Siswa dapat mengusulkan judul buku yang mereka minati melalui aplikasi untuk dipertimbangkan dalam pengadaan koleksi perpustakaan."
          />
        </AdminCard>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => {
            const isProcessing = processingSuggestionId === s.id;
            return (
              <AdminCard key={s.id} className="p-5 space-y-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#304D42] dark:text-[#FFF9EF]">
                        {s.title}
                      </h4>
                      <span className="text-xs text-[#797D6E] dark:text-[#BAC0B3]">
                        oleh {s.author}
                      </span>
                    </div>
                    <p className="text-xs text-[#797D6E] dark:text-[#BAC0B3] leading-relaxed">
                      <strong>Alasan siswa:</strong> "{s.reason}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-xl bg-[#F2ECDF] dark:bg-[#2C473D] border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-bold text-[#304D42] dark:text-[#FFF9EF] flex items-center gap-1.5 shadow-2xs">
                      <ThumbsUp size={13} className="text-[#AD6549] dark:text-[#C57B5F]" />
                      <span>{s.voteCount || 0} Dukungan</span>
                    </div>

                    <AdminBadge
                      variant={
                        s.status === "accepted"
                          ? "sage"
                          : s.status === "acquired"
                            ? "primary"
                            : s.status === "rejected"
                              ? "terracotta"
                              : "ochre"
                      }
                      dot={true}
                    >
                      {s.status === "accepted"
                        ? "Disetujui"
                        : s.status === "acquired"
                          ? "Tersedia di Rak"
                          : s.status === "rejected"
                            ? "Ditolak"
                            : "Menunggu"}
                    </AdminBadge>
                  </div>
                </div>

                {/* Info Siswa & Catatan */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#DEDDD0] dark:border-[#3A5B4F] text-xs">
                  <div className="text-[11px] text-[#797D6E] dark:text-[#BAC0B3]">
                    Diusulkan oleh:{" "}
                    <strong className="text-[#304D42] dark:text-[#FFF9EF]">
                      {s.userName}
                    </strong>{" "}
                    pada {new Date(s.createdAt).toLocaleDateString("id-ID")}
                    {s.adminNote && (
                      <span className="block mt-0.5 text-[#304D42] dark:text-[#FFF9EF] italic">
                        Catatan petugas: {s.adminNote}
                      </span>
                    )}
                  </div>

                  {/* Tombol Aksi Meja */}
                  <div className="flex flex-wrap items-center gap-2">
                    {s.status === "open" && (
                      <>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => onUpdateSuggestion(s.id, "accepted", adminNotes[s.id])}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-[#304D42] dark:bg-[#C57B5F] hover:opacity-90 text-[#FFF9EF] transition-opacity cursor-pointer shadow-2xs flex items-center gap-1.5"
                        >
                          <Check size={14} />
                          <span>Setujui</span>
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => onUpdateSuggestion(s.id, "rejected", adminNotes[s.id])}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] transition-colors cursor-pointer"
                        >
                          Tolak
                        </button>
                      </>
                    )}

                    {s.status === "accepted" && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => onUpdateSuggestion(s.id, "acquired", "Buku telah tersedia di perpustakaan!")}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-[#304D42] dark:bg-[#C57B5F] hover:opacity-90 text-[#FFF9EF] transition-opacity cursor-pointer shadow-2xs flex items-center gap-1.5"
                      >
                        <BookOpen size={14} />
                        <span>Tandai Sudah di Rak</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => onDeleteSuggestion(s.id)}
                      className="min-h-[44px] p-2 rounded-xl text-[#797D6E] dark:text-[#BAC0B3] hover:text-[#AD6549] dark:hover:text-[#C57B5F] hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer"
                      title="Hapus usulan"
                      aria-label="Hapus usulan"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
