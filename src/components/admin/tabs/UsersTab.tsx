import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  Download,
  Ban,
  CheckCircle2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Key,
  Copy,
  Plus,
  Check,
} from "lucide-react";
import { AdminCard, AdminCardHeader, AdminCardContent } from "../shared/AdminCard";
import { AdminBadge } from "../shared/AdminBadge";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import { exportToCsv } from "../shared/csvExport";
import type { UserProfile, InvitationCode } from "@/lib/firestore";
import { useAdmin } from "@/hooks/useAdmin";

interface UsersTabProps {
  users: UserProfile[];
  loading: boolean;
  onRequestBanUser: (user: UserProfile) => void;
  onRequestUnbanUser: (user: UserProfile) => void;
  onRequestUpdateRole: (user: UserProfile, newRole: "admin" | "librarian" | "viewer" | "user") => void;
  onRequestTruncateUsers: () => void;
  // Integrasi Kode Undangan
  invitationCodes?: InvitationCode[];
  loadingCodes?: boolean;
  copiedCodeId?: string | null;
  onCopyCode?: (code: string, id: string) => void;
  onCopyAllUnusedCodes?: () => void;
  onToggleCodeActive?: (id: string, currentActive: boolean) => void;
  onOpenGenerateCodeModal?: () => void;
}

