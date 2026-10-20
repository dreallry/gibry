import { useState } from "react";
import { Megaphone, Target, Gift, BookMarked, Lightbulb, ShieldAlert, Plus, Trash2, Award } from "lucide-react";
import { AdminCard } from "../shared/AdminCard";
import { AdminBadge } from "../shared/AdminBadge";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import type { Announcement, SeasonalEvent, Reward, RewardRedemption, BookSuggestion, ContentReport, ReadingList } from "@/lib/firestore";

interface CommunityProgramsTabProps {
  initialSubTab?: "announcements" | "events" | "rewards" | "reading_lists" | "suggestions" | "moderation";
  announcements: Announcement[];
  events: SeasonalEvent[];
  rewards: Reward[];
  redemptions: RewardRedemption[];
  readingLists: ReadingList[];
  // Usulan Buku Siswa
  suggestions?: BookSuggestion[];
  loadingSuggestions?: boolean;
  processingSuggestionId?: string | null;
  onUpdateSuggestion?: (suggestionId: string, status: BookSuggestion["status"], note?: string) => void;
  onDeleteSuggestion?: (suggestionId: string) => void;
  // Moderasi Ulasan
  reports?: ContentReport[];
  loadingReports?: boolean;
  reportFilter?: "pending" | "all";
  onReportFilterChange?: (filter: "pending" | "all") => void;
  processingReportId?: string | null;
  onProcessReport?: (reportId: string, action: NonNullable<ContentReport['actionTaken']>, note?: string) => void;
  onBanReportedUser?: (report: ContentReport) => void;
  // Handler Modal CRUD
  onOpenAddAnnouncement: () => void;
  onDeleteAnnouncement: (id: string) => void;
  onOpenAddEvent: () => void;
  onDeleteEvent: (id: string) => void;
  onOpenAddReward: () => void;
  onDeleteReward: (id: string) => void;
  onProcessRedemption: (id: string, status: "approved" | "rejected") => void;
  onOpenAddReadingList: () => void;
  onDeleteReadingList: (id: string) => void;
}

type SubTab = "announcements" | "events" | "rewards" | "reading_lists" | "suggestions" | "moderation";

