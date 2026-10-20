import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserBorrows,
  calculateLevel,
  claimDailyXP,
  getFriendsCurrentlyReading,
  type Borrow,
  type Book,
} from "@/lib/firestore";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AvatarFrameModal } from "@/components/profile/AvatarFrameModal";
import { isFrameEventActive } from "@/lib/avatarFrames";
import {
  BookOpen,
  Clock,
  Trophy,
  ArrowRight,
  BookMarked,
  ClipboardCheck,
  Award,
  Flame,
  MessageCircle,
  StickyNote,
  Check,
  Bookmark,
  Calendar,
  Coffee,
  CheckCircle2,
  Compass,
  Palette,
  Gift,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QuestWidget } from "@/components/home/QuestWidget";
import { useToast } from "@/components/Toast";

// Status membaca santai & akrab untuk siswa
const READING_STATUSES = [
  { label: "Lagi Santai Membaca", icon: Coffee, color: "#AD6549" },
  { label: "Mengerjakan Tugas Kejuruan", icon: Bookmark, color: "#304D42" },
  { label: "Mencari Inspirasi Buku Baru", icon: Compass, color: "#797D6E" },
  { label: "Fokus Belajar Ujian", icon: CheckCircle2, color: "#304D42" },
];

export const StudentDeskDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [activeBorrows, setActiveBorrows] = useState<Borrow[]>([]);
  const [loadingBorrows, setLoadingBorrows] = useState(true);
  const [readingStatus, setReadingStatus] = useState<string>("Lagi Santai Membaca");
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showFrameModal, setShowFrameModal] = useState(false);
  const statusPickerRef = useRef<HTMLDivElement>(null);

  // Daily XP claim state
  const [claimingXP, setClaimingXP] = useState(false);
  const [claimedToday, setClaimedToday] = useState(false);

  // Friends currently reading state
  const [friendsReading, setFriendsReading] = useState<{ friendName: string; friendPhoto?: string; book: Book }[]>([]);

  useEffect(() => {
    if (user) {
      setLoadingBorrows(true);
      getUserBorrows(user.uid)
        .then((data) => {
          setActiveBorrows(data);
        })
        .finally(() => setLoadingBorrows(false));

      getFriendsCurrentlyReading(user.uid).then(setFriendsReading).catch(() => {});

      // Check if claimed today
      if (profile?.lastClaimedDailyXPDate) {
        const todayWIB = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
        if (profile.lastClaimedDailyXPDate === todayWIB) {
          setClaimedToday(true);
        }
      }
    }
  }, [user, profile]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusPickerRef.current && !statusPickerRef.current.contains(e.target as Node)) {
        setShowStatusPicker(false);
      }
    };
    if (showStatusPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStatusPicker]);

  if (!user || !profile) return null;

  const levelInfo = calculateLevel(profile.totalPoints || 0);

  // Sapaan ramah sesuai jam hari
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return "Selamat Pagi";
    if (hour >= 11 && hour < 15) return "Selamat Siang";
    if (hour >= 15 && hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  const handleClaimDailyXP = async () => {
    if (claimedToday || claimingXP) return;
    setClaimingXP(true);
    try {
      const res = await claimDailyXP(user.uid);
      if (res.success) {
        setClaimedToday(true);
        toast("success", `Selamat! +${res.pointsAwarded} poin membaca harian berhasil diklaim.`);
      } else if (res.alreadyClaimed) {
        setClaimedToday(true);
        toast("info", "Kamu sudah mengambil bonus poin membaca hari ini.");
      }
    } catch (err: any) {
      toast("error", "Gagal mengambil poin harian: " + err.message);
    } finally {
      setClaimingXP(false);
    }
  };

  // Progress percentage to next level (0-100)
  const xpProgress = Math.min(100, (profile.totalPoints || 0) % 100);

  return (
    <section className="bg-[#FFF9EF] border-b border-[#DEDDD0] pt-24 sm:pt-28 pb-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* DESK HEADER: Authentic Member Library Card & Daily Mood */}
        <div className="bg-[#F2ECDF] border border-[#DEDDD0] rounded-3xl sm:rounded-[36px] p-5 sm:p-8 shadow-xs relative overflow-hidden">
          {/* TACTILE CARD ACCENT: Library Pass Edge Stripes & Bookmark Tabs (Clean, non-overlapping) */}
          <div className="absolute top-0 right-8 sm:right-14 flex items-start gap-1 pointer-events-none z-10">
            <span className="w-2.5 h-3 sm:h-4 bg-[#AD6549] rounded-b-xs shadow-2xs" />
            <span className="w-2.5 h-4.5 sm:h-5.5 bg-[#304D42] rounded-b-xs shadow-2xs" />
            <span className="w-2.5 h-2.5 sm:h-3.5 bg-[#797D6E] rounded-b-xs shadow-2xs" />
          </div>

          {/* Precision Top-Edge Ruled Lines Accent */}
          <div className="absolute top-0 right-24 sm:right-32 hidden sm:flex items-center gap-1 pointer-events-none opacity-40">
            <span className="w-8 h-[2px] bg-[#304D42] rounded-full" />
            <span className="w-2 h-[2px] bg-[#304D42] rounded-full" />
            <span className="w-12 h-[2px] bg-[#AD6549] rounded-full" />
            <span className="w-2 h-[2px] bg-[#AD6549] rounded-full" />
            <span className="w-6 h-[2px] bg-[#797D6E] rounded-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Student ID Card Badge */}
            <div className="lg:col-span-7 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div
                className="relative cursor-pointer group shrink-0"
                onClick={() => setShowFrameModal(true)}
                title="Ganti bingkai avatar"
              >
                <UserAvatar
                  src={profile.photoURL}
                  name={profile.nama}
                  size="xl"
                  showBadge={!!profile.displayBadge}
                  badge={profile.displayBadge}
                  frame={profile.avatarFrame}
                  className="shadow-sm transition-transform group-hover:scale-105"
                />
                <span
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 border-2 border-[#FFF9EF] flex items-center justify-center text-white z-20 shadow-2xs"
                  title="Anggota Aktif"
                >
                  <Check size={11} />
                </span>
                <span
                  className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-[#AD6549] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs z-20"
                  title="Ganti Bingkai Avatar"
                >
                  <Palette size={12} />
                </span>
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#AD6549] font-bold bg-[#E8EBDF] px-2.5 py-0.5 rounded-full border border-[#DEDDD0]">
                    KARTU ANGGOTA PERPUS
                  </span>
                  <span className="text-[10px] font-mono text-[#797D6E]">
                    ID: @{profile.username || "anggota"}
                  </span>
                  {/* Micro library pass barcode ticks */}
                  <div className="hidden sm:flex items-center gap-[2.5px] opacity-40 pl-1 border-l border-[#DEDDD0]" title="Nomor Seri Anggota">
                    <span className="w-[1.5px] h-3 bg-[#304D42]" />
                    <span className="w-[2.5px] h-3 bg-[#304D42]" />
                    <span className="w-[1px] h-3 bg-[#304D42]" />
                    <span className="w-[3px] h-3 bg-[#304D42]" />
                    <span className="w-[1.5px] h-3 bg-[#304D42]" />
                    <span className="w-[2px] h-3 bg-[#304D42]" />
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-editorial text-[#304D42] truncate">
                  {getGreeting()}, {profile.nama?.split(" ")[0]}!
                </h1>

                {/* Level info & XP progress bar */}
                <div className="space-y-1 pt-0.5">
                  <p className="text-xs sm:text-sm text-[#797D6E] font-space">
                    Level {levelInfo.level} • {levelInfo.title} •{" "}
                    <strong className="text-[#AD6549] font-semibold">{profile.totalPoints || 0} Poin Baca</strong>
                  </p>
                  <div className="w-full max-w-xs h-1.5 bg-[#DEDDD0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#AD6549] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(10, xpProgress)}%` }}
                    />
                  </div>
                </div>

                {/* Actions: Mood Status Selector & Avatar Frame Button */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <div className="relative" ref={statusPickerRef}>
                    <button
                      type="button"
                      onClick={() => setShowStatusPicker(!showStatusPicker)}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8EBDF] hover:bg-[#DCE2CD] border border-[#DEDDD0] text-xs font-space text-[#304D42] transition-colors cursor-pointer shadow-2xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                      <span className="truncate max-w-[180px] sm:max-w-none">
                        Status: <strong>{readingStatus}</strong>
                      </span>
                      <span className="text-[10px] text-[#797D6E]">▾</span>
                    </button>

                    <AnimatePresence>
                      {showStatusPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className="absolute left-0 mt-2 w-64 bg-[#FFF9EF] border border-[#DEDDD0] rounded-2xl shadow-xl p-2 z-50"
                        >
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#797D6E] block px-3 py-1 font-bold">
                            Pilih Status Meja Bacamu
                          </span>
                          {READING_STATUSES.map((st) => (
                            <button
                              key={st.label}
                              type="button"
                              onClick={() => {
                                setReadingStatus(st.label);
                                setShowStatusPicker(false);
                                toast("success", `Status mejamu diperbarui: ${st.label}`);
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-space text-[#304D42] hover:bg-[#E8EBDF] transition-colors flex items-center gap-2.5 cursor-pointer"
                            >
                              <st.icon size={14} style={{ color: st.color }} />
                              <span>{st.label}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Frame Customization Button */}
                  <button
                    type="button"
                    onClick={() => setShowFrameModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF9EF] hover:bg-[#E8EBDF] border border-[#DEDDD0] text-xs font-space text-[#304D42] transition-colors cursor-pointer shadow-2xs"
                    title="Pilih atau ganti bingkai avatar profil"
                  >
                    <Palette size={13} className="text-[#AD6549]" />
                    <span>Ganti Bingkai</span>
                    {isFrameEventActive("grand_launch_2026").isActive && !(profile.unlockedFrames || []).includes("grand_launch_2026") && (
                      <span className="px-1.5 py-0.2 bg-[#AD6549] text-white text-[9px] font-bold rounded-full">
                        Event
                      </span>
                    )}
                  </button>
                </div>

                {/* Event Spesial Banner (Bebas Sparkles / Bintang Gajelas) */}
                {isFrameEventActive("grand_launch_2026").isActive && !(profile.unlockedFrames || []).includes("grand_launch_2026") && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-[#FFF9EF] border border-[#AD6549]/30 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#AD6549]/10 text-[#AD6549] flex items-center justify-center shrink-0">
                        <Gift size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-editorial font-bold text-[#304D42]">
                            Event Spesial: Pembukaan Gibry 2026
                          </p>
                          <span className="text-[9px] font-mono font-bold bg-[#AD6549] text-white px-1.5 py-0.5 rounded-full">
                            1 - 10 OKT 2026
                          </span>
                        </div>
                        <p className="text-[11px] font-space text-[#797D6E] mt-0.5">
                          Ambil bingkai profil emas eksklusif sebelum periode event berakhir.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFrameModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#AD6549] hover:bg-[#96553c] text-[#FFF9EF] text-xs font-space font-semibold transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      Ambil Bingkai Gratis
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Daily XP Claim & Reading Streak Card */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
              <div className="bg-[#E8EBDF]/70 border border-[#DEDDD0] rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#DCE2CD] text-[#304D42] flex items-center justify-center font-bold shrink-0">
                    <Flame size={19} className="text-[#AD6549]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[#797D6E] uppercase block font-semibold tracking-wider">
                      STREAK BACA
                    </span>
                    <span className="text-base font-editorial font-bold text-[#304D42]">
                      {profile.readingStreak || 1} Hari Berurutan
                    </span>
                  </div>
                </div>

                {/* Claim Daily XP Button */}
                <button
                  type="button"
                  onClick={handleClaimDailyXP}
                  disabled={claimedToday || claimingXP}
                  className={`px-3.5 py-2 rounded-xl text-xs font-space font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    claimedToday
                      ? "bg-[#DEDDD0] text-[#797D6E] cursor-default"
                      : "bg-[#AD6549] hover:bg-[#96553c] text-[#FFF9EF] shadow-xs active:scale-95"
                  }`}
                >
                  {claimedToday ? <CheckCircle2 size={13} /> : <Zap size={13} />}
                  <span>{claimedToday ? "Poin Diklaim ✓" : claimingXP ? "Mengklaim..." : "Klaim +15 Poin"}</span>
                </button>
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex items-center gap-2">
                <Link
                  to="/events"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#E8EBDF] hover:bg-[#DCE2CD] text-[#304D42] border border-[#DEDDD0] text-xs font-semibold font-space transition-colors text-center"
                >
                  <Award size={14} className="text-[#AD6549]" />
                  <span>Event & Misi</span>
                </Link>
                <Link
                  to="/attendance"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#304D42] hover:bg-[#233B32] text-[#FFF9EF] text-xs font-semibold font-space transition-colors text-center shadow-xs"
                >
                  <ClipboardCheck size={14} />
                  <span>Isi Kunjungan</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* TOOLBAR: Physical Library Tools Ribbon (Bahasa Umum & Akrab) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Katalog Buku", sub: "Cari & Pinjam Buku", path: "/books", icon: BookOpen, color: "#304D42" },
            { label: "Presensi Masuk", sub: "Isi Buku Kunjungan", path: "/attendance", icon: ClipboardCheck, color: "#AD6549" },
            { label: "Peringkat Pembaca", sub: "Pembaca Paling Rajin", path: "/leaderboard", icon: Trophy, color: "#304D42" },
            { label: "Klub Buku", sub: "Ruang Diskusi Bab", path: "/clubs", icon: BookMarked, color: "#AD6549" },
            { label: "Catatan Buku", sub: "Ringkasan & Catatanmu", path: "/notes", icon: StickyNote, color: "#304D42" },
            { label: "Ruang Komunitas", sub: "Kabar & Cerita Teman", path: "/social", icon: MessageCircle, color: "#AD6549" },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.path}
                to={action.path}
                className="bg-[#F2ECDF] border border-[#DEDDD0] rounded-2xl p-4 hover:border-[#AD6549] hover:shadow-xs transition-all hover:-translate-y-1 group flex flex-col justify-between relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ background: `${action.color}15`, color: action.color }}
                  >
                    <Icon size={17} />
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DEDDD0] group-hover:bg-[#AD6549] transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#304D42] leading-tight font-space">{action.label}</p>
                  <p className="text-[10px] text-[#797D6E] mt-0.5 font-space leading-tight">{action.sub}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* MIDDLE SECTION: Wooden Shelf (Active Borrows) + Community Pulse Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Active Borrows Shelf */}
          <div className="lg:col-span-7 bg-[#F2ECDF] border border-[#DEDDD0] rounded-3xl sm:rounded-[36px] p-5 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#DEDDD0]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#AD6549] font-bold">
                  BUKU PINJAMAN KAMU
                </span>
                <h3 className="text-xl sm:text-2xl font-editorial text-[#304D42] mt-0.5">
                  Rak Buku yang Sedang Kamu Pinjam
                </h3>
              </div>
              <Link
                to="/books"
                className="text-xs font-space font-semibold text-[#AD6549] hover:text-[#304D42] flex items-center gap-1"
              >
                <span>Cari Buku Lain</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            {loadingBorrows ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-[#E8EBDF] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : activeBorrows.length === 0 ? (
              /* Evocative Empty State: Open Book Stand */
              <div className="text-center py-10 px-4 bg-[#FFF9EF] border border-dashed border-[#DEDDD0] rounded-3xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#E8EBDF] text-[#AD6549] flex items-center justify-center mx-auto">
                  <BookOpen size={24} />
                </div>
                <h4 className="font-editorial text-lg text-[#304D42]">Meja Bacamu Masih Kosong Hari Ini</h4>
                <p className="text-xs text-[#797D6E] font-space max-w-sm mx-auto leading-relaxed">
                  Belum ada buku fisik atau modul yang sedang kamu pinjam. Jelajahi katalog buku untuk mulai membaca dan kumpulkan poin.
                </p>
                <div className="pt-2">
                  <Link
                    to="/books"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#304D42] text-[#FFF9EF] text-xs font-semibold font-space hover:bg-[#233B32] transition-colors shadow-xs"
                  >
                    <span>Cari Buku di Katalog</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ) : (
              /* Populated Bookshelf */
              <div className="space-y-3">
                {activeBorrows.map((b) => {
                  const days = Math.ceil((new Date(b.batasKembali).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isUrgent = days <= 3 && days > 0;
                  const isOverdue = days <= 0;
                  return (
                    <div
                      key={b.id}
                      className="bg-[#FFF9EF] border border-[#DEDDD0] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#AD6549]/60 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-16 rounded-xl overflow-hidden bg-[#E8EBDF] border border-[#DEDDD0] shrink-0 shadow-2xs">
                          {b.bookCover ? (
                            <img src={b.bookCover} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#797D6E]">
                              <BookOpen size={16} />
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-[#304D42] font-editorial line-clamp-1">{b.bookTitle}</h4>
                          <p className="text-[11px] font-space text-[#797D6E] mt-0.5">
                            Status: <span className="font-semibold text-[#304D42]">Sedang Dipinjam</span>
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                                isOverdue
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : isUrgent
                                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              <Clock size={10} />
                              {isOverdue
                                ? "Waktunya dikembalikan"
                                : isUrgent
                                ? `Batas ${days} hari lagi`
                                : `Tersisa ${days} hari lagi`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <Link
                          to="/notes"
                          className="px-3 py-1.5 rounded-xl bg-[#F2ECDF] border border-[#DEDDD0] text-[#304D42] hover:bg-[#E8EBDF] text-xs font-space font-medium transition-colors"
                        >
                          Tulis Catatan
                        </Link>
                        <Link
                          to={`/books?search=${encodeURIComponent(b.bookTitle || "")}`}
                          className="px-3 py-1.5 rounded-xl bg-[#304D42] hover:bg-[#233B32] text-[#FFF9EF] text-xs font-space font-medium transition-colors"
                        >
                          Lihat Buku
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Social Pulse Box (Inbound Pokes & Friends Reading) */}
          <div className="lg:col-span-5 bg-[#F2ECDF] border border-[#DEDDD0] rounded-3xl sm:rounded-[36px] p-5 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#DEDDD0]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#AD6549] font-bold">
                  AKTIVITAS TEMAN
                </span>
                <h3 className="text-xl sm:text-2xl font-editorial text-[#304D42] mt-0.5">
                  Kabar & Cerita Teman
                </h3>
              </div>
              <Link
                to="/social"
                className="text-xs font-space font-semibold text-[#AD6549] hover:text-[#304D42] flex items-center gap-1"
              >
                <span>Buka Komunitas</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            {/* Linimasa Kutipan Card */}
            <div className="space-y-3">
              <span className="text-[11px] font-mono uppercase text-[#797D6E] font-semibold block">
                Ruang Diskusi & Rekomendasi
              </span>
              <div className="bg-[#FFF9EF] border border-[#DEDDD0] rounded-2xl p-4 space-y-2.5">
                <p className="text-xs text-[#304D42] font-space leading-relaxed">
                  Bagikan kutipan menarik dari buku yang baru kamu baca atau tanyakan rekomendasi bacaan kepada teman sekelas.
                </p>
                <div className="pt-1 flex items-center justify-between">
                  <Link
                    to="/social"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#304D42] text-[#FFF9EF] text-xs font-space font-medium hover:bg-[#233B32] transition-colors"
                  >
                    <BookOpen size={12} />
                    <span>Lihat Obrolan Teman</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Friends Currently Reading Snapshot */}
            <div className="pt-2 border-t border-[#DEDDD0] space-y-3">
              <span className="text-[11px] font-mono uppercase text-[#797D6E] font-semibold block">
                Bacaan yang Dibagikan Teman
              </span>

              {friendsReading.length > 0 ? (
                <div className="space-y-2">
                  {friendsReading.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FFF9EF] border border-[#DEDDD0]">
                      <div className="w-8 h-8 rounded-full bg-[#DCE2CD] text-[#304D42] font-bold flex items-center justify-center text-xs shrink-0">
                        {item.friendName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#304D42] truncate font-space">{item.friendName}</p>
                        <p className="text-[10px] text-[#797D6E] truncate font-space">"{item.book.judul}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#FFF9EF] border border-[#DEDDD0] text-[11px] text-[#797D6E] font-space flex items-center justify-between">
                  <span>Belum ada bacaan yang dibagikan teman.</span>
                  <Link to="/social" className="text-[#AD6549] font-semibold hover:underline">
                    Cari Teman
                  </Link>
                </div>
              )}
            </div>

            {/* Tactile Study Desk Memo (Playful Sticky Note) */}
            <div className="p-3.5 rounded-2xl bg-[#FEF9E7] border border-[#E8DFBA] text-[#4A3F2C] relative shadow-2xs rotate-[-0.5deg]">
              <div className="flex items-center gap-1.5 mb-1">
                <Bookmark size={12} className="text-[#AD6549]" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#AD6549]">
                  CATATAN HARIAN
                </span>
              </div>
              <p className="text-xs font-space leading-relaxed text-[#5C5340]">
                Membaca 15 menit setiap hari melatih fokus dan memperkaya wawasan kejuruanmu. Terus semangat belajar!
              </p>
            </div>
          </div>
        </div>

        {/* WEEKLY QUEST WIDGET */}
        <div>
          <QuestWidget />
        </div>
      </div>

      {/* AVATAR FRAME CUSTOMIZATION MODAL */}
      {showFrameModal && (
        <AvatarFrameModal onClose={() => setShowFrameModal(false)} />
      )}
    </section>
  );
};

export default StudentDeskDashboard;
