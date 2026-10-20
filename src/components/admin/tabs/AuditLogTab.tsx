import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  Download,
  RefreshCw,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  UserX,
  UserCheck,
  BookOpen,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";
import { AdminCard, AdminCardHeader, AdminCardContent } from "../shared/AdminCard";
import { AdminBadge, type BadgeVariant } from "../shared/AdminBadge";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import { exportToCsv } from "../shared/csvExport";
import { getAuditLogs, type AuditLogEntry } from "@/lib/firestore";
import { useAdmin } from "@/hooks/useAdmin";

export function AuditLogTab() {
  const { isSuperAdmin } = useAdmin();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionCategory, setActionCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    if (isSuperAdmin) {
      fetchLogs();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const data = await getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error("Gagal memuat catatan log audit:", err);
    } finally {
      setLoading(false);
    }
  }

  // Format label aksi dan varian badge
  function getActionMeta(action: string): { label: string; variant: BadgeVariant; icon: any } {
    switch (action) {
      case "update_role":
        return { label: "Ubah Peran Akun", variant: "primary", icon: UserCheck };
      case "ban_user":
        return { label: "Pemblokiran Siswa", variant: "danger", icon: UserX };
      case "unban_user":
        return { label: "Pengaktifan Siswa", variant: "success", icon: CheckCircle2 };
      case "pay_fine_cash":
        return { label: "Pelunasan Denda Tunai", variant: "success", icon: DollarSign };
      case "waive_fine":
        return { label: "Pemutihan Denda", variant: "info", icon: DollarSign };
      case "delete_book":
        return { label: "Penghapusan Buku", variant: "warning", icon: BookOpen };
      case "create_book":
        return { label: "Penambahan Buku", variant: "success", icon: BookOpen };
      case "update_book":
        return { label: "Pembaruan Buku", variant: "primary", icon: BookOpen };
      case "truncate_users":
        return { label: "Pengosongan Pengguna", variant: "danger", icon: AlertTriangle };
      case "process_report":
        return { label: "Tindak Lanjut Laporan", variant: "warning", icon: ShieldCheck };
      default:
        return { label: action.replace(/_/g, " "), variant: "neutral", icon: ShieldCheck };
    }
  }

  // Ringkasan detail aksi dalam bahasa Indonesia yang lugas
  function formatActionDetails(log: AuditLogEntry): string {
    const d = log.details || {};
    switch (log.action) {
      case "update_role":
        return `Mengubah peran ${d.targetUserName || "pengguna"} menjadi: ${d.newRole || "user"}`;
      case "ban_user":
        return `Memblokir akses ${d.targetUserName || "siswa"} (ID: ${d.targetUserId || "-"})`;
      case "unban_user":
        return `Mengaktifkan kembali akses ${d.targetUserName || "siswa"}`;
      case "pay_fine_cash":
        return `Pelunasan denda Rp ${Number(d.fineAmount || 0).toLocaleString("id-ID")} untuk peminjaman ${d.studentName || "siswa"}`;
      case "waive_fine":
        return `Membebaskan denda sirkulasi Rp ${Number(d.fineAmount || 0).toLocaleString("id-ID")} untuk ${d.studentName || "siswa"}`;
      case "delete_book":
        return `Menghapus judul buku "${d.bookTitle || "-"}" dari katalog`;
      case "create_book":
        return `Menambahkan buku baru "${d.bookTitle || "-"}" ke katalog`;
      case "update_book":
        return `Memperbarui data buku "${d.bookTitle || "-"}"`;
      case "truncate_users":
        return `Mengosongkan basis data: ${d.deletedCount || 0} akun non-admin dihapus`;
      case "process_report":
        return `Memproses laporan konten ID: ${d.reportId || "-"} dengan tindakan: ${d.actionTaken || "selesai"}`;
      default:
        return Object.entries(d)
          .map(([k, v]) => `${k}: ${String(v)}`)
          .join(", ") || "Tidak ada rincian tambahan";
    }
  }

  // Filter log berdasarkan pencarian teks dan kategori aksi
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const meta = getActionMeta(log.action);
      const detailStr = formatActionDetails(log).toLowerCase();
      const matchSearch =
        !q ||
        log.userName?.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        meta.label.toLowerCase().includes(q) ||
        detailStr.includes(q);

      let matchCategory = true;
      if (actionCategory === "roles") {
        matchCategory = log.action === "update_role";
      } else if (actionCategory === "security") {
        matchCategory = ["ban_user", "unban_user", "truncate_users", "process_report"].includes(log.action);
      } else if (actionCategory === "fines") {
        matchCategory = ["pay_fine_cash", "waive_fine"].includes(log.action);
      } else if (actionCategory === "books") {
        matchCategory = ["delete_book", "create_book", "update_book"].includes(log.action);
      }

      return matchSearch && matchCategory;
    });
  }, [logs, searchQuery, actionCategory]);

  // Paginasi
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const total = logs.length;
    const securityCount = logs.filter((l) =>
      ["ban_user", "unban_user", "truncate_users", "process_report"].includes(l.action)
    ).length;
    const fineCount = logs.filter((l) =>
      ["pay_fine_cash", "waive_fine"].includes(l.action)
    ).length;
    const roleCount = logs.filter((l) => l.action === "update_role").length;

    return { total, securityCount, fineCount, roleCount };
  }, [logs]);

  // Ekspor CSV Aman
  function handleExportCsv() {
    exportToCsv(
      filteredLogs,
      [
        { header: "ID Log", accessor: (l) => l.id },
        {
          header: "Waktu Pencatatan",
          accessor: (l) =>
            new Date(l.timestamp).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
        },
        { header: "Kode Aksi", accessor: (l) => l.action },
        { header: "Nama Petugas", accessor: (l) => l.userName || "Admin" },
        { header: "Rincian Tindakan", accessor: (l) => formatActionDetails(l) },
      ],
      `log-audit-sistem-${new Date().toISOString().slice(0, 10)}`
    );
  }

  if (!isSuperAdmin) {
    return (
      <AdminCard className="p-8">
        <AdminEmptyState
          icon={ShieldCheck}
          title="Akses Terbatas"
          description="Halaman Log Audit Sistem hanya dapat diakses oleh Administrator utama perpustakaan."
        />
      </AdminCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kartu Ringkasan Metrik Audit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminCard className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#797D6E] dark:text-[#BAC0B3]">
              Total Log Tercatat
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E8EBDF] dark:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF] flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#304D42] dark:text-[#FFF9EF]">
            {stats.total}
          </div>
          <p className="text-[11px] text-[#797D6E] dark:text-[#BAC0B3] mt-1">
            Riwayat administratif tersimpan
          </p>
        </AdminCard>

        <AdminCard className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
              Keamanan & Moderasi
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 flex items-center justify-center">
              <UserX size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-400">
            {stats.securityCount}
          </div>
          <p className="text-[11px] text-[#797D6E] dark:text-[#BAC0B3] mt-1">
            Blokir akun dan tindakan sistem
          </p>
        </AdminCard>

        <AdminCard className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Transaksi Denda
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {stats.fineCount}
          </div>
          <p className="text-[11px] text-[#797D6E] dark:text-[#BAC0B3] mt-1">
            Pelunasan tunai dan pemutihan
          </p>
        </AdminCard>

        <AdminCard className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#AD6549] dark:text-[#C57B5F]">
              Perubahan Peran
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-[#AD6549] dark:text-[#C57B5F] flex items-center justify-center">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#AD6549] dark:text-[#C57B5F]">
            {stats.roleCount}
          </div>
          <p className="text-[11px] text-[#797D6E] dark:text-[#BAC0B3] mt-1">
            Penugasan admin, pustakawan, pemeriksa
          </p>
        </AdminCard>
      </div>

      {/* Kartu Utama Tabel Log */}
      <AdminCard>
        <AdminCardHeader
          title="Log Audit Aktivitas Sistem"
          subtitle="Rekam jejak tindakan administratif penting untuk akuntabilitas dan keamanan perpustakaan"
          badge={
            <AdminBadge variant="primary" dot={false}>
              Super Admin
            </AdminBadge>
          }
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchLogs}
                disabled={loading}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#E5DFD3] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-[#797D6E] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF] hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer"
                title="Muat ulang log audit"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filteredLogs.length === 0}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#E5DFD3] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs font-semibold text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-40"
              >
                <FileSpreadsheet size={16} />
                <span>Ekspor CSV</span>
              </button>
            </div>
          }
        />

        {/* Toolbar Filter */}
        <AdminCardContent className="pt-4 pb-4 border-b border-[#E5DFD3]/70 dark:border-[#3A5B4F]/70">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-[#797D6E] dark:text-[#BAC0B3] shrink-0" />
              <select
                value={actionCategory}
                onChange={(e) => {
                  setActionCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-[#E5DFD3] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs font-semibold text-[#304D42] dark:text-[#FFF9EF] focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Jenis Aksi</option>
                <option value="roles">Perubahan Peran Akun</option>
                <option value="security">Keamanan & Pemblokiran</option>
                <option value="fines">Keuangan Denda</option>
                <option value="books">Katalog Koleksi</option>
              </select>
            </div>

            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#797D6E] dark:text-[#BAC0B3]"
                size={14}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari admin, target, atau aksi..."
                className="min-h-[44px] w-full sm:w-72 pl-8 pr-3 py-2 rounded-xl border border-[#E5DFD3] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#AD6549]"
              />
            </div>
          </div>
        </AdminCardContent>

        {/* Konten Log */}
        <AdminCardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#797D6E] dark:text-[#BAC0B3]">
              <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-[#304D42] dark:text-[#FFF9EF]" />
              <p>Memuat rekam jejak audit sistem...</p>
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                icon={ShieldCheck}
                title="Tidak Ada Catatan Log Audit"
                description={
                  searchQuery || actionCategory !== "all"
                    ? "Tidak ditemukan catatan audit yang cocok dengan kriteria filter."
                    : "Belum ada tindakan administratif penting yang tercatat dalam log audit sistem."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5DFD3] dark:border-[#3A5B4F] text-[#797D6E] dark:text-[#BAC0B3] bg-[#FAF6EF]/50 dark:bg-[#1B2E27]/50">
                    <th className="py-3 px-4 font-semibold">Waktu Pencatatan</th>
                    <th className="py-3 px-4 font-semibold">Jenis Tindakan</th>
                    <th className="py-3 px-4 font-semibold">Petugas Pelaksana</th>
                    <th className="py-3 px-4 font-semibold">Rincian Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DFD3]/60 dark:divide-[#3A5B4F]/60">
                  {paginatedLogs.map((log) => {
                    const meta = getActionMeta(log.action);
                    const formattedDate = new Date(log.timestamp).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-[#FAF6EF] dark:hover:bg-[#1B2E27]/50 transition-colors"
                      >
                        <td className="py-3 px-4 whitespace-nowrap text-[#797D6E] dark:text-[#BAC0B3] font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-[#AD6549] dark:text-[#C57B5F]" />
                            <span>{formattedDate} WIB</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <AdminBadge variant={meta.variant} dot={true}>
                            {meta.label}
                          </AdminBadge>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap font-bold text-[#304D42] dark:text-[#FFF9EF]">
                          {log.userName || "Admin"}
                        </td>

                        <td className="py-3 px-4 text-[#304D42] dark:text-[#FFF9EF] leading-relaxed">
                          {formatActionDetails(log)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Kontrol Paginasi */}
          {!loading && totalPages > 1 && (
            <div className="p-4 border-t border-[#E5DFD3]/60 dark:border-[#3A5B4F]/60 flex items-center justify-between text-xs text-[#797D6E] dark:text-[#BAC0B3]">
              <p>
                Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, filteredLogs.length)} dari {filteredLogs.length} entri
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[#E5DFD3] dark:border-[#3A5B4F] disabled:opacity-40 hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 font-bold text-[#304D42] dark:text-[#FFF9EF]">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[#E5DFD3] dark:border-[#3A5B4F] disabled:opacity-40 hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}
