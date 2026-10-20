import React from "react";
import {
  Key,
  Copy,
  Check,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { AdminCard, AdminCardHeader, AdminCardContent } from "../shared/AdminCard";
import { AdminBadge } from "../shared/AdminBadge";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import type { InvitationCode } from "@/lib/firestore";

interface InvitationsTabProps {
  invitationCodes: InvitationCode[];
  loading: boolean;
  copiedCodeId: string | null;
  onCopyCode: (code: string, id: string) => void;
  onCopyAllUnusedCodes: () => void;
  onToggleCodeActive: (id: string, currentActive: boolean) => void;
  onOpenGenerateModal: () => void;
}

export function InvitationsTab({
  invitationCodes,
  loading,
  copiedCodeId,
  onCopyCode,
  onCopyAllUnusedCodes,
  onToggleCodeActive,
  onOpenGenerateModal,
}: InvitationsTabProps) {
  const availableCount = invitationCodes.filter((c) => !c.usedBy && c.isActive).length;

  return (
    <div className="space-y-4 max-w-5xl">
      <AdminCard>
        <AdminCardHeader
          title="Kode Undangan Pendaftaran Siswa"
          subtitle="Siswa hanya dapat membuat akun menggunakan kode resmi sekolah untuk memastikan lingkungan literasi aman"
          badge={
            <AdminBadge variant={availableCount > 0 ? "sage" : "ochre"} dot={true}>
              {availableCount} Kode Siap Pakai
            </AdminBadge>
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onCopyAllUnusedCodes}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#2C473D] hover:bg-[#E8EBDF] dark:hover:bg-[#37564A] text-[#304D42] dark:text-[#FFF9EF] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Copy size={14} />
                <span>Salin Semua Kode Tersedia</span>
              </button>

              <button
                type="button"
                onClick={onOpenGenerateModal}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#304D42] dark:bg-[#C57B5F] hover:opacity-90 text-[#FFF9EF] text-xs font-bold transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={15} />
                <span>Buat Kode Baru</span>
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
          Memuat daftar kode undangan...
        </AdminCard>
      ) : invitationCodes.length === 0 ? (
        <AdminCard className="p-12 text-center">
          <AdminEmptyState
            icon={Key}
            title="Belum Ada Kode Undangan"
            description="Buat kode undangan baru per kelas untuk dibagikan kepada wali kelas atau siswa baru saat tahun ajaran dimulai."
            action={{ label: "Buat Kode Pertama", onClick: onOpenGenerateModal, icon: Plus }}
          />
        </AdminCard>
      ) : (
        <AdminCard>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DEDDD0] dark:border-[#3A5B4F] text-[#797D6E] dark:text-[#BAC0B3]">
                  <th className="py-2.5 px-3.5 font-semibold">Kode Undangan</th>
                  <th className="py-2.5 px-3 font-semibold">Kelas / Peruntukan</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Pengguna</th>
                  <th className="py-2.5 px-3 font-semibold">Batas Berlaku</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DEDDD0]/60 dark:divide-[#3A5B4F]/60">
                {invitationCodes.map((c) => {
                  const isCopied = copiedCodeId === c.id;
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-[#FFF9EF]/80 dark:hover:bg-[#1B2E27]/50 transition-colors"
                    >
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2 font-mono font-bold text-sm text-[#304D42] dark:text-[#FFF9EF]">
                          <span>{c.code}</span>
                          <button
                            type="button"
                            onClick={() => onCopyCode(c.code, c.id)}
                            className="p-1 rounded-md text-[#797D6E] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF] hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer"
                            title="Salin kode"
                            aria-label={`Salin kode ${c.code}`}
                          >
                            {isCopied ? (
                              <Check size={14} className="text-[#304D42] dark:text-[#DCE2CD]" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#304D42] dark:text-[#FFF9EF]">
                        {c.kelas}
                      </td>
                      <td className="py-3 px-3">
                        {c.usedBy ? (
                          <AdminBadge variant="neutral">Sudah Terpakai</AdminBadge>
                        ) : !c.isActive ? (
                          <AdminBadge variant="terracotta">Dinonaktifkan</AdminBadge>
                        ) : (
                          <AdminBadge variant="sage" dot={true}>
                            Tersedia
                          </AdminBadge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[#797D6E] dark:text-[#BAC0B3]">
                        {c.usedBy ? (
                          <div>
                            <p className="font-semibold text-[#304D42] dark:text-[#FFF9EF]">
                              UID: {c.usedBy.slice(0, 8)}...
                            </p>
                            <p className="text-[10px]">
                              {new Date(c.usedAt || 0).toLocaleDateString("id-ID")}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[11px]">Belum Digunakan</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[#797D6E] dark:text-[#BAC0B3]">
                        {new Date(c.expiresAt).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {!c.usedBy && (
                          <button
                            type="button"
                            onClick={() => onToggleCodeActive(c.id, c.isActive)}
                            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                              c.isActive
                                ? "text-[#AD6549] dark:text-[#C57B5F] hover:bg-[#AD6549]/10"
                                : "text-[#304D42] dark:text-[#DCE2CD] hover:bg-[#E8EBDF]"
                            }`}
                          >
                            {c.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