export function CommunityProgramsTab({
  initialSubTab = "announcements",
  announcements,
  events,
  rewards,
  redemptions,
  readingLists,
  suggestions = [],
  loadingSuggestions = false,
  processingSuggestionId = null,
  onUpdateSuggestion,
  onDeleteSuggestion,
  reports = [],
  loadingReports = false,
  reportFilter = "pending",
  onReportFilterChange,
  processingReportId = null,
  onProcessReport,
  onBanReportedUser,
  onOpenAddAnnouncement,
  onDeleteAnnouncement,
  onOpenAddEvent,
  onDeleteEvent,
  onOpenAddReward,
  onDeleteReward,
  onProcessRedemption,
  onOpenAddReadingList,
  onDeleteReadingList,
}: CommunityProgramsTabProps) {
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab);

  const pendingRedemptions = redemptions.filter((r) => r.status === "pending");
  const pendingSuggestions = suggestions.filter((s) => s.status === "open");
  const pendingReports = reports.filter((r) => r.status === "pending");

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header & Sub-tab Switcher */}
      <AdminCard>
        <div className="p-4 sm:p-5 border-b border-[#DEDDD0] dark:border-[#3A5B4F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#304D42] dark:text-[#FFF9EF] tracking-tight">
              Program Literasi & Komunitas
            </h2>
            <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] mt-0.5">
              Pusat interaksi pembaca: mading sekolah, tantangan baca, katalog hadiah, usulan buku, dan moderasi ulasan.
            </p>
          </div>

          <div>
            {subTab === "announcements" && (
              <button
                type="button"
                onClick={onOpenAddAnnouncement}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#304D42] dark:bg-[#9E5336] hover:opacity-90 text-[#FFF9EF] text-xs font-bold transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={15} />
                <span>Buat Pengumuman</span>
              </button>
            )}
            {subTab === "events" && (
              <button
                type="button"
                onClick={onOpenAddEvent}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#304D42] dark:bg-[#9E5336] hover:opacity-90 text-[#FFF9EF] text-xs font-bold transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={15} />
                <span>Buat Tantangan</span>
              </button>
            )}
            {subTab === "rewards" && (
              <button
                type="button"
                onClick={onOpenAddReward}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#304D42] dark:bg-[#9E5336] hover:opacity-90 text-[#FFF9EF] text-xs font-bold transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={15} />
                <span>Tambah Hadiah</span>
              </button>
            )}
            {subTab === "reading_lists" && (
              <button
                type="button"
                onClick={onOpenAddReadingList}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#304D42] dark:bg-[#9E5336] hover:opacity-90 text-[#FFF9EF] text-xs font-bold transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={15} />
                <span>Buat Koleksi Rekomendasi</span>
              </button>
            )}
          </div>
        </div>

        {/* Pilihan Sub-Tab Program Berbasis Segmented Bar */}
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap gap-1.5 bg-[#EFECE4] dark:bg-[#1B2E27] p-1.5 rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F]">
            <button
              onClick={() => setSubTab("announcements")}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${subTab === "announcements"
                  ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs"
                  : "text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF]"
                }`}
            >
              <Megaphone size={14} />
              <span>Mading ({announcements.length})</span>
            </button>

            <button
              onClick={() => setSubTab("events")}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${subTab === "events"
                  ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs"
                  : "text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF]"
                }`}
            >
              <Target size={14} />
              <span>Tantangan ({events.length})</span>
            </button>

            <button
              onClick={() => setSubTab("rewards")}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${subTab === "rewards"
                  ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs"
                  : "text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF]"
                }`}
            >
              <Gift size={14} />
              <span>Hadiah ({rewards.length})</span>
              {pendingRedemptions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-[#94492C] text-white text-[10px]">
                  {pendingRedemptions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setSubTab("suggestions")}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${subTab === "suggestions"
                  ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs"
                  : "text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF]"
                }`}
            >
              <Lightbulb size={14} />
              <span>Usulan Siswa ({suggestions.length})</span>
              {pendingSuggestions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-[#94492C] text-white text-[10px]">
                  {pendingSuggestions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setSubTab("moderation")}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${subTab === "moderation"
                  ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs"
                  : "text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF]"
                }`}
            >
              <ShieldAlert size={14} />
              <span>Moderasi ({reports.length})</span>
              {pendingReports.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-[#94492C] text-white text-[10px]">
                  {pendingReports.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setSubTab("reading_lists")}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${subTab === "reading_lists"
                  ? "bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] shadow-2xs"
                  : "text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF]"
                }`}
            >
              <BookMarked size={14} />
              <span>Koleksi Rekomendasi ({readingLists.length})</span>
            </button>
          </div>
        </div>
      </AdminCard>

      {/* ===== 1. PENGUMUMAN MADING ===== */}
      {subTab === "announcements" && (
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <AdminCard className="p-12 text-center">
              <AdminEmptyState
                icon={Megaphone}
                title="Belum Ada Pengumuman"
                description="Buat pengumuman mading baru untuk mengabarkan jam operasional, agenda membaca, atau koleksi buku baru."
              />
            </AdminCard>
          ) : (
            announcements.map((a) => (
              <AdminCard key={a.id} className="p-5 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <h4 className="text-sm font-bold text-[#304D42] dark:text-[#FFF9EF]">
                    {a.title}
                  </h4>
                  <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] whitespace-pre-line leading-relaxed">
                    {a.body}
                  </p>
                  <p className="text-[10px] text-[#565D4F] dark:text-[#BAC0B3] pt-1">
                    Diterbitkan: {new Date(a.createdAt || 0).toLocaleString("id-ID")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteAnnouncement(a.id)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#94492C] dark:hover:text-[#E2AA90] rounded-xl hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer"
                  title="Hapus pengumuman"
                  aria-label="Hapus pengumuman"
                >
                  <Trash2 size={16} />
                </button>
              </AdminCard>
            ))
          )}
        </div>
      )}

      {/* ===== 2. TANTANGAN MEMBACA ===== */}
      {subTab === "events" && (
        <div className="space-y-3">
          {events.length === 0 ? (
            <AdminCard className="p-12 text-center">
              <AdminEmptyState
                icon={Target}
                title="Belum Ada Tantangan Membaca"
                description="Ajak siswa berpartisipasi dalam tantangan membaca buku per semester dengan imbalan poin literasi."
              />
            </AdminCard>
          ) : (
            events.map((ev) => (
              <AdminCard key={ev.id} className="p-5 flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <AdminBadge variant="success">
                      {ev.type === "reading_challenge"
                        ? "Target Buku"
                        : ev.type === "streak_challenge"
                          ? "Konsistensi"
                          : "Eksplorasi Genre"}
                    </AdminBadge>
                    <h4 className="text-sm font-bold text-[#304D42] dark:text-[#FFF9EF]">
                      {ev.title}
                    </h4>
                  </div>
                  {ev.description && (
                    <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3]">
                      {ev.description}
                    </p>
                  )}
                  <p className="text-[11px] text-[#565D4F] dark:text-[#BAC0B3] flex items-center gap-2">
                    <span>
                      Periode: {new Date(ev.startDate).toLocaleDateString("id-ID")} sampai{" "}
                      {new Date(ev.endDate).toLocaleDateString("id-ID")}
                    </span>
                    <span>• Target: {ev.rules?.target || 0} buku</span>
                    <span>• Imbalan: {ev.rewards?.points || 0} poin</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteEvent(ev.id)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#94492C] dark:hover:text-[#E2AA90] rounded-xl hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer"
                  title="Hapus tantangan"
                  aria-label="Hapus tantangan"
                >
                  <Trash2 size={16} />
                </button>
              </AdminCard>
            ))
          )}
        </div>
      )}

      {/* ===== 3. HADIAH & POIN SISWA ===== */}
      {subTab === "rewards" && (
        <div className="space-y-4">
          {/* Antrean Klaim Hadiah Siswa */}
          {pendingRedemptions.length > 0 && (
            <AdminCard className="p-5 space-y-3 border-l-4 border-l-[#94492C]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF] flex items-center gap-2">
                  <Award size={16} className="text-[#94492C] dark:text-[#E2AA90]" />
                  <span>Klaim Hadiah Menunggu Persetujuan ({pendingRedemptions.length})</span>
                </h4>
              </div>

              <div className="divide-y divide-[#DEDDD0] dark:divide-[#3A5B4F]">
                {pendingRedemptions.map((rd) => (
                  <div
                    key={rd.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF]">
                        {rd.userName || "Siswa"}
                      </p>
                      <p className="text-[11px] text-[#565D4F] dark:text-[#BAC0B3]">
                        {rd.rewardTitle} • Menukarkan {rd.pointsSpent} poin
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onProcessRedemption(rd.id, "rejected")}
                        className="min-h-[44px] px-3 py-1.5 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-semibold text-[#565D4F] dark:text-[#BAC0B3] hover:bg-[#E8EBDF] transition-colors cursor-pointer"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => onProcessRedemption(rd.id, "approved")}
                        className="min-h-[44px] px-4 py-1.5 rounded-xl bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] text-xs font-bold transition-opacity hover:opacity-90 cursor-pointer shadow-xs"
                      >
                        Setujui & Serahkan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          )}

          {/* Daftar Katalog Hadiah */}
          {rewards.length === 0 ? (
            <AdminCard className="p-12 text-center">
              <AdminEmptyState
                icon={Gift}
                title="Belum Ada Hadiah"
                description="Tambahkan merchandise atau keuntungan peminjaman yang dapat ditukarkan siswa dengan poin literasi."
              />
            </AdminCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {rewards.map((rw) => (
                <AdminCard key={rw.id} className="p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF]">
                        {rw.title}
                      </h4>
                      <AdminBadge variant="neutral">
                        {rw.stock} Tersisa
                      </AdminBadge>
                    </div>
                    {rw.description && (
                      <p className="text-[11px] text-[#565D4F] dark:text-[#BAC0B3] mt-1 line-clamp-2">
                        {rw.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#DEDDD0] dark:border-[#3A5B4F]">
                    <span className="font-bold text-xs text-[#94492C] dark:text-[#E2AA90]">
                      {rw.pointsCost} Poin
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteReward(rw.id)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#94492C] dark:hover:text-[#E2AA90] rounded-lg transition-colors cursor-pointer"
                      title="Hapus hadiah"
                      aria-label="Hapus hadiah"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </AdminCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== 4. USULAN BUKU SISWA ===== */}
      {subTab === "suggestions" && (
        <div className="space-y-3">
          {loadingSuggestions ? (
            <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] text-center py-8">
              Memuat data usulan buku...
            </p>
          ) : suggestions.length === 0 ? (
            <AdminCard className="p-12 text-center">
              <AdminEmptyState
                icon={Lightbulb}
                title="Belum Ada Usulan Buku"
                description="Siswa dapat mengusulkan buku yang mereka minati untuk dipertimbangkan dalam pengadaan koleksi."
              />
            </AdminCard>
          ) : (
            suggestions.map((s) => {
              const isProcessing = processingSuggestionId === s.id;
              return (
                <AdminCard key={s.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#304D42] dark:text-[#FFF9EF] truncate">
                        {s.title}
                      </h4>
                      <span className="text-xs text-[#565D4F] dark:text-[#BAC0B3]">
                        oleh {s.author}
                      </span>
                    </div>
                    {s.reason && (
                      <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] italic">
                        "{s.reason}"
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-[#565D4F] dark:text-[#BAC0B3]">
                      <span>Diusulkan oleh: {s.userName || "Siswa"}</span>
                      <span>•</span>
                      <span className="font-semibold text-[#94492C] dark:text-[#E2AA90]">
                        {s.voteCount || 0} Dukungan
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <AdminBadge
                      variant={
                        s.status === "accepted"
                          ? "success"
                          : s.status === "rejected"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {s.status === "accepted"
                        ? "Disetujui"
                        : s.status === "rejected"
                          ? "Ditolak"
                          : "Menunggu"}
                    </AdminBadge>

                    {s.status === "open" && onUpdateSuggestion && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onUpdateSuggestion(s.id, "accepted")}
                          disabled={isProcessing}
                          className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          Terima Usulan
                        </button>
                        <button
                          onClick={() => onUpdateSuggestion(s.id, "rejected")}
                          disabled={isProcessing}
                          className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-semibold text-[#565D4F] dark:text-[#BAC0B3] hover:bg-[#E8EBDF] transition-colors cursor-pointer"
                        >
                          Tolak
                        </button>
                      </div>
                    )}

                    {onDeleteSuggestion && (
                      <button
                        onClick={() => onDeleteSuggestion(s.id)}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#94492C] rounded-xl transition-colors cursor-pointer"
                        title="Hapus usulan"
                        aria-label="Hapus usulan"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </AdminCard>
              );
            })
          )}
        </div>
      )}

      {/* ===== 5. MODERASI ULASAN ===== */}
      {subTab === "moderation" && (
        <div className="space-y-3">
          {/* Filter Status Moderasi */}
          {onReportFilterChange && (
            <div className="flex gap-2">
              <button
                onClick={() => onReportFilterChange("pending")}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border border-[#DEDDD0] dark:border-[#3A5B4F] ${reportFilter === "pending"
                    ? "bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF]"
                    : "bg-white dark:bg-[#1B2E27] text-[#565D4F] dark:text-[#BAC0B3]"
                  }`}
              >
                Menunggu Peninjauan ({pendingReports.length})
              </button>
              <button
                onClick={() => onReportFilterChange("all")}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border border-[#DEDDD0] dark:border-[#3A5B4F] ${reportFilter === "all"
                    ? "bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF]"
                    : "bg-white dark:bg-[#1B2E27] text-[#565D4F] dark:text-[#BAC0B3]"
                  }`}
              >
                Semua Riwayat ({reports.length})
              </button>
            </div>
          )}

          {loadingReports ? (
            <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] text-center py-8">
              Memuat data laporan konten...
            </p>
          ) : reports.length === 0 ? (
            <AdminCard className="p-12 text-center">
              <AdminEmptyState
                icon={ShieldAlert}
                title="Tidak Ada Laporan Konten"
                description="Ulasan dan komentar dari komunitas siswa terpantau bersih dan aman."
              />
            </AdminCard>
          ) : (
            reports.map((r) => {
              const isProcessing = processingReportId === r.id;
              return (
                <AdminCard key={r.id} className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <AdminBadge variant="danger">
                          {r.reason || "Laporan Pelanggaran"}
                        </AdminBadge>
                        <span className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF]">
                          Pelapor: {r.reporterName || "Siswa"}
                        </span>
                      </div>
                      <p className="text-xs text-[#565D4F] dark:text-[#BAC0B3] mt-1.5 bg-[#EFECE4] dark:bg-[#1B2E27] p-2.5 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] italic">
                        "{r.contentSnapshot || "Konten tidak tersedia"}"
                      </p>
                    </div>

                    <AdminBadge
                      variant={r.status === "pending" ? "warning" : "neutral"}
                    >
                      {r.status === "pending" ? "Menunggu Tindakan" : "Selesai"}
                    </AdminBadge>
                  </div>

                  {r.status === "pending" && onProcessReport && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DEDDD0] dark:border-[#3A5B4F]">
                      <button
                        onClick={() => onProcessReport(r.id, "none")}
                        disabled={isProcessing}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] text-xs font-semibold text-[#565D4F] dark:text-[#BAC0B3] hover:bg-[#E8EBDF] transition-colors cursor-pointer"
                      >
                        Abaikan Laporan
                      </button>
                      <button
                        onClick={() => onProcessReport(r.id, "content_deleted")}
                        disabled={isProcessing}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#FDF2EE] dark:bg-[#3D251D] border border-[#F1D2C8] dark:border-[#5C392D] text-[#94492C] dark:text-[#EAA48F] text-xs font-bold hover:bg-[#FBE4DD] transition-colors cursor-pointer"
                      >
                        Hapus Konten
                      </button>
                      {onBanReportedUser && r.targetUserId && (
                        <button
                          onClick={() => onBanReportedUser(r)}
                          disabled={isProcessing}
                          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          Blokir Akun
                        </button>
                      )}
                    </div>
                  )}
                </AdminCard>
              );
            })
          )}
        </div>
      )}

      {/* ===== 6. DAFTAR KOLEKSI REKOMENDASI ===== */}
      {subTab === "reading_lists" && (
        <div className="space-y-3">
          {readingLists.length === 0 ? (
            <AdminCard className="p-12 text-center">
              <AdminEmptyState
                icon={BookMarked}
                title="Belum Ada Koleksi Rekomendasi"
                description="Kurasi daftar buku pilihan seperti 'Buku Wajib Kelas X' atau 'Pilihan Pustakawan Bulan Ini'."
              />
            </AdminCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {readingLists.map((rl) => (
                <AdminCard key={rl.id} className="p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF]">
                      {rl.title}
                    </h4>
                    {rl.description && (
                      <p className="text-[11px] text-[#565D4F] dark:text-[#BAC0B3] mt-1 line-clamp-2">
                        {rl.description}
                      </p>
                    )}
                    <span className="inline-block mt-2 text-[10px] text-[#565D4F] dark:text-[#BAC0B3]">
                      {rl.bookIds?.length || 0} buku dalam koleksi ini
                    </span>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-[#DEDDD0] dark:border-[#3A5B4F]">
                    <button
                      type="button"
                      onClick={() => onDeleteReadingList(rl.id)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#94492C] dark:hover:text-[#E2AA90] rounded-lg transition-colors cursor-pointer"
                      title="Hapus koleksi"
                      aria-label="Hapus koleksi"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </AdminCard>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
