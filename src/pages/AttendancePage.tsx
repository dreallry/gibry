import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { addAttendance, checkOutAttendance, getActiveAttendanceForUser, getTodayAttendance, getTodayWIBDate, type Attendance } from "@/lib/firestore";
import { ClipboardCheck, Loader2, LogIn, LogOut, Clock, Users, Target, CheckCircle2, ArrowDownToLine, ArrowUpFromLine, Timer, BookOpen, RotateCcw, QrCode } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
}

function formatTimeWIB(wibStr: string): string {
  // Time is already stored in WIB, just extract HH:MM
  const timePart = wibStr.includes("T") ? wibStr.split("T")[1] : wibStr;
  return (timePart || "??:??").slice(0, 5) + " WIB";
}

// Parse WIB time string "2026-08-12T12:13" to real UTC timestamp
function parseWIBToMs(wibStr: string): number {
  const [datePart, timePart] = wibStr.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = (timePart || "00:00").split(":").map(Number);
  return Date.UTC(y, m - 1, d, h, min) - 7 * 60 * 60 * 1000;
}

export default function AttendancePage() {
  const { user, profile } = useAuth();
  const isStaff = profile?.role === 'admin' || profile?.role === 'librarian';
  const { toast } = useToast();
  const [todayList, setTodayList] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeRecord, setActiveRecord] = useState<Attendance | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [todaySummary, setTodaySummary] = useState<{ count: number; totalMinutes: number }>({ count: 0, totalMinutes: 0 });
  const [tujuan, setTujuan] = useState("Membaca Buku");
  const [isTokenVerified, setIsTokenVerified] = useState(false);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tujuanOptions = ["Membaca Buku", "Meminjam Buku", "Mengembalikan Buku", "Penelitian/Tugas", "Belajar Kelompok", "Lainnya"];

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [today, active] = await Promise.all([
        user ? getTodayAttendance(isStaff ? undefined : user.uid) : Promise.resolve([]),
        user ? getActiveAttendanceForUser(user.uid) : Promise.resolve(null),
      ]);
      setTodayList(today);
      setActiveRecord(active);

      // Compute today summary
      const completedToday = today.filter(r => r.status === "selesai" && r.durasi && r.durasi > 0);
      const totalMinutes = completedToday.reduce((sum, r) => sum + (r.durasi || 0), 0);
      setTodaySummary({ count: today.length, totalMinutes });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [user, isStaff]);

  useEffect(() => { loadData(); }, [loadData]);

  // Check QR token verification from sessionStorage
  useEffect(() => {
    const verified = sessionStorage.getItem("presensi_verified");
    const verifiedDate = sessionStorage.getItem("presensi_verified_date");
    const todayWIB = getTodayWIBDate();
    if (verified === "true" && verifiedDate === todayWIB) {
      setIsTokenVerified(true);
    }
  }, []);

  // Real-time elapsed counter
  useEffect(() => {
    if (activeRecord) {
      const updateElapsed = () => {
        const diff = Math.floor((Date.now() - parseWIBToMs(activeRecord.waktuKunjungan)) / 60000);
        setElapsed(Math.max(0, diff));
      };
      updateElapsed();
      elapsedRef.current = setInterval(updateElapsed, 30000);
      return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
    } else {
      setElapsed(0);
    }
  }, [activeRecord]);

  // Check In
  async function handleCheckIn() {
    if (!user || !profile) return;
    if (!isTokenVerified) {
      toast("error", "Silakan scan QR code di perpustakaan terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date();
      const wibMs = now.getTime() + 7 * 60 * 60 * 1000;
      const d = new Date(wibMs);
      const waktuStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}T${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
      const id = await addAttendance({
        userId: user.uid,
        nama: profile.nama || user.displayName || "User",
        email: profile.email || user.email || "",
        photoURL: profile.photoURL || "",
        waktuKunjungan: waktuStr,
        tujuan,
      });
      if (id === null) {
        toast("error", "Anda sudah check-in hari ini. Check-out terlebih dahulu.");
      } else {
        toast("success", "Check-in berhasil!");
        await loadData();
      }
    } catch (err: any) { toast("error", err.message || "Gagal check-in"); } finally { setSubmitting(false); }
  }

  // Check Out
  async function handleCheckOut() {
    if (!activeRecord || !user) return;
    setSubmitting(true);
    try {
      await checkOutAttendance(activeRecord.id);
      toast("success", `Check-out berhasil! Durasi: ${formatDuration(elapsed)}.`);
      await loadData();
    } catch (err: any) { toast("error", err.message || "Gagal check-out"); } finally { setSubmitting(false); }
  }

  return (
    <PageTransition>
      <div className="tile">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-8">
            <h1 className="text-display-lg mb-2">Presensi Kunjungan</h1>
            <p style={{ color: "var(--color-muted-foreground)" }}>Catat kehadiran Anda saat berkunjung ke perpustakaan.</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left Column: Status + Form */}
            <div className="lg:col-span-2 space-y-4">
              {user ? (
                <>
                  {/* Status Card */}
                  <div className="card p-5">
                    {activeRecord ? (
                      /* Currently checked in */
                      <div className="text-center">
                        <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}>
                          <Timer size={24} />
                        </div>
                        <p className="text-sm font-bold" style={{ color: "#16a34a" }}>Sedang di Perpustakaan</p>
                        <p className="text-xs mt-1" style={{ color: "var(--color-muted-foreground)" }}>Masuk: {formatTimeWIB(activeRecord.waktuKunjungan)}</p>

                        <div className="mt-4 py-3 px-4 rounded-xl" style={{ background: "var(--color-muted)" }}>
                          <p className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>{formatDuration(elapsed)}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>Durasi kunjungan</p>
                        </div>

                        <p className="text-xs mt-3" style={{ color: "var(--color-muted-foreground)" }}>Tujuan: {activeRecord.tujuan}</p>

                        <button
                          onClick={handleCheckOut}
                          disabled={submitting}
                          className="w-full mt-4 h-11 rounded-full text-white text-sm font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                          style={{ background: "#b45a35" }}
                        >
                          {submitting ? <Loader2 className="animate-spin" size={16} /> : <ArrowUpFromLine size={16} />}
                          {submitting ? "Memproses..." : "Check Out"}
                        </button>
                      </div>
                    ) : (
                      /* Not checked in */
                      !isTokenVerified ? (
                        /* QR not verified — show scan prompt */
                        <div className="text-center">
                          <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(180,90,53,0.1)" }}>
                            <QrCode size={24} style={{ color: "#b45a35" }} />
                          </div>
                          <p className="text-sm font-bold" style={{ color: "#b45a35" }}>Scan QR untuk Presensi</p>
                          <p className="text-xs mt-1" style={{ color: "var(--color-muted-foreground)" }}>
                            Scan QR code yang ada di perpustakaan untuk melakukan check-in.
                          </p>
                          <p className="text-[10px] mt-2" style={{ color: "var(--color-muted-foreground)" }}>
                            Minta QR code kepada petugas perpustakaan
                          </p>
                          <div className="mt-3 py-2 px-3 rounded-lg text-[10px]" style={{ background: "var(--color-muted)", color: "var(--color-muted-foreground)" }}>
                            Token hanya berlaku untuk hari ini dan harus di-scan langsung di lokasi
                          </div>
                        </div>
                      ) : (
                        /* QR verified — show check-in form */
                        <div className="text-center">
                          <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
                            <CheckCircle2 size={24} style={{ color: "#16a34a" }} />
                          </div>
                          <p className="text-sm font-bold" style={{ color: "#16a34a" }}>Siap Check In?</p>
                          <p className="text-xs mt-1" style={{ color: "var(--color-muted-foreground)" }}>
                            {todaySummary.count > 0
                              ? `Kunjungan hari ini: ${todaySummary.count}x (${formatDuration(todaySummary.totalMinutes)} total)`
                              : "Belum ada kunjungan hari ini"}
                          </p>

                          <button
                            onClick={handleCheckIn}
                            disabled={submitting}
                            className="w-full mt-4 h-12 rounded-full text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                            style={{ background: "var(--color-primary)" }}
                          >
                            {submitting ? <Loader2 className="animate-spin" size={16} /> : <ArrowDownToLine size={16} />}
                            {submitting ? "Memproses..." : "Check In Sekarang"}
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  {/* Tujuan (only shown when not checked in and token verified) */}
                  {!activeRecord && isTokenVerified && (
                    <div className="card p-4">
                      <label className="block text-xs font-semibold mb-2" style={{ color: "var(--color-foreground)" }}>Tujuan Kunjungan</label>
                      <div className="relative">
                        <Target className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: "var(--color-muted-foreground)" }} />
                        <select value={tujuan} onChange={(e) => setTujuan(e.target.value)} className="w-full h-10 pl-9 pr-4 rounded-xl text-sm border appearance-none" style={{ borderColor: "var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)" }}>
                          {tujuanOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Today summary when checked out */}
                  {!activeRecord && todaySummary.count > 0 && (
                    <div className="card p-4">
                      <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-foreground)" }}>Ringkasan Hari Ini</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-2 rounded-lg" style={{ background: "var(--color-muted)" }}>
                          <p className="text-lg font-bold">{todaySummary.count}</p>
                          <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>Kunjungan</p>
                        </div>
                        <div className="text-center p-2 rounded-lg" style={{ background: "var(--color-muted)" }}>
                          <p className="text-lg font-bold">{formatDuration(todaySummary.totalMinutes)}</p>
                          <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>Total Durasi</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Login prompt */
                <div className="card flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--color-accent)", color: "var(--color-primary)" }}>
                    <LogIn size={28} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Masuk untuk Presensi</h3>
                  <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--color-muted-foreground)" }}>
                    Login untuk mencatat kehadiran.
                  </p>
                  <Link to="/login" className="h-11 px-8 text-white rounded-full text-sm font-medium inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: "var(--color-primary)" }}>
                    <LogIn size={16} /> Masuk Sekarang
                  </Link>
                </div>
              )}
            </div>

            {/* Right Column: Today's Visitors */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-tagline flex items-center gap-2"><Users size={18} /> {isStaff ? 'Pengunjung Hari Ini' : 'Kunjunganmu Hari Ini'}</h2>
                <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: "var(--color-muted)", color: "var(--color-secondary-foreground)" }}>
                  {todayList.length} {isStaff ? 'orang' : 'kunjungan'}
                </span>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="card flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full animate-pulse flex-shrink-0" style={{ background: "var(--color-muted)" }} />
                      <div className="flex-1">
                        <div className="h-4 w-1/3 animate-pulse rounded mb-1" style={{ background: "var(--color-muted)" }} />
                        <div className="h-3 w-1/2 animate-pulse rounded" style={{ background: "var(--color-muted)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : todayList.length === 0 ? (
                <div className="card text-center py-12">
                  <ClipboardCheck size={32} className="mx-auto mb-3" style={{ color: "var(--color-border)" }} />
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Belum ada presensi hari ini.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayList.map((a) => (
                    <div key={a.id} className="card flex items-center gap-4 hover:shadow-md transition-all">
                      <div className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden" style={{ background: a.photoURL ? "transparent" : "var(--color-primary)" }}>
                        {a.photoURL ? <img src={a.photoURL} alt="" className="w-full h-full object-cover" /> : a.nama.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">{a.nama}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${a.status === "hadir" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                            {a.status === "hadir" ? "Hadir" : "Selesai"}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>{a.tujuan}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-medium flex items-center gap-1 justify-end" style={{ color: "var(--color-muted-foreground)" }}>
                          <Clock size={10} /> {formatTimeWIB(a.waktuKunjungan)}
                        </p>
                        {a.waktuKeluar && (
                          <p className="text-[10px] flex items-center gap-1 justify-end" style={{ color: "var(--color-muted-foreground)" }}>
                            <RotateCcw size={8} /> {formatTimeWIB(a.waktuKeluar)}
                          </p>
                        )}
                        {a.durasi != null && a.durasi > 0 && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: "var(--color-muted)", color: "var(--color-secondary-foreground)" }}>
                            {formatDuration(a.durasi)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
