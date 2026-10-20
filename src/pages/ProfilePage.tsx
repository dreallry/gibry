import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { getUserBorrows, getUserFavoriteBooks, getUserAttendance, getUserAttendanceStats, getUserWishlist, updateUserProfile, returnBook, toggleFavorite, toggleWishlist, getFineRate, calculateLevel, checkAndAwardDisplayBadges, type Borrow, type Book, type Attendance } from "@/lib/firestore";
import { LogOut, Edit3, BookOpen, Heart, Clock, AlertTriangle, X, Loader2, Calendar, ArrowLeftRight, MapPin, Phone, Camera, Users, Shield, Mail, CheckCircle2, Award, TrendingUp, Bookmark, Settings, Flame, Snowflake, CreditCard, ArrowRight, Timer, RotateCcw, Sparkles } from "lucide-react";
import { ProfileSkeleton } from "@/components/Skeleton";
import { Achievements } from "@/components/profile/Achievements";
import { ReadingStats } from "@/components/profile/ReadingStats";
import { ReadingGoalWidget } from "@/components/profile/ReadingGoal";
import { PageTransition } from "@/components/PageTransition";
import { UserAvatar, BadgeIcon } from "@/components/ui/user-avatar";
import { BadgeSelector } from "@/components/profile/BadgeSelector";
import { AvatarFrameModal } from "@/components/profile/AvatarFrameModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SettingsModal } from "@/components/SettingsModal";
import { MidtransPaymentModal } from "@/components/ui/MidtransPaymentModal";
import { ImageCropModal } from "@/components/profile/ImageCropModal";

// Extract WIB time directly from stored string (already in WIB)
function formatWIBTime(wibStr: string): string {
  const timePart = wibStr.includes("T") ? wibStr.split("T")[1] : wibStr;
  return (timePart || "??:??").slice(0, 5) + " WIB";
}

function formatWIBDateTime(wibStr: string): string {
  const [datePart, timePart] = wibStr.split("T");
  if (!datePart) return wibStr;
  const [, mm, dd] = datePart.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const monthName = months[parseInt(mm, 10) - 1] || mm;
  const time = (timePart || "").slice(0, 5);
  return `${dd} ${monthName} ${time}`;
}