export function UsersTab({
  users,
  loading,
  onRequestBanUser,
  onRequestUnbanUser,
  onRequestUpdateRole,
  onRequestTruncateUsers,
  invitationCodes = [],
  loadingCodes = false,
  copiedCodeId = null,
  onCopyCode,
  onCopyAllUnusedCodes,
  onToggleCodeActive,
  onOpenGenerateCodeModal,
}: UsersTabProps) {
  const { isSuperAdmin, canManageRoles } = useAdmin();

  const [activeSubTab, setActiveSubTab] = useState<"members" | "invitations">("members");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter siswa/pengguna
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        u.nama?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.kelas?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q);

      const userRole = u.role || "user";
      const matchRole = roleFilter === "all" ? true : userRole === roleFilter;

      return matchQuery && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Paginasi
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Ekspor CSV aman
  const handleExportCsv = () => {
    exportToCsv(
      filteredUsers,
      [
        { header: "UID", accessor: (u) => u.uid },
        { header: "Nama Lengkap", accessor: (u) => u.nama },
        { header: "Username", accessor: (u) => u.username || "" },
        { header: "Email", accessor: (u) => u.email },
        { header: "Kelas", accessor: (u) => u.kelas || "" },
        { header: "Peran Akun", accessor: (u) => u.role || "user" },
        { header: "Poin Literasi", accessor: (u) => u.totalPoints || 0 },
        { header: "Status Pemblokiran", accessor: (u) => (u.banned ? "Diblokir" : "Aktif") },
      ],
      `data-siswa-gibry-${new Date().toISOString().slice(0, 10)}`
    );
  };

  const unusedCodeCount = invitationCodes.filter((c) => !c.usedBy && c.isActive).length;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header & Sub-Tab Keanggotaan */}
      <AdminCard>
        <div className="p-4 sm:p-5 border-b border-[#DEDDD0] dark:border-[#3A5B4F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#304D42] dark:text-[#FFF9EF] tracking-tight">
              Keanggotaan & Akun Siswa
            </h2>
            <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] mt-0.5">
              Kelola data keanggotaan siswa perpustakaan dan kode undangan pendaftaran resmi sekolah.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeSubTab === "members" && (
              <button
                onClick={handleExportCsv}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs font-semibold text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] dark:hover:bg-[#2C473D] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Unduh data siswa dalam format CSV aman"
              >
                <Download size={14} />
                <span>Ekspor CSV</span>
              </button>
            )}

            {activeSubTab === "invitations" && onOpenGenerateCodeModal && (
              <button
                onClick={onOpenGenerateCodeModal}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] text-xs font-bold transition-opacity hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={15} />
                <span>Buat Kode Baru</span>
              </button>
            )}

            {isSuperAdmin && activeSubTab === "members" && (
              <button
                onClick={onRequestTruncateUsers}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#F1D2C8] dark:border-[#5C392D] bg-[#FDF2EE] dark:bg-[#3D251D] text-xs font-bold text-[#94492C] dark:text-[#EAA48F] hover:bg-[#FBE4DD] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Hapus data uji coba"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Kosongkan Akun Uji</span>
              </button>
            )}
          </div>
        </div>

        {/* 2 Segment Tab: Data Siswa & Kode Undangan */}
        <div className="p-4 sm:p-5 border-b border-[#DEDDD0] dark:border-[#3A5B4F]">
          <div className="flex bg-[#EFECE4] dark:bg-[#1B2E27] p-1 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] max-w-md">
            <button
              onClick={() => setActiveSubTab("members")}
              className={`min-h-[38px] flex-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === "members"
                  ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs"
                  : "text-[#565D4F] dark:text-[#BAC0B3]"
              }`}
            >
              <Users size={14} />
              <span>Daftar Siswa ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab("invitations")}
              className={`min-h-[38px] flex-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === "invitations"
                  ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs"
                  : "text-[#565D4F] dark:text-[#BAC0B3]"
              }`}
            >
              <Key size={14} />
              <span>Kode Undangan ({unusedCodeCount})</span>
            </button>
          </div>
        </div>

        {/* Filter jika di Sub-Tab Daftar Siswa */}
        {activeSubTab === "members" && (
          <AdminCardContent className="pt-3 pb-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs font-semibold text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
              >
                <option value="all">Semua Wewenang</option>
                <option value="user">Siswa Saja</option>
                <option value="librarian">Pustakawan</option>
                <option value="viewer">Pemeriksa Laporan</option>
                <option value="admin">Administrator</option>
              </select>

              <div className="relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#565D4F] dark:text-[#BAC0B3]"
                  size={15}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari nama siswa, email, kelas..."
                  className="min-h-[44px] w-full sm:w-72 pl-9 pr-3.5 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs text-[#304D42] dark:text-[#FFF9EF] placeholder-[#565D4F] dark:placeholder-[#BAC0B3] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                />
              </div>
            </div>
          </AdminCardContent>
        )}
      </AdminCard>

      {/* Konten Sub-Tab 1: Daftar Siswa */}
      {activeSubTab === "members" && (
        <>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF]/70 dark:bg-[#233B32] animate-pulse"
                />
              ))}
            </div>
          ) : paginatedUsers.length === 0 ? (
            <AdminEmptyState
              icon={Users}
              title="Tidak Ada Siswa Ditemukan"
              description={
                searchQuery || roleFilter !== "all"
                  ? "Tidak ada akun siswa yang sesuai dengan filter atau kata kunci pencarian Anda."
                  : "Belum ada data siswa terdaftar di database perpustakaan."
              }
            />
          ) : (
            <div className="space-y-2.5">
              {paginatedUsers.map((user) => {
                const userRole = user.role || "user";
                const roleBadgeVariant =
                  userRole === "admin"
                    ? "primary"
                    : userRole === "librarian"
                      ? "info"
                      : userRole === "viewer"
                        ? "warning"
                        : "neutral";

                return (
                  <AdminCard
                    key={user.uid}
                    className="p-3.5 sm:p-4 hover:shadow-2xs transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Foto Profil & Info Siswa */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            user.nama?.charAt(0) || "S"
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-[#304D42] dark:text-[#FFF9EF] truncate">
                              {user.nama}
                            </p>
                            {user.banned && (
                              <AdminBadge variant="danger">Diblokir</AdminBadge>
                            )}
                          </div>
                          <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] truncate">
                            {user.email} {user.kelas ? `• Kelas ${user.kelas}` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Peran dan Tindakan */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#DEDDD0] dark:border-[#3A5B4F]">
                        <div className="flex items-center gap-2">
                          <AdminBadge variant={roleBadgeVariant} dot={false}>
                            {userRole === "admin"
                              ? "Administrator"
                              : userRole === "librarian"
                                ? "Pustakawan"
                                : userRole === "viewer"
                                  ? "Pemeriksa"
                                  : "Siswa"}
                          </AdminBadge>

                          <span className="text-xs text-[#565D4F] dark:text-[#BAC0B3]">
                            {user.totalPoints || 0} XP
                          </span>
                        </div>

                        {/* Kelola Peran & Blokir Akun */}
                        {canManageRoles && (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={userRole}
                              onChange={(e) =>
                                onRequestUpdateRole(
                                  user,
                                  e.target.value as "admin" | "librarian" | "viewer" | "user"
                                )
                              }
                              className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs font-semibold text-[#304D42] dark:text-[#FFF9EF] focus:outline-none"
                              title="Ubah peran akun"
                            >
                              <option value="user">Siswa</option>
                              <option value="viewer">Pemeriksa</option>
                              <option value="librarian">Pustakawan</option>
                              <option value="admin">Admin</option>
                            </select>

                            {user.banned ? (
                              <button
                                onClick={() => onRequestUnbanUser(user)}
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#E8EBDF] dark:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#dce2cd] transition-colors cursor-pointer"
                                title="Buka blokir akun"
                                aria-label="Buka blokir akun"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => onRequestBanUser(user)}
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl border border-[#F1D2C8] dark:border-[#5C392D] bg-[#FDF2EE] dark:bg-[#3D251D] text-[#94492C] dark:text-[#EAA48F] hover:bg-[#FBE4DD] transition-colors cursor-pointer"
                                title="Blokir akun"
                                aria-label="Blokir akun"
                              >
                                <Ban size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </AdminCard>
                );
              })}

              {/* Kontrol Paginasi */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 text-xs text-[#565D4F] dark:text-[#BAC0B3]">
                  <p>
                    Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                    {Math.min(currentPage * pageSize, filteredUsers.length)} dari{" "}
                    {filteredUsers.length} pengguna
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg border border-[#DEDDD0] dark:border-[#3A5B4F] disabled:opacity-40 hover:bg-[#E8EBDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer disabled:cursor-not-allowed"
                      aria-label="Halaman sebelumnya"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="px-2 font-bold text-[#304D42] dark:text-[#FFF9EF]">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg border border-[#DEDDD0] dark:border-[#3A5B4F] disabled:opacity-40 hover:bg-[#E8EBDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer disabled:cursor-not-allowed"
                      aria-label="Halaman selanjutnya"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Konten Sub-Tab 2: Kode Undangan Siswa */}
      {activeSubTab === "invitations" && (
        <AdminCard>
          <div className="p-4 sm:p-5 border-b border-[#DEDDD0] dark:border-[#3A5B4F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#304D42] dark:text-[#FFF9EF]">
                Daftar Kode Undangan Registrasi
              </h3>
              <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] mt-0.5">
                Bagikan kode ini kepada siswa atau wali kelas untuk pendaftaran mandiri.
              </p>
            </div>

            {onCopyAllUnusedCodes && (
              <button
                type="button"
                onClick={onCopyAllUnusedCodes}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-[#304D42] dark:text-[#FFF9EF] text-xs font-semibold hover:bg-[#E8EBDF] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Copy size={14} />
                <span>Salin Semua Kode Siap Pakai</span>
              </button>
            )}
          </div>

          <div className="p-4 sm:p-5">
            {loadingCodes ? (
              <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] text-center py-8">
                Memuat data kode undangan...
              </p>
            ) : invitationCodes.length === 0 ? (
              <AdminEmptyState
                icon={Key}
                title="Belum Ada Kode Undangan"
                description="Buat kode undangan baru per kelas untuk dibagikan saat tahun ajaran dimulai."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#EFECE4]/60 dark:bg-[#233B32]/70 text-[#565D4F] dark:text-[#BAC0B3]">
                      <th className="py-3 px-3.5 font-bold">Kode Undangan</th>
                      <th className="py-3 px-3.5 font-bold">Kelas / Peruntukan</th>
                      <th className="py-3 px-3.5 font-bold">Status</th>
                      <th className="py-3 px-3.5 font-bold">Pendaftar</th>
                      <th className="py-3 px-3.5 font-bold text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DEDDD0] dark:divide-[#3A5B4F]">
                    {invitationCodes.map((c) => {
                      const isCopied = copiedCodeId === c.id;
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-[#F2ECDF]/50 dark:hover:bg-[#233B32]/40 transition-colors"
                        >
                          <td className="py-3 px-3.5">
                            <span className="font-mono font-bold text-xs text-[#304D42] dark:text-[#FFF9EF] tracking-wider">
                              {c.code}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-[#304D42] dark:text-[#FFF9EF]">
                            {c.kelas || "Umum"}
                          </td>
                          <td className="py-3 px-3.5">
                            {c.usedBy ? (
                              <AdminBadge variant="neutral">Sudah Dipakai</AdminBadge>
                            ) : c.isActive ? (
                              <AdminBadge variant="success">Tersedia</AdminBadge>
                            ) : (
                              <AdminBadge variant="danger">Nonaktif</AdminBadge>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-[#565D4F] dark:text-[#BAC0B3]">
                            {c.usedBy || "-"}
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!c.usedBy && onCopyCode && (
                                <button
                                  onClick={() => onCopyCode(c.code, c.id)}
                                  className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs font-semibold hover:bg-[#E8EBDF] transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Salin kode"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check size={12} className="text-[#304D42] dark:text-[#FFF9EF]" />
                                      <span className="text-[10px] text-[#304D42] dark:text-[#FFF9EF]">Tersalin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span className="text-[10px]">Salin</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {!c.usedBy && onToggleCodeActive && (
                                <button
                                  onClick={() => onToggleCodeActive(c.id, c.isActive)}
                                  className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-[10px] font-semibold text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF] hover:bg-[#E8EBDF] transition-colors cursor-pointer"
                                >
                                  {c.isActive ? "Nonaktifkan" : "Aktifkan"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AdminCard>
      )}
    </div>
  );
}
