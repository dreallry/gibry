import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AdminCard, AdminCardHeader, AdminCardContent } from "../shared/AdminCard";
import { AdminBadge } from "../shared/AdminBadge";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import { exportToCsv } from "../shared/csvExport";
import type { Borrow } from "@/lib/firestore";
import { useAdmin } from "@/hooks/useAdmin";

interface FinesTabProps {
  borrows: Borrow[];
  onPayFineCash: (borrow: Borrow) => void;
  onWaiveFine: (borrow: Borrow) => void;
  onConfirmPickup?: (borrow: Borrow) => void;
  onConfirmReturn?: (borrow: Borrow) => void;
}

export function FinesTab({
  borrows,
  onPayFineCash,
  onWaiveFine,
  onConfirmPickup,
  onConfirmReturn,
}: FinesTabProps) {
  const { canWrite } = useAdmin();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Saring hanya peminjaman yang memiliki denda atau status denda
  const fineRecords = useMemo(() => {
    return borrows.filter((b) => (b.denda && b.denda > 0) || b.dendaStatus);
  }, [borrows]);

  const totalFines = fineRecords.reduce((sum, b) => sum + (b.denda || 0), 0);
  const paidFines = fineRecords
    .filter((b) => b.dendaStatus === "lunas")
    .reduce((sum, b) => sum + (b.denda || 0), 0);
  const waivedFines = fineRecords
    .filter((b) => b.dendaStatus === "waived")
    .reduce((sum, b) => sum + (b.denda || 0), 0);
  const unpaidFines = totalFines - paidFines - waivedFines;

  const filteredFines = useMemo(() => {
    return fineRecords.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        b.userName?.toLowerCase().includes(q) ||
        b.bookTitle?.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q);

      const status = b.dendaStatus || "pending";
      const matchStatus = statusFilter === "all" ? true : status === statusFilter;

      return matchQuery && matchStatus;
    });
  }, [fineRecords, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredFines.length / pageSize));
  const paginatedFines = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFines.slice(start, start + pageSize);
  }, [filteredFines, currentPage, pageSize]);

  // Ekspor berkas CSV aman
  const handleExportCsv = () => {
    exportToCsv(
      filteredFines,
      [
        { header: "ID Peminjaman", accessor: (b) => b.id },
        { header: "Nama Siswa", accessor: (b) => b.userName || "Siswa" },
        { header: "Judul Buku", accessor: (b) => b.bookTitle || "Buku" },
        { header: "Tanggal Pinjam", accessor: (b) => new Date(b.tanggalPinjam).toLocaleDateString("id-ID") },
        { header: "Batas Kembali", accessor: (b) => new Date(b.batasKembali).toLocaleDateString("id-ID") },
        { header: "Nominal Denda (Rp)", accessor: (b) => b.denda || 0 },
        { header: "Status Denda", accessor: (b) => b.dendaStatus || "Belum Lunas" },
      ],
      `laporan-denda-gibry-${new Date().toISOString().slice(0, 10)}`
    );
  };

  return (
    <div className="space-y-4">
      {/* 3 Kartu Ringkasan Sederhana (Palet Gibry) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminCard className="p-4">
          <p className="text-xs font-semibold text-[#797D6E] dark:text-[#BAC0B3]">
            Total Denda Tercatat
          </p>
          <p className="mt-1.5 text-xl font-bold text-[#304D42] dark:text-[#FFF9EF]">
            Rp {totalFines.toLocaleString("id-ID")}
          </p>
        </AdminCard>

        <AdminCard className="p-4">
          <p className="text-xs font-semibold text-[#304D42] dark:text-[#DCE2CD]">
            Denda Lunas di Meja
          </p>
          <p className="mt-1.5 text-xl font-bold text-[#304D42] dark:text-[#DCE2CD]">
            Rp {paidFines.toLocaleString("id-ID")}
          </p>
        </AdminCard>

        <AdminCard className="p-4">
          <p className="text-xs font-semibold text-[#AD6549] dark:text-[#C57B5F]">
            Denda Belum Dilunasi
          </p>
          <p className="mt-1.5 text-xl font-bold text-[#AD6549] dark:text-[#C57B5F]">
            Rp {unpaidFines.toLocaleString("id-ID")}
          </p>
        </AdminCard>
      </div>

      {/* Tabel Utama Denda */}
      <AdminCard>
        <AdminCardHeader
          title={`Catatan Keterlambatan & Denda (${filteredFines.length})`}
          subtitle="Pencatatan sirkulasi buku yang melewati batas tanggal pengembalian"
          action={
            <button
              onClick={handleExportCsv}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs font-semibold text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download size={15} />
              <span>Ekspor CSV</span>
            </button>
          }
        />

        <AdminCardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF]/70 dark:bg-[#1B2E27] text-xs font-semibold text-[#304D42] dark:text-[#FFF9EF] focus:outline-none"
            >
              <option value="all">Semua Status Denda</option>
              <option value="pending">Belum Bayar</option>
              <option value="lunas">Lunas</option>
              <option value="waived">Diputihkan</option>
            </select>

            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#797D6E] dark:text-[#BAC0B3]"
                size={15}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari siswa atau buku..."
                className="min-h-[44px] w-full sm:w-64 pl-9 pr-3.5 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#AD6549]"
              />
            </div>
          </div>
        </AdminCardContent>
      </AdminCard>

      {/* Daftar Catatan Denda */}
      {paginatedFines.length === 0 ? (
        <AdminEmptyState
          icon={AlertTriangle}
          title="Tidak Ada Catatan Denda"
          description={
            searchQuery || statusFilter !== "all"
              ? "Tidak ada data denda yang sesuai dengan filter pencarian Anda."
              : "Semua peminjaman buku tepat waktu dan tidak ada denda tertunda saat ini."
          }
        />
      ) : (
        <div className="space-y-2.5">
          {paginatedFines.map((record) => {
            const isSettled = record.dendaStatus === "lunas" || record.dendaStatus === "waived";
            const badgeVariant =
              record.dendaStatus === "lunas"
                ? "success"
                : record.dendaStatus === "waived"
                  ? "info"
                  : "danger";

            const statusLabel =
              record.dendaStatus === "lunas"
                ? "Lunas"
                : record.dendaStatus === "waived"
                  ? "Diputihkan"
                  : "Belum Bayar";

            return (
              <AdminCard
                key={record.id}
                className="p-3.5 sm:p-4 hover:shadow-2xs transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#304D42] dark:text-[#FFF9EF] truncate">
                        {record.userName || "Siswa"}
                      </p>
                      <AdminBadge variant={badgeVariant}>{statusLabel}</AdminBadge>
                    </div>

                    <p className="text-xs text-[#797D6E] dark:text-[#BAC0B3] mt-0.5 truncate">
                      Buku: <strong className="text-[#304D42] dark:text-[#FFF9EF]">{record.bookTitle || "Buku"}</strong> • Batas: {new Date(record.batasKembali).toLocaleDateString("id-ID")}
                    </p>

                    <p className="text-xs font-semibold text-[#AD6549] dark:text-[#C57B5F] mt-1">
                      Nominal: Rp {(record.denda || 0).toLocaleString("id-ID")}
                    </p>
                  </div>

                  {/* Aksi Sirkulasi & Pelunasan yang Tenang */}
                  {canWrite && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#DEDDD0]/60 dark:border-[#3A5B4F]/60">
                      {record.status === "Menunggu Pengambilan" && onConfirmPickup && (
                        <button
                          onClick={() => onConfirmPickup(record)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#AD6549] hover:opacity-90 text-[#FFF9EF] text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          title="Konfirmasi siswa telah mengambil buku fisik di meja"
                        >
                          Konfirmasi Ambil
                        </button>
                      )}

                      {record.status === "Dipinjam" && onConfirmReturn && (
                        <button
                          onClick={() => onConfirmReturn(record)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#304D42] hover:bg-[#253d34] text-[#FFF9EF] text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          title="Konfirmasi pengembalian buku fisik"
                        >
                          Kembalikan Buku
                        </button>
                      )}

                      {!isSettled && (
                        <>
                          <button
                            onClick={() => onPayFineCash(record)}
                            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#304D42] hover:bg-[#253d34] text-[#FFF9EF] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                            title="Tandai denda lunas setelah menerima pembayaran tunai di meja perpustakaan"
                          >
                            <CheckCircle2 size={14} />
                            <span>Bayar Tunai</span>
                          </button>

                          <button
                            onClick={() => onWaiveFine(record)}
                            className="min-h-[44px] px-3 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#1B2E27] text-xs font-semibold text-[#797D6E] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF] transition-colors cursor-pointer"
                            title="Bebaskan denda untuk kasus khusus (misal izin sakit)"
                          >
                            <XCircle size={14} />
                            <span>Putihkan</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </AdminCard>
            );
          })}

          {/* Paginasi Halaman */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 text-xs text-[#797D6E] dark:text-[#BAC0B3]">
              <p>
                Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, filteredFines.length)} dari{" "}
                {filteredFines.length} catatan
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg border border-[#DEDDD0] dark:border-[#3A5B4F] disabled:opacity-40 hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer disabled:cursor-not-allowed"
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
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg border border-[#DEDDD0] dark:border-[#3A5B4F] disabled:opacity-40 hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Halaman selanjutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