export default function ProfilePage() {
  const { user, profile, loading: authLoading, logout, refreshProfile, changePassword, sendVerificationEmail } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [favorites, setFavorites] = useState<Book[]>([]);
  const [wishlist, setWishlist] = useState<Book[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<{ totalVisits: number; totalDurationMinutes: number; avgDurationMinutes: number } | null>(null);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "account">("profile");
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showBadgeSelector, setShowBadgeSelector] = useState(false);
  const [showFrameModal, setShowFrameModal] = useState(false);
  const [selectedBorrowForPayment, setSelectedBorrowForPayment] = useState<Borrow | null>(null);
  const [showMidtransModal, setShowMidtransModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; data?: any } | null>(null);
  const [editData, setEditData] = useState({ nama: "", email: "", alamat: "", noTelp: "" });
  const [returning, setReturning] = useState<string | null>(null);
  const [returnMsg, setReturnMsg] = useState<{ borrowId: string; fine: number } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const loadUserData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [b, f, w, a, badges] = await Promise.all([
        getUserBorrows(user.uid),
        getUserFavoriteBooks(user.uid),
        getUserWishlist(user.uid),
        getUserAttendance(user.uid),
        checkAndAwardDisplayBadges(user.uid),
      ]);
      setBorrows(b);
      setFavorites(f);
      setWishlist(w);
      setAttendance(a);
      const stats = await getUserAttendanceStats(user.uid);
      setAttendanceStats(stats);
      setUserBadges(badges.filter(b => b.unlocked).map(b => b.type));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); if (user) loadUserData(); }, [user, authLoading, navigate, loadUserData]);

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast("error", "Ukuran foto maksimal 5MB."); return; }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCropImageSrc(event.target.result as string);
        setShowCropModal(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleCropConfirm(croppedDataUrl: string) {
    if (!user) return;
    setUploadingPhoto(true);
    try {
      const { uploadProfilePhoto } = await import("@/lib/storage");
      const photoURL = await uploadProfilePhoto(user.uid, croppedDataUrl);
      await updateUserProfile(user.uid, { photoURL });
      await refreshProfile();
      toast("success", "Foto profil berhasil diperbarui!");
      setShowCropModal(false);
      setCropImageSrc(null);
    } catch (err) {
      console.error(err);
      toast("error", "Gagal mengunggah foto. Silakan coba lagi.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    if (!user) return;
    await updateUserProfile(user.uid, { photoURL: "" });
    await refreshProfile();
  }

  async function handleReturn(borrowId: string) {
    if (!user) return; setReturning(borrowId); setReturnMsg(null);
    try {
      const denda = await returnBook(user.uid, borrowId);
      setReturnMsg({ borrowId, fine: denda });
      if (denda > 0) {
        toast("info", `Buku dikembalikan. Denda: Rp ${denda.toLocaleString()}`);
      } else {
        toast("success", "Buku berhasil dikembalikan tanpa denda!");
      }
      loadUserData();
    }
    catch (err: any) { toast("error", err.message || "Gagal mengembalikan buku. Silakan coba lagi."); } finally { setReturning(null); }
  }

  async function handleRemoveFav(bookId: string) {
    if (!user) return;
    await toggleFavorite(user.uid, bookId);
    toast("info", "Dihapus dari favorit");
    loadUserData();
  }

  async function handleRemoveWishlist(bookId: string) {
    if (!user) return;
    await toggleWishlist(user.uid, bookId);
    toast("info", "Dihapus dari wishlist");
    loadUserData();
  }
  async function handleLogout() { await logout(); navigate("/"); }
  function confirmLogout() { setConfirmAction({ type: "logout" }); }
  function confirmReturnBook(borrowId: string) { setConfirmAction({ type: "return", data: borrowId }); }
  function confirmRemovePhoto() { setConfirmAction({ type: "removePhoto" }); }

  function executeConfirm() {
    if (!confirmAction) return;
    switch (confirmAction.type) {
      case "logout": handleLogout(); break;
      case "return": handleReturn(confirmAction.data); break;
      case "removePhoto": handleRemovePhoto(); break;
    }
    setConfirmAction(null);
  }
  function getDaysRemaining(batasKembali: string) { const now = new Date(); const due = new Date(batasKembali); return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)); }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 6) { toast("error", "Password baru minimal 6 karakter"); return; }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast("success", "Password berhasil diubah!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      if (err.code === "auth/wrong-password") {
        toast("error", "Password lama salah");
      } else {
        toast("error", err.message || "Gagal mengubah password");
      }
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSendVerification() {
    try {
      await sendVerificationEmail();
      toast("success", "Email verifikasi telah dikirim! Cek inbox Anda.");
    } catch (err: any) {
      toast("error", err.message || "Gagal mengirim email verifikasi");
    }
  }

  // Show loading skeleton while auth is loading
  if (authLoading) return <div className="tile"><div className="max-w-5xl mx-auto px-6"><ProfileSkeleton /></div></div>;

  // Redirect to login if not logged in
  if (!user) return null; // navigate handles redirect

  // Show retry state if profile is null (new user, slow network, etc.)
  if (!profile) {
    return (
      <div className="tile">
        <div className="max-w-5xl mx-auto px-6 text-center py-20">
          <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: "var(--color-primary)" }} />
          <p className="text-sm mb-4" style={{ color: "var(--color-muted-foreground)" }}>Memuat profil Anda...</p>
          <button onClick={() => refreshProfile()} className="text-sm font-medium underline" style={{ color: "var(--color-primary)" }}>
            Muat ulang
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="tile">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-[320px_1fr] gap-8">
            {/* Sidebar */}
            <div className="card text-center lg:text-left">
              {/* Photo upload area */}
              <div className="relative mx-auto lg:mx-0 mb-4 inline-flex items-center justify-center">
                <UserAvatar
                  src={profile.photoURL}
                  name={profile.nama}
                  size="xl"
                  frame={profile.avatarFrame}
                  className="shadow-sm"
                />
                {/* Upload button overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50 z-20"
                  style={{ background: "var(--color-card)", border: "2px solid var(--color-border)", color: "var(--color-primary)" }}
                  title="Upload foto profil"
                >
                  {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              <h2 className="text-xl font-bold flex items-center gap-2 justify-center lg:justify-start">
                {profile.nama}
                {profile.displayBadge && <BadgeIcon badge={profile.displayBadge} size="sm" />}
              </h2>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>@{profile.username}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>{profile.email}</p>

              {/* Level & Points */}
              {profile.totalPoints !== undefined && profile.totalPoints > 0 && (
                <div className="mt-3 p-3 rounded-xl flex items-center gap-3" style={{ background: "var(--color-muted)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--color-primary)", color: "white" }}>
                    <Award size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">Level {calculateLevel(profile.totalPoints).level}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-primary)", color: "white" }}>
                        {calculateLevel(profile.totalPoints).title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp size={10} style={{ color: "var(--color-primary)" }} />
                      <span className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{profile.totalPoints} poin</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Badge & Avatar Frame selector buttons */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => setShowBadgeSelector(true)}
                  className="p-2.5 rounded-xl text-center transition-all hover:shadow-md flex items-center justify-center gap-1.5 text-xs font-medium border border-dashed"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}
                >
                  <Award size={13} />
                  {profile.displayBadge ? "Ubah Badge" : "Pilih Badge"}
                </button>
                <button
                  onClick={() => setShowFrameModal(true)}
                  className="p-2.5 rounded-xl text-center transition-all hover:shadow-md flex items-center justify-center gap-1.5 text-xs font-medium border border-dashed"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-primary)" }}
                >
                  <Sparkles size={13} className="text-[#AD6549]" />
                  <span>Bingkai Avatar</span>
                </button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 mt-4 text-sm">
                <div className="text-center"><p className="font-bold text-lg">{attendance.length}</p><p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Kunjungan</p></div>
                <div className="text-center"><p className="font-bold text-lg">{borrows.length}</p><p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Dipinjam</p></div>
                <div className="text-center"><p className="font-bold text-lg">{favorites.length}</p><p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Favorit</p></div>
                <div className="text-center"><p className="font-bold text-lg">{wishlist.length}</p><p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Wishlist</p></div>
              </div>

              {/* Streak Freeze */}
              {profile.readingStreak != null && profile.readingStreak > 0 && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)" }}>
                  <span className="text-base"><Flame size={14} style={{ color: "#ea580c" }} /></span>
                  <span className="font-semibold" style={{ color: "#ea580c" }}>{profile.readingStreak} hari streak</span>
                  {profile.streakFreezes != null && profile.streakFreezes > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1" style={{ background: "rgba(96,165,250,0.15)", color: "#3b82f6" }}><Snowflake size={10} /> {profile.streakFreezes} freeze</span>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="mt-4 space-y-1.5 text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                {profile.alamat && <p className="flex items-center gap-1.5 justify-center lg:justify-start"><MapPin size={12} />{profile.alamat}</p>}
                {profile.noTelp && <p className="flex items-center gap-1.5 justify-center lg:justify-start"><Phone size={12} />{profile.noTelp}</p>}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-6">
                <button onClick={() => { setSettingsTab("profile"); setShowSettingsModal(true); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ borderColor: "var(--color-border)" }}><Edit3 size={14} /> Edit</button>
                <button onClick={confirmLogout} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ borderColor: "rgba(181,74,53,0.3)", color: "var(--color-destructive)" }}><LogOut size={14} /> Keluar</button>
              </div>

              {/* Email verification banner */}
              {user && !user.emailVerified && (
                <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <div className="flex items-start gap-2">
                    <Mail size={14} className="mt-0.5 flex-shrink-0" style={{ color: "#d97706" }} />
                    <div className="flex-1">
                      <p className="text-xs font-medium" style={{ color: "#d97706" }}>Email belum diverifikasi</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                        Verifikasi untuk mengakses semua fitur
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={handleSendVerification} className="text-[10px] font-medium px-2 py-1 rounded-lg transition-all" style={{ background: "rgba(245,158,11,0.15)", color: "#d97706" }}>
                          Kirim Ulang
                        </button>
                        <button onClick={() => refreshProfile()} className="text-[10px] font-medium px-2 py-1 rounded-lg transition-all" style={{ background: "var(--color-muted)", color: "var(--color-muted-foreground)" }}>
                          Cek Status
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {user && user.emailVerified && (
                <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
                    <p className="text-xs font-medium" style={{ color: "#22c55e" }}>Email terverifikasi</p>
                  </div>
                </div>
              )}

              {/* Change password & Settings buttons */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setSettingsTab("account"); setShowSettingsModal(true); }}
                  className="p-2.5 rounded-xl text-center transition-all hover:shadow-md flex items-center justify-center gap-1.5 text-xs font-medium"
                  style={{ background: "var(--color-muted)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                >
                  <Shield size={14} />
                  Ubah Password
                </button>
                <button
                  onClick={() => { setSettingsTab("profile"); setShowSettingsModal(true); }}
                  className="p-2.5 rounded-xl text-center transition-all hover:shadow-md flex items-center justify-center gap-1.5 text-xs font-medium"
                  style={{ background: "var(--color-muted)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                >
                  <Settings size={14} />
                  Pengaturan
                </button>
              </div>

              {/* Social link */}
              <Link
                to="/social"
                className="mt-4 p-3 rounded-xl text-center transition-all hover:shadow-md hover:-translate-y-0.5 block"
                style={{ background: "var(--color-muted)", border: "1px dashed var(--color-border)" }}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Users size={14} style={{ color: "var(--color-primary)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--color-primary)" }}>Komunitas Gibry</span>
                </div>
                <p className="text-[10px] mt-1" style={{ color: "var(--color-muted-foreground)" }}>
                  Berteman, chat, & berbagi aktivitas membaca
                </p>
              </Link>
            </div>

            {/* Content */}
            <div className="space-y-8">
              {/* Active Borrows */}
              <section>
                <h3 className="text-tagline flex items-center gap-2 mb-4"><BookOpen size={18} /> Status Peminjaman</h3>
                {borrows.length === 0 ? (
                  <div className="card text-center py-8"><BookOpen size={32} className="mx-auto mb-3" style={{ color: "var(--color-border)" }} /><p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Tidak ada buku yang sedang dipinjam.</p><a href="/books" className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color: "var(--color-primary)" }}>Jelajahi Koleksi</a></div>
                ) : (
                  <div className="space-y-3">
                    {borrows.map((b) => {
                      const days = getDaysRemaining(b.batasKembali);
                      const isLate = days < 0;
                      const isUnpaidFine = (b.denda || 0) > 0 && b.dendaStatus !== "lunas" && b.dendaStatus !== "waived";

                      return (
                        <div key={b.id} className="card hover:shadow-md transition-all p-4 border border-[#e6d8c3]">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="w-14 h-18 rounded-xl overflow-hidden flex-shrink-0 bg-[#f4ecd8] border border-[#dbd0ba] relative">
                              {b.bookCover ? (
                                <img src={b.bookCover} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <BookOpen size={20} className="text-[#a67c52]" />
                                </div>
                              )}
                              <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-black rounded bg-black/60 text-white uppercase">
                                {b.bookType === "fisik" ? "Fisik" : "Digital"}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-[#4a3f35] truncate">{b.bookTitle}</p>
                                {b.status === "Menunggu Pengambilan" && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                    Menunggu Pengambilan
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#7d6b56] mt-0.5">Penulis: {b.bookPenulis || "-"}</p>

                              {/* Physical Pickup Info or E-Book Link */}
                              {b.bookType === "fisik" ? (
                                <div className="mt-2 text-xs p-3 rounded-xl bg-[#f7eedf] border border-[#e6d8c3]">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1.5">
                                      <p className="flex items-center gap-1.5 font-semibold text-[#4a3f35]">
                                        <MapPin size={12} className="text-[#a67c52]" />
                                        Perpustakaan Utama (Gedung A)
                                      </p>
                                      <div className="flex items-center gap-3 text-[#7d6b56]">
                                        <span className="flex items-center gap-1">
                                          <BookOpen size={10} /> Lokasi Rak: {b.lokasiRak || "Rak 1"}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Clock size={10} /> Pickup: Jam Kerja Perpustakaan
                                        </span>
                                      </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-lg bg-[#fff3d6] border border-[#e6c864] font-mono text-xs font-black text-[#8b6914] whitespace-nowrap">
                                      {b.kodePinjam || "PINJAM-8392"}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-2 flex items-center gap-2">
                                  <a
                                    href={b.pdfUrl || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                                  >
                                    <BookOpen size={13} /> Baca E-Book Online
                                  </a>
                                </div>
                              )}

                              <div className="flex items-center gap-3 mt-2 text-xs text-[#7d6b56]">
                                <span className="flex items-center gap-1"><Calendar size={12} /> {b.tanggalPinjam}</span>
                                <span><ArrowRight size={12} className="text-[#a67c52]" /> {b.batasKembali}</span>
                              </div>

                              <p className="text-xs font-medium mt-1">
                                {isLate ? (
                                  <span className="flex items-center gap-1 text-rose-600 font-bold">
                                    <AlertTriangle size={12} /> Terlambat {Math.abs(days)} hari (Denda: Rp {(Math.abs(days) * (b.fineRate || getFineRate(b.deadlineDays || 14))).toLocaleString()})
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[#7d6b56]">
                                    <Clock size={12} /> Sisa {days} hari lagi{b.bookType === "fisik" ? " untuk pengambilan/pengembalian" : ""}
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2 items-end justify-center">
                              {isUnpaidFine && (
                                <button
                                  onClick={() => {
                                    setSelectedBorrowForPayment(b);
                                    setShowMidtransModal(true);
                                  }}
                                  className="px-3 py-2 rounded-full bg-[#1b2533] hover:bg-[#2c3b50] text-amber-300 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                                >
                                  <CreditCard size={14} /> Bayar Denda (Midtrans)
                                </button>
                              )}

                              <button
                                onClick={() => confirmReturnBook(b.id)}
                                disabled={returning === b.id}
                                className="px-4 py-2 rounded-full text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: "var(--color-primary)" }}
                              >
                                {returning === b.id ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeftRight size={14} />}
                                {returning === b.id ? "Proses..." : b.bookType === "fisik" ? "Kembalikan Buku Fisik" : "Kembalikan Buku"}
                              </button>
                            </div>
                          </div>

                          {returnMsg && returnMsg.borrowId === b.id && (
                            <div className="mt-3 text-xs px-3 py-2 rounded-lg" style={{ background: returnMsg.fine > 0 ? "rgba(217,119,6,0.1)" : "rgba(34,197,94,0.1)", color: returnMsg.fine > 0 ? "#d97706" : "#16a34a" }}>
                              {returnMsg.fine > 0 ? `Buku dikembalikan. Denda: Rp ${returnMsg.fine.toLocaleString()}` : "Buku berhasil dikembalikan tanpa denda"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Favorites */}
              <section>
                <h3 className="text-tagline flex items-center gap-2 mb-4"><Heart size={18} /> Buku Favorit</h3>
                {favorites.length === 0 ? (
                  <div className="card text-center py-8"><Heart size={32} className="mx-auto mb-3" style={{ color: "var(--color-border)" }} /><p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Belum ada buku favorit.</p></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {favorites.map((b) => (
                      <div key={b.id} className="card p-3 flex items-center gap-3 relative group hover:shadow-md transition-all">
                        <div className="w-10 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "var(--color-muted)" }}>{b.cover ? <img src={b.cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} style={{ color: "var(--color-border)" }} /></div>}</div>
                        <div className="min-w-0 flex-1"><p className="text-xs font-semibold truncate">{b.judul}</p><p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{b.penulis}</p></div>
                        <button onClick={() => handleRemoveFav(b.id)} className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" style={{ background: "var(--color-muted)" }}><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Wishlist */}
              <section>
                <h3 className="text-tagline flex items-center gap-2 mb-4"><Bookmark size={18} /> Ingin Dibaca</h3>
                {wishlist.length === 0 ? (
                  <div className="card text-center py-8"><Bookmark size={32} className="mx-auto mb-3" style={{ color: "var(--color-border)" }} /><p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Belum ada buku di wishlist.</p><a href="/books" className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color: "var(--color-primary)" }}>Jelajahi Koleksi</a></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {wishlist.map((b) => (
                      <div key={b.id} className="card p-3 flex items-center gap-3 relative group hover:shadow-md transition-all">
                        <div className="w-10 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "var(--color-muted)" }}>{b.cover ? <img src={b.cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} style={{ color: "var(--color-border)" }} /></div>}</div>
                        <div className="min-w-0 flex-1"><p className="text-xs font-semibold truncate">{b.judul}</p><p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{b.penulis}</p></div>
                        <button onClick={() => handleRemoveWishlist(b.id)} className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" style={{ background: "var(--color-muted)" }}><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Attendance History */}
              <section>
                <h3 className="text-tagline flex items-center gap-2 mb-4"><Clock size={18} /> Riwayat Kunjungan</h3>

                {attendanceStats && attendanceStats.totalVisits > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 rounded-xl" style={{ background: "var(--color-muted)" }}>
                      <p className="text-lg font-bold">{attendanceStats.totalVisits}</p>
                      <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>Total Kunjungan</p>
                    </div>
                    <div className="text-center p-3 rounded-xl" style={{ background: "var(--color-muted)" }}>
                      <p className="text-lg font-bold">{attendanceStats.avgDurationMinutes} mnt</p>
                      <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>Rata-rata Durasi</p>
                    </div>
                    <div className="text-center p-3 rounded-xl" style={{ background: "var(--color-muted)" }}>
                      <p className="text-lg font-bold">{Math.floor(attendanceStats.totalDurationMinutes / 60)}j {attendanceStats.totalDurationMinutes % 60}m</p>
                      <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>Total Durasi</p>
                    </div>
                  </div>
                )}

                {attendance.length === 0 ? (
                  <div className="card text-center py-8"><Clock size={32} className="mx-auto mb-3" style={{ color: "var(--color-border)" }} /><p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Belum ada riwayat kunjungan.</p><a href="/attendance" className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color: "var(--color-primary)" }}>Catat Kehadiran</a></div>
                ) : (
                  <div className="space-y-2">
                    {attendance.map((a) => {
                      const durasi = a.durasi && a.durasi > 0 ? a.durasi : null;
                      const durasiLabel = durasi != null
                        ? durasi < 60 ? `${durasi} menit` : `${Math.floor(durasi / 60)}j ${durasi % 60}m`
                        : null;
                      return (
                        <div key={a.id} className="card p-3 flex items-center justify-between hover:shadow-md transition-all">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: a.status === "hadir" ? "rgba(34,197,94,0.1)" : "var(--color-muted)" }}>
                              {a.status === "hadir"
                                ? <Timer size={14} style={{ color: "#16a34a" }} />
                                : <RotateCcw size={14} style={{ color: "var(--color-muted-foreground)" }} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{a.tujuan}</p>
                              <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                                {formatWIBDateTime(a.waktuKunjungan)}
                                {a.waktuKeluar && <span> → {formatWIBTime(a.waktuKeluar)}</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {durasiLabel && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--color-muted)", color: "var(--color-secondary-foreground)" }}>
                                {durasiLabel}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.status === "hadir" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                              {a.status === "hadir" ? "Hadir" : "Selesai"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <ReadingGoalWidget />
              <ReadingStats />

              {/* Reading Dashboard Link */}
              <a
                href="/reading-dashboard"
                className="card p-4 flex items-center justify-between hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                    <TrendingUp size={18} style={{ color: "#8b5cf6" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Dashboard Membaca</p>
                    <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>Lihat statistik lengkap aktivitas Anda</p>
                  </div>
                </div>
                <span className="text-xs group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--color-muted-foreground)" }}><ArrowRight size={12} /></span>
              </a>
              <Achievements />
            </div>
          </div>
        </div>

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={!!confirmAction}
          title={
            confirmAction?.type === "logout" ? "Keluar dari Akun?" :
              confirmAction?.type === "return" ? "Kembalikan Buku?" :
                confirmAction?.type === "removePhoto" ? "Hapus Foto Profil?" :
                  ""
          }
          message={
            confirmAction?.type === "logout" ? "Anda akan keluar dari akun Gibry. Anda perlu login kembali untuk mengakses fitur." :
              confirmAction?.type === "return" ? "Apakah Anda yakin ingin mengembalikan buku ini? Jika terlambat, akan ada denda keterlambatan." :
                confirmAction?.type === "removePhoto" ? "Foto profil Anda akan dihapus. Anda bisa upload foto baru kapan saja." :
                  ""
          }
          confirmText={
            confirmAction?.type === "logout" ? "Ya, Keluar" :
              confirmAction?.type === "return" ? "Ya, Kembalikan" :
                confirmAction?.type === "removePhoto" ? "Ya, Hapus" :
                  "Lanjutkan"
          }
          variant={confirmAction?.type === "logout" ? "warning" : "danger"}
          onConfirm={executeConfirm}
          onCancel={() => setConfirmAction(null)}
        />

        {/* Badge Selector Modal */}
        {showBadgeSelector && (
          <BadgeSelector
            userBadges={userBadges}
            currentBadge={profile.displayBadge || null}
            onClose={() => setShowBadgeSelector(false)}
          />
        )}

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettingsModal}
          defaultTab={settingsTab}
          onClose={() => setShowSettingsModal(false)}
        />

        {/* Image Crop & Adjust Modal */}
        <ImageCropModal
          isOpen={showCropModal}
          imageSrc={cropImageSrc}
          onClose={() => {
            setShowCropModal(false);
            setCropImageSrc(null);
          }}
          onConfirm={handleCropConfirm}
        />

        {/* Midtrans Payment Gateway Modal */}
        <MidtransPaymentModal
          isOpen={showMidtransModal}
          borrow={selectedBorrowForPayment}
          onClose={() => {
            setShowMidtransModal(false);
            setSelectedBorrowForPayment(null);
          }}
          onSuccess={() => {
            loadUserData();
          }}
        />

        {/* Avatar Frame Modal */}
        {showFrameModal && (
          <AvatarFrameModal onClose={() => setShowFrameModal(false)} />
        )}
      </div>
    </PageTransition>
  );
}
