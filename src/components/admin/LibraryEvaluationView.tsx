import React, { useState, useEffect, useMemo } from "react";
import type { Book, Borrow, UserProfile } from "@/lib/firestore";
import { getAllAttendance, type Attendance } from "@/lib/firestore";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Printer,
  FileSpreadsheet,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { exportToCsv } from "./shared/csvExport";
import { AdminCard, AdminCardHeader, AdminCardContent } from "./shared/AdminCard";
import { AdminBadge } from "./shared/AdminBadge";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useAdmin } from "@/hooks/useAdmin";
import { AuditLogTab } from "./tabs/AuditLogTab";

interface LibraryEvaluationViewProps {
  books: Book[];
  borrows: Borrow[];
  users: UserProfile[];
}

export function LibraryEvaluationView({
  books,
  borrows,
  users,
}: LibraryEvaluationViewProps) {
  const isDark = useDarkMode();
  const { isSuperAdmin } = useAdmin();

  const [activeReportTab, setActiveReportTab] = useState<"kpi" | "audit">("kpi");
  const [periodFilter, setPeriodFilter] = useState<"all" | "30days" | "7days">("all");

  const chartColors = useMemo(() => {
    return {
      areaStroke: isDark ? "#9E5336" : "#304D42",
      areaFill: isDark ? "#9E5336" : "#304D42",
      grid: isDark ? "#3A5B4F" : "#DEDDD0",
      axisTick: isDark ? "#BAC0B3" : "#565D4F",
      axisLine: isDark ? "#3A5B4F" : "#DEDDD0",
      genreBar: isDark ? "#9E5336" : "#304D42",
      tooltipBg: isDark ? "#233B32" : "#FFF9EF",
      tooltipBorder: isDark ? "#3A5B4F" : "#DEDDD0",
      tooltipText: isDark ? "#FFF9EF" : "#304D42",
    };
  }, [isDark]);

  // Filter peminjaman berdasarkan periode waktu
  const filteredBorrows = useMemo(() => {
    if (periodFilter === "all") return borrows;
    const now = new Date().getTime();
    const days = periodFilter === "7days" ? 7 : 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return borrows.filter((b) => {
      const t = new Date(b.tanggalPinjam).getTime();
      return !isNaN(t) && t >= cutoff;
    });
  }, [borrows, periodFilter]);

  // Evaluasi Metrik KPI Perpustakaan
  const metrics = useMemo(() => {
    const totalKoleksi = books.length;
    const totalTransaksi = filteredBorrows.length;
    const selesaiPinjam = filteredBorrows.filter((b) => b.status === "Dikembalikan");

    // Turnover Rate (Rasio Perputaran Koleksi)
    const turnoverRate =
      totalKoleksi > 0 ? (totalTransaksi / totalKoleksi).toFixed(2) : "0.00";

    // Kepatuhan Tepat Waktu
    let onTimeCount = 0;
    let lateCount = 0;
    selesaiPinjam.forEach((b) => {
      if (
        (b.denda && b.denda > 0) ||
        (b.tanggalKembali && new Date(b.tanggalKembali) > new Date(b.batasKembali))
      ) {
        lateCount++;
      } else {
        onTimeCount++;
      }
    });

    const now = new Date();
    filteredBorrows.forEach((b) => {
      if (b.status === "Dipinjam" && new Date(b.batasKembali) < now) {
        lateCount++;
      }
    });

    const totalEvaluatedReturns = onTimeCount + lateCount;
    const onTimeRate =
      totalEvaluatedReturns > 0
        ? Math.round((onTimeCount / totalEvaluatedReturns) * 100)
        : 100;

    // Rerata durasi peminjaman (hari)
    let totalDurasiHari = 0;
    let durasiSampleCount = 0;
    selesaiPinjam.forEach((b) => {
      if (b.tanggalPinjam && b.tanggalKembali) {
        const start = new Date(b.tanggalPinjam).getTime();
        const end = new Date(b.tanggalKembali).getTime();
        const diffDays = Math.max(
          1,
          Math.round((end - start) / (1000 * 60 * 60 * 24))
        );
        totalDurasiHari += diffDays;
        durasiSampleCount++;
      }
    });
    const avgBorrowDays =
      durasiSampleCount > 0
        ? (totalDurasiHari / durasiSampleCount).toFixed(1)
        : "7.0";

    return {
      totalKoleksi,
      totalTransaksi,
      turnoverRate,
      onTimeRate,
      onTimeCount,
      lateCount,
      avgBorrowDays,
    };
  }, [books, filteredBorrows]);

  // Data Runtun Waktu Tren Peminjaman (AreaChart)
  const borrowingTrendData = useMemo(() => {
    const days = periodFilter === "7days" ? 7 : periodFilter === "30days" ? 30 : 14;
    const now = new Date();
    const dateMap: Record<string, { label: string; dateKey: string; count: number; rawDate: Date }> = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      dateMap[dateKey] = { label, dateKey, count: 0, rawDate: d };
    }

    filteredBorrows.forEach((b) => {
      if (!b.tanggalPinjam) return;
      const bDate = new Date(b.tanggalPinjam);
      if (isNaN(bDate.getTime())) return;
      const bKey = bDate.toISOString().split("T")[0];
      if (dateMap[bKey]) {
        dateMap[bKey].count += 1;
      } else if (periodFilter === "all") {
        const label = bDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        dateMap[bKey] = { label, dateKey: bKey, count: 1, rawDate: bDate };
      }
    });

    return Object.values(dateMap)
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())
      .map((item) => ({
        tanggal: item.label,
        peminjaman: item.count,
      }));
  }, [filteredBorrows, periodFilter]);

  // Sebaran Minat Genre (BarChart)
  const genreChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredBorrows.forEach((b) => {
      const bookObj = books.find((x) => x.id === b.bookId);
      const genre = bookObj?.genre || "Lainnya";
      counts[genre] = (counts[genre] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([genre, count]) => ({
        genre,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredBorrows, books]);

  // Ekspor Rekap Transaksi CSV
  function handleExportCSV() {
    exportToCsv(
      filteredBorrows,
      [
        { header: "ID Transaksi", accessor: (b) => b.id },
        { header: "Judul Buku", accessor: (b) => b.bookTitle || "Buku" },
        { header: "Nama Peminjam", accessor: (b) => b.userName || "Siswa" },
        { header: "Tanggal Pinjam", accessor: (b) => b.tanggalPinjam || "-" },
        { header: "Batas Kembali", accessor: (b) => b.batasKembali || "-" },
        { header: "Tanggal Kembali", accessor: (b) => b.tanggalKembali || "-" },
        { header: "Status Peminjaman", accessor: (b) => b.status || "-" },
        { header: "Nominal Denda (Rp)", accessor: (b) => b.denda || 0 },
      ],
      `laporan-kinerja-perpustakaan-${new Date().toISOString().slice(0, 10)}`
    );
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header Utama & Segmented Selector (Laporan vs Audit) */}
      <AdminCard className="p-5 print:shadow-none print:border-none print:p-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#304D42] dark:text-[#FFF9EF] tracking-tight">
              Laporan & Evaluasi Perpustakaan
            </h2>
            <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] mt-0.5">
              Analisis perputaran koleksi buku, kedisiplinan pengembalian siswa, dan log keamanan sistem.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {isSuperAdmin && (
              <div className="flex bg-[#EFECE4] dark:bg-[#1B2E27] p-1 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F]">
                <button
                  onClick={() => setActiveReportTab("kpi")}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeReportTab === "kpi"
                      ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs"
                      : "text-[#565D4F] dark:text-[#BAC0B3]"
                  }`}
                >
                  Statistik Perpustakaan
                </button>
                <button
                  onClick={() => setActiveReportTab("audit")}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeReportTab === "audit"
                      ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs"
                      : "text-[#565D4F] dark:text-[#BAC0B3]"
                  }`}
                >
                  Log Audit Sistem
                </button>
              </div>
            )}

            {activeReportTab === "kpi" && (
              <>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#E8EBDF] dark:bg-[#1B2E27] dark:hover:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF] rounded-xl text-xs font-semibold transition-colors border border-[#DEDDD0] dark:border-[#3A5B4F] cursor-pointer shadow-2xs"
                  title="Unduh laporan dalam format CSV aman"
                >
                  <FileSpreadsheet size={15} />
                  <span>Ekspor CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Cetak Laporan</span>
                </button>
              </>
            )}
          </div>
        </div>
      </AdminCard>

      {/* Konten Log Audit jika dipilih oleh Admin */}
      {activeReportTab === "audit" && isSuperAdmin ? (
        <AuditLogTab />
      ) : (
        <div className="space-y-5">
          {/* 3 Indikator Pokok (Turnover, Kepatuhan, Durasi) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Indikator 1: Turnover */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#233B32] shadow-2xs">
              <span className="text-xs font-semibold text-[#565D4F] dark:text-[#BAC0B3]">
                Rasio Perputaran Koleksi
              </span>
              <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#304D42] dark:text-[#FFF9EF] tracking-tight">
                {metrics.turnoverRate}x
              </div>
              <p className="mt-1 text-[11px] text-[#565D4F] dark:text-[#BAC0B3]">
                Total {metrics.totalTransaksi} transaksi dari {metrics.totalKoleksi} judul buku
              </p>
            </div>

            {/* Indikator 2: Kepatuhan */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#233B32] shadow-2xs">
              <span className="text-xs font-semibold text-[#565D4F] dark:text-[#BAC0B3]">
                Kepatuhan Pengembalian
              </span>
              <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#304D42] dark:text-[#FFF9EF] tracking-tight">
                {metrics.onTimeRate}%
              </div>
              <p className="mt-1 text-[11px] text-[#565D4F] dark:text-[#BAC0B3]">
                {metrics.onTimeCount} tepat waktu, {metrics.lateCount} terlambat
              </p>
            </div>

            {/* Indikator 3: Durasi Pinjam */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#233B32] shadow-2xs">
              <span className="text-xs font-semibold text-[#565D4F] dark:text-[#BAC0B3]">
                Rata-rata Durasi Pinjam
              </span>
              <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#304D42] dark:text-[#FFF9EF] tracking-tight">
                {metrics.avgBorrowDays} Hari
              </div>
              <p className="mt-1 text-[11px] text-[#565D4F] dark:text-[#BAC0B3]">
                Waktu peminjaman siswa sebelum pengembalian
              </p>
            </div>
          </div>

          {/* Pemilih Periode Waktu yang Rapi */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#233B32]">
            <span className="text-xs font-semibold text-[#565D4F] dark:text-[#BAC0B3]">
              Rentang Periode Laporan:
            </span>
            <div className="flex bg-[#EFECE4] dark:bg-[#1B2E27] p-1 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F]">
              <button
                type="button"
                onClick={() => setPeriodFilter("all")}
                className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  periodFilter === "all"
                    ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs font-bold"
                    : "text-[#565D4F] dark:text-[#BAC0B3]"
                }`}
              >
                Semua Waktu
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter("30days")}
                className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  periodFilter === "30days"
                    ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs font-bold"
                    : "text-[#565D4F] dark:text-[#BAC0B3]"
                }`}
              >
                30 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter("7days")}
                className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  periodFilter === "7days"
                    ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs font-bold"
                    : "text-[#565D4F] dark:text-[#BAC0B3]"
                }`}
              >
                7 Hari Terakhir
              </button>
            </div>
          </div>

          {/* 2 Visualisasi Grafik yang Tenang */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Grafik 1: Tren Peminjaman Buku */}
            <AdminCard className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-[#304D42] dark:text-[#FFF9EF]">
                  Tren Sirkulasi Peminjaman Buku
                </h3>
                <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3]">
                  Aktivitas peminjaman buku oleh siswa sepanjang waktu
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={borrowingTrendData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis
                      dataKey="tanggal"
                      tick={{ fill: chartColors.axisTick, fontSize: 11 }}
                      stroke={chartColors.axisLine}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: chartColors.axisTick, fontSize: 11 }}
                      stroke={chartColors.axisLine}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartColors.tooltipBg,
                        borderColor: chartColors.tooltipBorder,
                        borderRadius: "0.75rem",
                        color: chartColors.tooltipText,
                        fontSize: "0.75rem",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="peminjaman"
                      stroke={chartColors.areaStroke}
                      fill={chartColors.areaFill}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </AdminCard>

            {/* Grafik 2: Sebaran Genre Populer */}
            <AdminCard className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-[#304D42] dark:text-[#FFF9EF]">
                  Kategori Genre Paling Diminati
                </h3>
                <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3]">
                  5 kategori buku dengan frekuensi peminjaman tertinggi
                </p>
              </div>

              <div className="h-64 w-full">
                {genreChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#565D4F] dark:text-[#BAC0B3]">
                    Belum ada riwayat transaksi genre
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={genreChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis
                        dataKey="genre"
                        tick={{ fill: chartColors.axisTick, fontSize: 11 }}
                        stroke={chartColors.axisLine}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: chartColors.axisTick, fontSize: 11 }}
                        stroke={chartColors.axisLine}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chartColors.tooltipBg,
                          borderColor: chartColors.tooltipBorder,
                          borderRadius: "0.75rem",
                          color: chartColors.tooltipText,
                          fontSize: "0.75rem",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill={chartColors.genreBar}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </AdminCard>
          </div>
        </div>
      )}
    </div>
  );
}
