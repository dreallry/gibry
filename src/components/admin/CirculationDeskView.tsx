import React, { useState, useMemo } from "react";
import type { Book, Borrow, UserProfile, PresensiConfig } from "@/lib/firestore";
import {
  adminDirectBorrow,
  returnBook,
  payFineCash,
  waiveFine,
  addAttendance,
} from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import {
  BookOpen,
  AlertTriangle,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  UserCheck,
  RefreshCw,
  X,
  User,
  MapPin,
  Calendar,
  Check,
  Download,
  QrCode,
  Loader2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AdminCard, AdminCardHeader, AdminCardContent } from "./shared/AdminCard";
import { AdminBadge } from "./shared/AdminBadge";
import { AdminEmptyState } from "./shared/AdminEmptyState";

interface CirculationDeskViewProps {
  books: Book[];
  borrows: Borrow[];
  users: UserProfile[];
  onRefresh: () => Promise<void>;
  presensiConfig?: PresensiConfig | null;
  generatingToken?: boolean;
  onGenerateToken?: () => void;
  onDownloadQR?: () => void;
}

type DeskTab = "return" | "borrow" | "attendance";

export function CirculationDeskView({
  books,
  borrows,
  users,
  onRefresh,
  presensiConfig,
  generatingToken = false,
  onGenerateToken,
  onDownloadQR,
}: CirculationDeskViewProps) {
  const { toast } = useToast();

  // Mode alur kerja: fokus satu tugas pada satu waktu untuk menghindari kebingungan
  const [activeSubTab, setActiveSubTab] = useState<DeskTab>("return");

  // State Peminjaman Langsung
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [bookQuery, setBookQuery] = useState("");
  const [deadlineDays, setDeadlineDays] = useState(7);
  const [isSubmittingBorrow, setIsSubmittingBorrow] = useState(false);

  // State Pengembalian & Pencarian Sirkulasi Aktif
  const [borrowSearch, setBorrowSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "overdue" | "ontime">("all");

  // State Presensi Kunjungan Meja Cepat
  const [walkinUserId, setWalkinUserId] = useState("");
  const [walkinPurpose, setWalkinPurpose] = useState("Membaca Buku");
  const [isSubmittingWalkin, setIsSubmittingWalkin] = useState(false);

  // Modal Denda Tunai
  const [fineModalData, setFineModalData] = useState<{
    borrowId: string;
    bookTitle: string;
    userName: string;
    fineAmount: number;
  } | null>(null);
  const [isProcessingFine, setIsProcessingFine] = useState(false);

  // Buku fisik yang berstatus Tersedia di rak
  const availablePhysicalBooks = useMemo(() => {
    return books.filter(
      (b) => (b.type === "fisik" || !b.type) && b.status === "Tersedia"
    );
  }, [books]);

  // Filter siswa untuk form pinjam
  const filteredUsers = useMemo(() => {
    if (!userQuery.trim()) return users.slice(0, 6);
    const q = userQuery.toLowerCase();
    return users
      .filter(
        (u) =>
          u.nama?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.kelas?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [users, userQuery]);

  // Filter buku untuk form pinjam
  const filteredAvailableBooks = useMemo(() => {
    if (!bookQuery.trim()) return availablePhysicalBooks.slice(0, 6);
    const q = bookQuery.toLowerCase();
    return availablePhysicalBooks
      .filter(
        (b) =>
          b.judul.toLowerCase().includes(q) ||
          b.penulis.toLowerCase().includes(q) ||
          b.lokasiRak?.toLowerCase().includes(q) ||
          b.isbn?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [availablePhysicalBooks, bookQuery]);

  // Sirkulasi peminjaman aktif
  const activeBorrows = useMemo(() => {
    const list = borrows.filter(
      (b) => b.status === "Dipinjam" || b.status === "Menunggu Pengambilan"
    );
    const now = new Date();

    return list.filter((b) => {
      if (borrowSearch.trim()) {
        const q = borrowSearch.toLowerCase();
        const matches =
          b.bookTitle?.toLowerCase().includes(q) ||
          b.userName?.toLowerCase().includes(q) ||
          b.userId?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      const isOverdue = new Date(b.batasKembali) < now;
      if (statusFilter === "overdue") return isOverdue;
      if (statusFilter === "ontime") return !isOverdue;

      return true;
    });
  }, [borrows, borrowSearch, statusFilter]);

  const overdueCount = useMemo(() => {
    const now = new Date();
    return borrows.filter(
      (b) => b.status === "Dipinjam" && new Date(b.batasKembali) < now
    ).length;
  }, [borrows]);

  const selectedUser = useMemo(
    () => users.find((u) => u.uid === selectedUserId),
    [users, selectedUserId]
  );
  const selectedBook = useMemo(
    () => books.find((b) => b.id === selectedBookId),
    [books, selectedBookId]
  );

  // Catat Peminjaman Langsung
  async function handleDirectBorrow(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) {
      toast("error", "Silakan pilih siswa peminjam.");
      return;
    }
    if (!selectedBookId) {
      toast("error", "Silakan pilih buku yang akan dipinjam.");
      return;
    }

    setIsSubmittingBorrow(true);
    try {
      await adminDirectBorrow(selectedUserId, selectedBookId, deadlineDays);
      toast(
        "success",
        `Peminjaman "${selectedBook?.judul}" berhasil dicatat untuk ${selectedUser?.nama}.`
      );
      setSelectedUserId("");
      setUserQuery("");
      setSelectedBookId("");
      setBookQuery("");
      setActiveSubTab("return");
      await onRefresh();
    } catch (err: any) {
      toast("error", err.message || "Gagal memproses peminjaman.");
    } finally {
      setIsSubmittingBorrow(false);
    }
  }

  // Proses Pengembalian Buku
  async function handleReturnBook(borrow: Borrow) {
    try {
      const fineAmount = await returnBook(borrow.userId, borrow.id);
      if (fineAmount > 0) {
        setFineModalData({
          borrowId: borrow.id,
          bookTitle: borrow.bookTitle || "Buku Fisik",
          userName: borrow.userName || "Siswa",
          fineAmount,
        });
        toast("info", `Buku dikembalikan dengan denda Rp ${fineAmount.toLocaleString("id-ID")}.`);
      } else {
        toast("success", `Buku "${borrow.bookTitle}" telah diterima kembali tepat waktu.`);
      }
      await onRefresh();
    } catch (err: any) {
      toast("error", err.message || "Gagal memproses pengembalian.");
    }
  }

  // Pembayaran Denda Tunai
  async function handlePayFine(borrowId: string) {
    setIsProcessingFine(true);
    try {
      await payFineCash(borrowId);
      toast("success", "Pembayaran denda tunai berhasil diselesaikan.");
      setFineModalData(null);
      await onRefresh();
    } catch (err: any) {
      toast("error", err.message || "Gagal mencatat pembayaran denda.");
    } finally {
      setIsProcessingFine(false);
    }
  }

  // Pemutihan Denda
  async function handleWaiveFine(borrowId: string) {
    setIsProcessingFine(true);
    try {
      await waiveFine(borrowId, "Kebijakan Pustakawan Meja Sirkulasi");
      toast("info", "Denda keterlambatan telah dibebaskan.");
      setFineModalData(null);
      await onRefresh();
    } catch (err: any) {
      toast("error", err.message || "Gagal membebaskan denda.");
    } finally {
      setIsProcessingFine(false);
    }
  }

  // Presensi Meja Cepat
  async function handleWalkinAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!walkinUserId) {
      toast("error", "Silakan pilih nama siswa yang hadir.");
      return;
    }
    const student = users.find((u) => u.uid === walkinUserId);
    if (!student) return;

    setIsSubmittingWalkin(true);
    try {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      await addAttendance({
        userId: student.uid,
        nama: student.nama || "Siswa",
        email: student.email || "",
        waktuKunjungan: timeStr,
        tujuan: walkinPurpose,
      });
      toast("success", `Presensi atas nama ${student.nama} berhasil dicatat.`);
      setWalkinUserId("");
    } catch (err: any) {
      toast("error", err.message || "Gagal mencatat presensi.");
    } finally {
      setIsSubmittingWalkin(false);
    }
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* 3 Kartu Ringkasan Sirkulasi yang Tenang dan Terbaca */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 sm:p-5 rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#233B32] shadow-2xs">
          <span className="text-xs font-semibold text-[#565D4F] dark:text-[#BAC0B3]">
            Buku Sedang Dipinjam
          </span>
          <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#304D42] dark:text-[#FFF9EF] tracking-tight">
            {borrows.filter((b) => b.status === "Dipinjam").length}
          </div>
          <p className="mt-1 text-[11px] text-[#565D4F] dark:text-[#BAC0B3]">
            Buku aktif di tangan siswa
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#233B32] shadow-2xs">
          <span className="text-xs font-semibold text-[#565D4F] dark:text-[#BAC0B3]">
            Perlu Pengembalian
          </span>
          <div
            className={`mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight ${
              overdueCount > 0
                ? "text-[#94492C] dark:text-[#E2AA90]"
                : "text-[#304D42] dark:text-[#FFF9EF]"
            }`}
          >
            {overdueCount}
          </div>
          <p className="mt-1 text-[11px] text-[#565D4F] dark:text-[#BAC0B3]">
            {overdueCount > 0
              ? "Peminjaman melewati batas tempo"
              : "Semua pengembalian tepat waktu"}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#233B32] shadow-2xs">
          <span className="text-xs font-semibold text-[#565D4F] dark:text-[#BAC0B3]">
            Siswa Terdaftar
          </span>
          <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#304D42] dark:text-[#FFF9EF] tracking-tight">
            {users.length}
          </div>
          <p className="mt-1 text-[11px] text-[#565D4F] dark:text-[#BAC0B3]">
            {availablePhysicalBooks.length} buku fisik siap dipinjam di rak
          </p>
        </div>
      </div>

      {/* Meja Kerja: Segmented Control Bersih (1 Alur Sekaligus) */}
      <AdminCard>
        <div className="p-4 sm:p-5 border-b border-[#DEDDD0] dark:border-[#3A5B4F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#304D42] dark:text-[#FFF9EF] tracking-tight">
              Layanan Meja Sirkulasi
            </h2>
            <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] mt-0.5">
              Pilih layanan di meja perpustakaan untuk melayani siswa secara langsung.
            </p>
          </div>

          <button
            onClick={() => onRefresh()}
            className="min-h-[44px] min-w-[44px] self-start sm:self-auto px-3.5 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] dark:hover:bg-[#2C473D] transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
            title="Muat ulang data sirkulasi"
            aria-label="Muat ulang data"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Segarkan Data</span>
          </button>
        </div>

        {/* 3 Tombol Alur Meja Kerja */}
        <div className="p-4 sm:p-5 pb-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#EFECE4] dark:bg-[#1B2E27] p-1.5 rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F]">
            <button
              onClick={() => setActiveSubTab("return")}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === "return"
                  ? "bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] shadow-2xs"
                  : "text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] dark:hover:bg-[#233B32]"
              }`}
            >
              <ArrowUpRight size={15} />
              <span>Pengembalian & Denda</span>
              {overdueCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#94492C] text-white">
                  {overdueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab("borrow")}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === "borrow"
                  ? "bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] shadow-2xs"
                  : "text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] dark:hover:bg-[#233B32]"
              }`}
            >
              <ArrowDownLeft size={15} />
              <span>Pinjam Buku Baru</span>
            </button>

            <button
              onClick={() => setActiveSubTab("attendance")}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === "attendance"
                  ? "bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] shadow-2xs"
                  : "text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] dark:hover:bg-[#233B32]"
              }`}
            >
              <UserCheck size={15} />
              <span>Presensi Meja & QR</span>
            </button>
          </div>
        </div>

        {/* ===== ALUR 1: PENGEMBALIAN BUKU & SIRKULASI AKTIF ===== */}
        {activeSubTab === "return" && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Filter & Pencarian Tenang */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#565D4F] dark:text-[#BAC0B3]">
                  Penyaringan:
                </span>
                <div className="flex bg-[#EFECE4] dark:bg-[#1B2E27] p-1 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F]">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      statusFilter === "all"
                        ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs"
                        : "text-[#565D4F] dark:text-[#BAC0B3]"
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setStatusFilter("overdue")}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      statusFilter === "overdue"
                        ? "bg-white dark:bg-[#233B32] text-[#94492C] dark:text-[#E2AA90] shadow-2xs"
                        : "text-[#565D4F] dark:text-[#BAC0B3]"
                    }`}
                  >
                    Terlambat Saja
                  </button>
                  <button
                    onClick={() => setStatusFilter("ontime")}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      statusFilter === "ontime"
                        ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs"
                        : "text-[#565D4F] dark:text-[#BAC0B3]"
                    }`}
                  >
                    Tepat Waktu
                  </button>
                </div>
              </div>

              <div className="relative w-full sm:w-80">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#565D4F] dark:text-[#BAC0B3]"
                />
                <input
                  type="text"
                  value={borrowSearch}
                  onChange={(e) => setBorrowSearch(e.target.value)}
                  placeholder="Cari nama siswa atau judul buku..."
                  className="min-h-[44px] w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-[#304D42] dark:text-[#FFF9EF] placeholder-[#565D4F] dark:placeholder-[#BAC0B3] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                />
              </div>
            </div>

            {/* Tabel Peminjaman yang Rapi */}
            {activeBorrows.length === 0 ? (
              <AdminEmptyState
                icon={BookOpen}
                title="Tidak ada data peminjaman aktif"
                description={
                  borrowSearch
                    ? "Tidak ditemukan peminjaman dengan kata kunci pencarian tersebut."
                    : "Saat ini seluruh buku telah dikembalikan tepat waktu."
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#EFECE4]/60 dark:bg-[#233B32]/70 text-[#565D4F] dark:text-[#BAC0B3]">
                      <th className="py-3 px-3.5 font-bold">Judul Buku</th>
                      <th className="py-3 px-3.5 font-bold">Siswa Peminjam</th>
                      <th className="py-3 px-3.5 font-bold">Batas Pengembalian</th>
                      <th className="py-3 px-3.5 font-bold">Status</th>
                      <th className="py-3 px-3.5 font-bold text-right">Aksi Meja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DEDDD0] dark:divide-[#3A5B4F]">
                    {activeBorrows.map((b) => {
                      const now = new Date();
                      const deadline = new Date(b.batasKembali);
                      const isLate = deadline < now;
                      const diffDays = Math.ceil(
                        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                      );

                      return (
                        <tr
                          key={b.id}
                          className="hover:bg-[#F2ECDF]/50 dark:hover:bg-[#233B32]/40 transition-colors"
                        >
                          <td className="py-3.5 px-3.5 font-bold text-[#304D42] dark:text-[#FFF9EF] max-w-xs truncate">
                            {b.bookTitle || "Buku Fisik"}
                          </td>
                          <td className="py-3.5 px-3.5">
                            <p className="font-semibold text-[#304D42] dark:text-[#FFF9EF]">
                              {b.userName || "Siswa"}
                            </p>
                            <p className="text-[11px] text-[#565D4F] dark:text-[#BAC0B3]">
                              ID: {b.userId?.substring(0, 8)}
                            </p>
                          </td>
                          <td className="py-3.5 px-3.5 text-[#304D42] dark:text-[#FFF9EF]">
                            <div className="font-medium">
                              {deadline.toLocaleDateString("id-ID")}
                            </div>
                            <div className="text-[11px] text-[#565D4F] dark:text-[#BAC0B3]">
                              {isLate
                                ? `Terlambat ${Math.abs(diffDays)} hari`
                                : diffDays === 0
                                  ? "Jatuh tempo hari ini"
                                  : `${diffDays} hari lagi`}
                            </div>
                          </td>
                          <td className="py-3.5 px-3.5">
                            {isLate ? (
                              <AdminBadge variant="danger" dot={true}>
                                Terlambat
                              </AdminBadge>
                            ) : diffDays <= 1 ? (
                              <AdminBadge variant="warning" dot={true}>
                                Jatuh Tempo
                              </AdminBadge>
                            ) : (
                              <AdminBadge variant="success" dot={true}>
                                Dipinjam
                              </AdminBadge>
                            )}
                          </td>
                          <td className="py-3.5 px-3.5 text-right">
                            <button
                              onClick={() => handleReturnBook(b)}
                              className="min-h-[44px] px-4 py-2 bg-[#304D42] dark:bg-[#9E5336] hover:opacity-90 text-[#FFF9EF] rounded-xl text-xs font-bold transition-opacity cursor-pointer shadow-2xs"
                            >
                              Terima Buku
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== ALUR 2: PINJAM BUKU BARU ===== */}
        {activeSubTab === "borrow" && (
          <div className="p-4 sm:p-5">
            <form onSubmit={handleDirectBorrow} className="space-y-6 max-w-2xl">
              {/* Langkah 1: Pilih Siswa */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF] flex items-center gap-1.5">
                  <User size={15} className="text-[#94492C] dark:text-[#E2AA90]" />
                  <span>1. Pilih Siswa Peminjam</span>
                </label>

                {selectedUser ? (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#1B2E27] border border-[#94492C]/50 dark:border-[#E2AA90]/50 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF]">
                        {selectedUser.nama}
                      </p>
                      <p className="text-[11px] text-[#565D4F] dark:text-[#BAC0B3]">
                        {selectedUser.kelas || "Siswa"} • {selectedUser.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserId("");
                        setUserQuery("");
                      }}
                      className="min-h-[44px] px-3 text-xs text-[#94492C] dark:text-[#E2AA90] font-bold hover:underline cursor-pointer"
                    >
                      Ganti Siswa
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#565D4F] dark:text-[#BAC0B3]"
                      />
                      <input
                        type="text"
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        placeholder="Ketik nama siswa atau kelas..."
                        className="min-h-[44px] w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-[#304D42] dark:text-[#FFF9EF] placeholder-[#565D4F] dark:placeholder-[#BAC0B3] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                      />
                    </div>
                    <div className="divide-y divide-[#DEDDD0] dark:divide-[#3A5B4F] border border-[#DEDDD0] dark:border-[#3A5B4F] rounded-xl p-1 bg-white dark:bg-[#1B2E27]">
                      {filteredUsers.length === 0 ? (
                        <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] p-3 text-center">
                          Siswa tidak ditemukan.
                        </p>
                      ) : (
                        filteredUsers.map((u) => (
                          <button
                            key={u.uid}
                            type="button"
                            onClick={() => {
                              setSelectedUserId(u.uid);
                              setUserQuery(u.nama);
                            }}
                            className="min-h-[44px] w-full text-left px-3 py-2 rounded-lg hover:bg-[#F2ECDF] dark:hover:bg-[#233B32] transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <span className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF]">
                                {u.nama}
                              </span>
                              <span className="text-[11px] text-[#565D4F] dark:text-[#BAC0B3] ml-2">
                                ({u.kelas || "Siswa"})
                              </span>
                            </div>
                            <span className="text-xs text-[#94492C] dark:text-[#E2AA90] font-semibold">
                              Pilih
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Langkah 2: Pilih Buku Fisik */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF] flex items-center gap-1.5">
                  <BookOpen size={15} className="text-[#94492C] dark:text-[#E2AA90]" />
                  <span>2. Pilih Buku Fisik dari Rak</span>
                </label>

                {selectedBook ? (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#1B2E27] border border-[#94492C]/50 dark:border-[#E2AA90]/50 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF]">
                        {selectedBook.judul}
                      </p>
                      <p className="text-[11px] text-[#565D4F] dark:text-[#BAC0B3] flex items-center gap-2 mt-0.5">
                        <span>{selectedBook.penulis}</span>
                        <span className="inline-flex items-center gap-1 font-mono text-[#94492C] dark:text-[#E2AA90]">
                          <MapPin size={11} />
                          {selectedBook.lokasiRak || "Rak Belum Diatur"}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBookId("");
                        setBookQuery("");
                      }}
                      className="min-h-[44px] px-3 text-xs text-[#94492C] dark:text-[#E2AA90] font-bold hover:underline cursor-pointer"
                    >
                      Ganti Buku
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#565D4F] dark:text-[#BAC0B3]"
                      />
                      <input
                        type="text"
                        value={bookQuery}
                        onChange={(e) => setBookQuery(e.target.value)}
                        placeholder="Cari judul buku atau nomor rak..."
                        className="min-h-[44px] w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-[#304D42] dark:text-[#FFF9EF] placeholder-[#565D4F] dark:placeholder-[#BAC0B3] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                      />
                    </div>
                    <div className="divide-y divide-[#DEDDD0] dark:divide-[#3A5B4F] border border-[#DEDDD0] dark:border-[#3A5B4F] rounded-xl p-1 bg-white dark:bg-[#1B2E27]">
                      {filteredAvailableBooks.length === 0 ? (
                        <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] p-3 text-center">
                          Tidak ada buku fisik yang cocok di rak.
                        </p>
                      ) : (
                        filteredAvailableBooks.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setSelectedBookId(b.id);
                              setBookQuery(b.judul);
                            }}
                            className="min-h-[44px] w-full text-left px-3 py-2 rounded-lg hover:bg-[#F2ECDF] dark:hover:bg-[#233B32] transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF] truncate">
                                {b.judul}
                              </p>
                              <p className="text-[11px] text-[#565D4F] dark:text-[#BAC0B3] truncate">
                                {b.penulis} • {b.lokasiRak ? `Rak: ${b.lokasiRak}` : "Rak Perpustakaan"}
                              </p>
                            </div>
                            <span className="text-xs text-[#94492C] dark:text-[#E2AA90] font-semibold shrink-0">
                              Pilih
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Langkah 3: Durasi Pinjam & Simpan */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#DEDDD0] dark:border-[#3A5B4F]">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF] flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#565D4F] dark:text-[#BAC0B3]" />
                    Durasi Pinjam:
                  </span>
                  <div className="flex bg-[#EFECE4] dark:bg-[#1B2E27] p-1 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F]">
                    {[3, 7, 14].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDeadlineDays(d)}
                        className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          deadlineDays === d
                            ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs font-bold"
                            : "text-[#565D4F] dark:text-[#BAC0B3]"
                        }`}
                      >
                        {d} Hari
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!selectedUserId || !selectedBookId || isSubmittingBorrow}
                  className="min-h-[44px] px-6 py-2.5 bg-[#304D42] dark:bg-[#9E5336] hover:opacity-90 disabled:opacity-50 text-[#FFF9EF] rounded-xl text-xs font-bold transition-opacity cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  {isSubmittingBorrow ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Catat Peminjaman di Meja</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===== ALUR 3: PRESENSI MEJA & QR ===== */}
        {activeSubTab === "attendance" && (
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sisi Kiri: Rekam Kehadiran Siswa di Meja */}
              <div className="space-y-4">
                <div className="border-b border-[#DEDDD0] dark:border-[#3A5B4F] pb-2">
                  <h3 className="text-sm font-bold text-[#304D42] dark:text-[#FFF9EF]">
                    Presensi Manual Siswa
                  </h3>
                  <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3]">
                    Catat siswa yang hadir tanpa pemindaian ponsel.
                  </p>
                </div>

                <form onSubmit={handleWalkinAttendance} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF] block mb-1.5">
                      Nama Siswa:
                    </label>
                    <select
                      value={walkinUserId}
                      onChange={(e) => setWalkinUserId(e.target.value)}
                      className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                    >
                      <option value="">Pilih nama siswa...</option>
                      {users.map((u) => (
                        <option key={u.uid} value={u.uid}>
                          {u.nama} ({u.kelas || "Siswa"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF] block mb-1.5">
                      Tujuan Kunjungan:
                    </label>
                    <select
                      value={walkinPurpose}
                      onChange={(e) => setWalkinPurpose(e.target.value)}
                      className="min-h-[44px] w-full px-3.5 py-2 text-xs rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#94492C]"
                    >
                      <option value="Membaca Buku">Membaca Buku di Tempat</option>
                      <option value="Tugas Mandiri">Mengerjakan Tugas Sekolah</option>
                      <option value="Peminjaman Buku">Meminjam Koleksi Buku</option>
                      <option value="Pengembalian Buku">Mengembalikan Buku</option>
                      <option value="Diskusi Kelompok">Diskusi Kelompok Belajar</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={!walkinUserId || isSubmittingWalkin}
                    className="min-h-[44px] w-full px-5 py-2.5 bg-[#304D42] dark:bg-[#9E5336] hover:opacity-90 disabled:opacity-50 text-[#FFF9EF] rounded-xl text-xs font-bold transition-opacity cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    {isSubmittingWalkin ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <UserCheck size={16} />
                    )}
                    <span>Simpan Kehadiran Siswa</span>
                  </button>
                </form>
              </div>

              {/* Sisi Kanan: Lembar QR Code Presensi */}
              <div className="space-y-4">
                <div className="border-b border-[#DEDDD0] dark:border-[#3A5B4F] pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#304D42] dark:text-[#FFF9EF]">
                      QR Code Absensi Meja
                    </h3>
                    <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3]">
                      Pajang lembar ini di meja depan perpustakaan.
                    </p>
                  </div>

                  {onGenerateToken && (
                    <button
                      onClick={onGenerateToken}
                      disabled={generatingToken}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#1B2E27] text-xs font-semibold text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#E8EBDF] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {generatingToken ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RefreshCw size={13} />
                      )}
                      <span>Perbarui QR</span>
                    </button>
                  )}
                </div>

                {presensiConfig ? (
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#1B2E27] border border-[#DEDDD0] dark:border-[#3A5B4F] flex flex-col items-center text-center space-y-3">
                    <div id="presensi-qr-svg" className="p-3 bg-white rounded-xl border border-[#DEDDD0]">
                      <QRCodeSVG
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/scan?qr=${presensiConfig.qrCode}`}
                        size={150}
                        level="H"
                      />
                    </div>
                    <div className="text-xs">
                      <span className="text-[#565D4F] dark:text-[#BAC0B3]">Kode Token: </span>
                      <strong className="font-mono text-[#304D42] dark:text-[#FFF9EF]">
                        {presensiConfig.qrCode}
                      </strong>
                    </div>

                    {onDownloadQR && (
                      <button
                        onClick={onDownloadQR}
                        className="min-h-[44px] w-full px-4 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#E8EBDF] dark:bg-[#2C473D] hover:bg-[#d8decb] text-[#304D42] dark:text-[#FFF9EF] text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Unduh Lembar QR (PNG)</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-[#DEDDD0] dark:border-[#3A5B4F] text-center space-y-3">
                    <QrCode size={32} className="mx-auto text-[#565D4F] dark:text-[#BAC0B3]" />
                    <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3]">
                      QR Code absensi belum dibuat.
                    </p>
                    {onGenerateToken && (
                      <button
                        onClick={onGenerateToken}
                        disabled={generatingToken}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] text-xs font-bold cursor-pointer"
                      >
                        Buat QR Code Presensi
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AdminCard>

      {/* Modal Pembayaran Denda yang Bersahaja */}
      {fineModalData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFF9EF] dark:bg-[#1B2E27] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#DEDDD0] dark:border-[#3A5B4F] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#94492C]/15 dark:bg-[#E2AA90]/20 text-[#94492C] dark:text-[#E2AA90] flex items-center justify-center font-bold">
                  <AlertTriangle size={18} />
                </div>
                <h3 className="text-base font-bold text-[#304D42] dark:text-[#FFF9EF]">
                  Penyelesaian Denda Keterlambatan
                </h3>
              </div>
              <button
                onClick={() => setFineModalData(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF] rounded-xl cursor-pointer"
                aria-label="Tutup modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#F2ECDF] dark:bg-[#233B32] border border-[#DEDDD0] dark:border-[#3A5B4F] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#565D4F] dark:text-[#BAC0B3]">Peminjam:</span>
                <strong className="text-[#304D42] dark:text-[#FFF9EF]">
                  {fineModalData.userName}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#565D4F] dark:text-[#BAC0B3]">Judul Buku:</span>
                <strong className="text-[#304D42] dark:text-[#FFF9EF]">
                  {fineModalData.bookTitle}
                </strong>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#DEDDD0] dark:border-[#3A5B4F] text-sm">
                <span className="font-bold text-[#304D42] dark:text-[#FFF9EF]">
                  Nominal Denda:
                </span>
                <strong className="font-bold text-[#94492C] dark:text-[#E2AA90]">
                  Rp {fineModalData.fineAmount.toLocaleString("id-ID")}
                </strong>
              </div>
            </div>

            <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3]">
              Pilih tindakan penyelesaian denda di meja perpustakaan:
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleWaiveFine(fineModalData.borrowId)}
                disabled={isProcessingFine}
                className="min-h-[44px] flex-1 py-2.5 border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#E8EBDF] dark:bg-[#2C473D] hover:bg-[#d8decb] dark:hover:bg-[#37564A] text-[#304D42] dark:text-[#FFF9EF] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Bebaskan Denda
              </button>
              <button
                onClick={() => handlePayFine(fineModalData.borrowId)}
                disabled={isProcessingFine}
                className="min-h-[44px] flex-1 py-2.5 bg-[#304D42] dark:bg-[#9E5336] hover:opacity-90 text-[#FFF9EF] rounded-xl text-xs font-bold transition-opacity shadow-xs cursor-pointer"
              >
                Terima Tunai Lunas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
