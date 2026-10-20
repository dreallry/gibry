import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Edit3,
  Trash2,
  Download,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AdminCard, AdminCardHeader, AdminCardContent } from "../shared/AdminCard";
import { AdminBadge } from "../shared/AdminBadge";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import { exportToCsv } from "../shared/csvExport";
import type { Book } from "@/lib/firestore";
import { useAdmin } from "@/hooks/useAdmin";

interface BooksTabProps {
  books: Book[];
  loading: boolean;
  onOpenAddBook: () => void;
  onOpenEditBook: (book: Book) => void;
  onRequestDeleteBook: (book: Book) => void;
}

export function BooksTab({
  books,
  loading,
  onOpenAddBook,
  onOpenEditBook,
  onRequestDeleteBook,
}: BooksTabProps) {
  const { canWrite } = useAdmin();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "fisik" | "digital">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "Tersedia" | "Dipinjam">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter buku
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        book.judul?.toLowerCase().includes(q) ||
        book.penulis?.toLowerCase().includes(q) ||
        book.lokasiRak?.toLowerCase().includes(q) ||
        book.isbn?.toLowerCase().includes(q);

      const matchType =
        typeFilter === "all"
          ? true
          : typeFilter === "fisik"
            ? book.type === "fisik" || !book.type
            : book.type === "digital";

      const matchStatus =
        statusFilter === "all" ? true : book.status === statusFilter;

      return matchQuery && matchType && matchStatus;
    });
  }, [books, searchQuery, typeFilter, statusFilter]);

  // Paginasi
  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / pageSize));
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, currentPage, pageSize]);

  // Ekspor CSV aman
  const handleExportCsv = () => {
    exportToCsv(
      filteredBooks,
      [
        { header: "ID Buku", accessor: (b) => b.id },
        { header: "Judul Buku", accessor: (b) => b.judul },
        { header: "Penulis", accessor: (b) => b.penulis },
        { header: "Penerbit", accessor: (b) => b.penerbit || "" },
        { header: "Tahun", accessor: (b) => b.tahun || "" },
        { header: "ISBN", accessor: (b) => b.isbn || "" },
        { header: "Tipe", accessor: (b) => (b.type === "fisik" ? "Fisik" : "Digital") },
        { header: "Genre", accessor: (b) => b.genre || "Umum" },
        { header: "Lokasi Rak", accessor: (b) => b.lokasiRak || "" },
        { header: "Status", accessor: (b) => b.status || "Tersedia" },
      ],
      `katalog-buku-gibry-${new Date().toISOString().slice(0, 10)}`
    );
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header & Kontrol */}
      <AdminCard>
        <AdminCardHeader
          title={`Katalog Koleksi (${filteredBooks.length})`}
          subtitle="Koleksi buku fisik dan perpustakaan digital sekolah"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs font-semibold text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] dark:hover:bg-[#2C473D] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Unduh data dalam format CSV aman"
              >
                <Download size={15} />
                <span>Ekspor CSV</span>
              </button>

              {canWrite && (
                <button
                  onClick={onOpenAddBook}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] hover:opacity-90 transition-opacity text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={15} />
                  <span>Tambah Buku Baru</span>
                </button>
              )}
            </div>
          }
        />

        <AdminCardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs font-semibold text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
              >
                <option value="all">Semua Format</option>
                <option value="fisik">Buku Fisik</option>
                <option value="digital">Buku Digital</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs font-semibold text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
              >
                <option value="all">Semua Status</option>
                <option value="Tersedia">Tersedia</option>
                <option value="Dipinjam">Dipinjam</option>
              </select>
            </div>

            {/* Kotak Pencarian */}
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
                placeholder="Cari judul, penulis, nomor rak, ISBN..."
                className="min-h-[44px] w-full sm:w-72 pl-9 pr-3.5 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs text-[#304D42] dark:text-[#FFF9EF] placeholder-[#565D4F] dark:placeholder-[#BAC0B3] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
              />
            </div>
          </div>
        </AdminCardContent>
      </AdminCard>

      {/* Daftar Buku */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF]/70 dark:bg-[#233B32] animate-pulse"
            />
          ))}
        </div>
      ) : paginatedBooks.length === 0 ? (
        <AdminEmptyState
          icon={BookOpen}
          title="Tidak Ada Buku Ditemukan"
          description={
            searchQuery || typeFilter !== "all" || statusFilter !== "all"
              ? "Tidak ada koleksi yang cocok dengan filter atau kata kunci pencarian Anda."
              : "Belum ada data buku yang terdaftar di sistem perpustakaan."
          }
          action={
            canWrite && !searchQuery
              ? {
                  label: "Tambah Koleksi Pertama",
                  onClick: onOpenAddBook,
                  icon: Plus,
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-2.5">
          {paginatedBooks.map((book) => (
            <AdminCard
              key={book.id}
              className="p-3.5 sm:p-4 hover:shadow-2xs transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Rincian Buku */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-12 h-16 rounded-lg shrink-0 overflow-hidden bg-white dark:bg-[#1B2E27] border border-[#DEDDD0] dark:border-[#3A5B4F] flex items-center justify-center">
                    {book.cover ? (
                      <img
                        src={book.cover}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <BookOpen size={18} className="text-[#94492C] dark:text-[#E2AA90]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#304D42] dark:text-[#FFF9EF] truncate">
                      {book.judul}
                    </p>
                    <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] truncate">
                      {book.penulis} • {book.penerbit || "Penerbit Tidak Dicatat"} ({book.tahun || "-"})
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <AdminBadge variant="info" dot={false}>
                        {book.type === "fisik" ? "Buku Fisik" : "Digital PDF"}
                      </AdminBadge>

                      <AdminBadge variant="neutral" dot={false}>
                        {book.genre || "Umum"}
                      </AdminBadge>

                      {book.lokasiRak && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-[10px] font-mono font-bold text-[#94492C] dark:text-[#E2AA90]">
                          <MapPin size={10} />
                          {book.lokasiRak}
                        </span>
                      )}

                      {book.isbn && (
                        <span className="text-[10px] text-[#565D4F] dark:text-[#BAC0B3] font-mono">
                          ISBN: {book.isbn}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status dan Aksi */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#DEDDD0] dark:border-[#3A5B4F]">
                  <AdminBadge
                    variant={book.status === "Tersedia" ? "success" : "warning"}
                  >
                    {book.status}
                  </AdminBadge>

                  {canWrite && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenEditBook(book)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer"
                        title="Edit Data Buku"
                        aria-label="Edit Buku"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => onRequestDeleteBook(book)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl border border-[#F1D2C8] dark:border-[#5C392D] bg-[#FDF2EE] dark:bg-[#3D251D] text-[#94492C] dark:text-[#EAA48F] hover:bg-[#FBE4DD] transition-colors cursor-pointer"
                        title="Hapus Buku"
                        aria-label="Hapus Buku"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </AdminCard>
          ))}

          {/* Kontrol Paginasi */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 text-xs text-[#565D4F] dark:text-[#BAC0B3]">
              <p>
                Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, filteredBooks.length)} dari{" "}
                {filteredBooks.length} buku
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
    </div>
  );
}
