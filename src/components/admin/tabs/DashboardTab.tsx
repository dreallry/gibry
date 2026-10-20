import React from "react";
import {
  BookOpen,
  AlertTriangle,
  ArrowDownLeft,
  ClipboardCheck,
  ChevronRight,
  Clock,
} from "lucide-react";
import { AdminCard, AdminCardHeader, AdminCardContent } from "../shared/AdminCard";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import { AdminBadge } from "../shared/AdminBadge";
import type { AdminTab } from "../AdminSidebar";
import type { Book, Borrow, UserProfile } from "@/lib/firestore";
import { useAdmin } from "@/hooks/useAdmin";

interface DashboardTabProps {
  users: UserProfile[];
  books: Book[];
  borrows: Borrow[];
  onSelectTab: (tab: AdminTab) => void;
}

export function DashboardTab({
  users,
  books,
  borrows,
  onSelectTab,
}: DashboardTabProps) {
  const { canWrite } = useAdmin();

  const totalUsers = users.length;
  const totalBooks = books.length;
  const activeBorrows = borrows.filter((b) => b.status === "Dipinjam").length;
  const overdueBorrows = borrows.filter((b) => {
    if (b.status !== "Dipinjam") return false;
    return new Date(b.batasKembali) < new Date();
  }).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Sapaan dan Tajuk Meja Kerja */}
      <div className="pb-2">
        <h1 className="text-xl sm:text-2xl font-bold text-[#304D42] dark:text-[#FFF9EF] tracking-tight">
          Meja Kerja Perpustakaan
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#797D6E] dark:text-[#BAC0B3]">
          Pantau sirkulasi peminjaman, tindak lanjuti buku terlambat, dan layani siswa sekolah hari ini.
        </p>
      </div>

      {/* 3 Kartu Ringkasan Tenang (Sesuai Palet Gibry) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Kartu 1: Peminjaman Aktif */}
        <AdminCard className="p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-[#797D6E] dark:text-[#BAC0B3]">
              Buku Sedang Dipinjam
            </span>
            <div className="mt-2 text-3xl font-extrabold text-[#304D42] dark:text-[#FFF9EF] tracking-tight">
              {activeBorrows}
            </div>
            <p className="mt-1 text-xs text-[#797D6E] dark:text-[#BAC0B3]">
              Buku yang saat ini berada di tangan siswa.
            </p>
          </div>
          {canWrite && (
            <button
              onClick={() => onSelectTab("circulation")}
              className="mt-4 pt-3 border-t border-[#DEDDD0] dark:border-[#3A5B4F] flex items-center justify-between text-xs font-bold text-[#304D42] dark:text-[#FFF9EF] hover:text-[#AD6549] dark:hover:text-[#C57B5F] transition-colors cursor-pointer"
            >
              <span>Buka Meja Sirkulasi</span>
              <ChevronRight size={14} />
            </button>
          )}
        </AdminCard>

        {/* Kartu 2: Pengembalian Terlambat */}
        <AdminCard className="p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-[#797D6E] dark:text-[#BAC0B3]">
              Perlu Pengembalian
            </span>
            <div className={`mt-2 text-3xl font-extrabold tracking-tight ${
              overdueBorrows > 0 ? "text-[#AD6549] dark:text-[#C57B5F]" : "text-[#304D42] dark:text-[#FFF9EF]"
            }`}>
              {overdueBorrows}
            </div>
            <p className="mt-1 text-xs text-[#797D6E] dark:text-[#BAC0B3]">
              {overdueBorrows > 0
                ? "Peminjaman melewati batas tanggal kembali."
                : "Semua peminjaman berjalan tepat waktu."}
            </p>
          </div>
          <button
            onClick={() => onSelectTab("fines")}
            className="mt-4 pt-3 border-t border-[#DEDDD0] dark:border-[#3A5B4F] flex items-center justify-between text-xs font-bold text-[#AD6549] dark:text-[#C57B5F] hover:underline transition-colors cursor-pointer"
          >
            <span>Periksa Daftar Denda</span>
            <ChevronRight size={14} />
          </button>
        </AdminCard>

        {/* Kartu 3: Total Koleksi & Anggota */}
        <AdminCard className="p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-[#797D6E] dark:text-[#BAC0B3]">
              Koleksi & Siswa Terdaftar
            </span>
            <div className="mt-2 text-3xl font-extrabold text-[#304D42] dark:text-[#FFF9EF] tracking-tight">
              {totalBooks}
            </div>
            <p className="mt-1 text-xs text-[#797D6E] dark:text-[#BAC0B3]">
              Judul buku tersedia bagi {totalUsers} siswa sekolah.
            </p>
          </div>
          <button
            onClick={() => onSelectTab("books")}
            className="mt-4 pt-3 border-t border-[#DEDDD0] dark:border-[#3A5B4F] flex items-center justify-between text-xs font-bold text-[#304D42] dark:text-[#FFF9EF] hover:text-[#AD6549] dark:hover:text-[#C57B5F] transition-colors cursor-pointer"
          >
            <span>Lihat Katalog Buku</span>
            <ChevronRight size={14} />
          </button>
        </AdminCard>
      </div>

      {/* Alur Kerja Utama Meja (Hanya 2 tugas pokok, tidak berantakan) */}
      {canWrite && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => onSelectTab("circulation")}
            className="p-5 rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF]/70 dark:bg-[#233B32] hover:bg-[#E8EBDF] dark:hover:bg-[#2C473D] transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#304D42] text-[#FFF9EF] flex items-center justify-center shadow-2xs">
                <ArrowDownLeft size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#304D42] dark:text-[#FFF9EF]">
                  Layanan Meja Sirkulasi
                </h3>
                <p className="text-xs text-[#797D6E] dark:text-[#BAC0B3]">
                  Catat peminjaman dan pengembalian buku di meja.
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#797D6E] group-hover:text-[#304D42] dark:group-hover:text-[#FFF9EF] transition-colors" />
          </div>

          <div
            onClick={() => onSelectTab("presensi")}
            className="p-5 rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF]/70 dark:bg-[#233B32] hover:bg-[#E8EBDF] dark:hover:bg-[#2C473D] transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#AD6549] text-[#FFF9EF] flex items-center justify-center shadow-2xs">
                <ClipboardCheck size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#304D42] dark:text-[#FFF9EF]">
                  Presensi Kunjungan QR
                </h3>
                <p className="text-xs text-[#797D6E] dark:text-[#BAC0B3]">
                  Tampilkan kode QR absensi bagi siswa yang berkunjung.
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#797D6E] group-hover:text-[#304D42] dark:group-hover:text-[#FFF9EF] transition-colors" />
          </div>
        </div>
      )}

      {/* Peminjaman Terbaru (Daftar Bersih & Tenang) */}
      <AdminCard>
        <AdminCardHeader
          title="Peminjaman Buku Terkini"
          subtitle="Catatan 5 peminjaman siswa terbaru di meja perpustakaan"
          action={
            <button
              onClick={() => onSelectTab("circulation")}
              className="text-xs font-bold text-[#AD6549] dark:text-[#C57B5F] hover:underline cursor-pointer"
            >
              Buka Meja Sirkulasi
            </button>
          }
        />
        <AdminCardContent>
          {borrows.length === 0 ? (
            <AdminEmptyState
              icon={BookOpen}
              title="Belum Ada Peminjaman"
              description="Catatan sirkulasi akan tampil di sini saat siswa mulai meminjam buku."
            />
          ) : (
            <div className="divide-y divide-[#DEDDD0]/70 dark:divide-[#3A5B4F]/70">
              {borrows.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#E8EBDF] dark:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF]">
                      <BookOpen size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-[#304D42] dark:text-[#FFF9EF] truncate">
                        {b.bookTitle || "Buku"}
                      </p>
                      <p className="text-xs text-[#797D6E] dark:text-[#BAC0B3] truncate">
                        {b.userName || "Siswa"} • Pinjam: {new Date(b.tanggalPinjam).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <AdminBadge
                      variant={b.status === "Dipinjam" ? "warning" : "success"}
                    >
                      {b.status}
                    </AdminBadge>
                    {b.denda && b.denda > 0 ? (
                      <span className="text-xs font-semibold text-[#AD6549] dark:text-[#C57B5F]">
                        Rp {b.denda.toLocaleString("id-ID")}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}
