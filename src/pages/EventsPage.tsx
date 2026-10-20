import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveEvents, getUserEventProgress, joinEvent, getActiveChallenges, getUserChallenges, joinChallenge, type SeasonalEvent, type UserEventProgress, type ReadingChallenge, type UserChallenge } from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import { Trophy, Target, Clock, Loader2, CheckCircle2, Flame, Zap, Sparkles, Swords, Layers, Hourglass } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";

type FilterTab = "all" | "seasonal" | "daily";

// --- HAND-DRAWN SKETCH SVG ACCENTS (SCRAPBOOK AESTHETIC) ---

const HandDrawnStar = ({ className = "w-12 h-12" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M50 5 L61 35 L95 35 L68 55 L78 88 L50 68 L22 88 L32 55 L5 35 L39 35 Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M48 10 L58 35 L90 35 L65 53 L74 82 L48 65 L24 82 L33 53 L10 35 L42 35 Z" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
    <path d="M25 40 L75 60 M30 65 L70 35 M50 15 L50 75" stroke="currentColor" strokeWidth="1" opacity="0.5" />
  </svg>
);

const HandDrawnOval = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`relative inline-block ${className}`}>
    <span className="relative z-10">{children}</span>
    <svg className="absolute -inset-2.5 w-[calc(100%+20px)] h-[calc(100%+20px)] text-amber-900 pointer-events-none overflow-visible" viewBox="0 0 140 60" fill="none">
      <path d="M8 30 C12 10, 60 5, 125 10 C135 12, 138 35, 120 48 C85 55, 25 50, 10 40 C3 32, 18 14, 65 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

const HandDrawnArrow = ({ className = "w-12 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M5 15 Q 25 12, 45 15 M33 6 L 48 15 L 33 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M35 8 L 46 15 L 35 22" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
  </svg>
);

const Tape = ({ className = "" }: { className?: string }) => (
  <div className={`h-4 w-16 bg-amber-200/80 backdrop-blur-xs border border-amber-400/90 rotate-[-4deg] shadow-2xs ${className}`} />
);

export default function EventsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [events, setEvents] = useState<SeasonalEvent[]>([]);
  const [userProgress, setUserProgress] = useState<UserEventProgress[]>([]);
  const [challenges, setChallenges] = useState<ReadingChallenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsData, progressData, challengesData, ucData] = await Promise.all([
        getActiveEvents(),
        user ? getUserEventProgress(user.uid) : Promise.resolve([]),
        getActiveChallenges(),
        user ? getUserChallenges(user.uid) : Promise.resolve([]),
      ]);
      setEvents(eventsData);
      setUserProgress(progressData);
      setChallenges(challengesData);
      setUserChallenges(ucData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [user, loadData]);

  async function handleJoinEvent(eventId: string) {
    if (!user) {
      toast("info", "Silakan login terlebih dahulu untuk mengambil Quest ini.");
      return;
    }
    setJoining(eventId);
    try {
      await joinEvent(user.uid, eventId);
      toast("success", "Quest diterima! Mulai membaca untuk menyelesaikan misi.");
      await loadData();
    } catch (err: any) {
      toast("error", err.message || "Gagal mengambil Quest");
    } finally {
      setJoining(null);
    }
  }

  async function handleJoinChallenge(challengeId: string) {
    if (!user) {
      toast("info", "Silakan login terlebih dahulu untuk mengaktifkan Misi ini.");
      return;
    }
    setJoining(challengeId);
    try {
      await joinChallenge(user.uid, challengeId);
      toast("success", "Misi Aktif! Selesaikan target membaca hari ini.");
      await loadData();
    } catch (err: any) {
      toast("error", err.message);
    } finally {
      setJoining(null);
    }
  }

  function getProgress(eventId: string) {
    return userProgress.find(p => p.eventId === eventId);
  }

  function getUserChallengeProgress(challengeId: string) {
    return userChallenges.find(uc => uc.challengeId === challengeId);
  }

  function getDaysLeft(endDate: string) {
    const end = new Date(endDate).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }

  // Deduplicate events by title to prevent duplicate cards
  const uniqueEvents = Array.from(
    new Map(events.map(e => [e.title.trim().toLowerCase(), e])).values()
  );

  // Deduplicate challenges by title
  const uniqueChallenges = Array.from(
    new Map(challenges.map(c => [c.title.trim().toLowerCase(), c])).values()
  );

  const spotlightEvent = uniqueEvents[0];
  const remainingEvents = spotlightEvent
    ? uniqueEvents.filter(e => e.id !== spotlightEvent.id && e.title.trim().toLowerCase() !== spotlightEvent.title.trim().toLowerCase())
    : [];

  const activeEventsCount = userProgress.filter(p => !p.completed).length;
  const activeChallengesCount = userChallenges.filter(c => !c.completed).length;
  const totalActiveQuests = activeEventsCount + activeChallengesCount;

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-[75vh] flex flex-col items-center justify-center gap-3">
          <Loader2 size={36} className="animate-spin text-amber-900" />
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Menyiapkan Arena Misi...</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div
        className="min-h-screen relative pt-24 sm:pt-28 pb-12 px-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: "#f7f3ec",
          backgroundImage: "linear-gradient(#e5dec9 1px, transparent 1px), linear-gradient(90deg, #e5dec9 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div className="max-w-6xl mx-auto pb-24">

          {/* HEADER SECTION - GRAPH PAPER SCRAPBOOK EDITORIAL */}
          <div className="relative mb-12 pt-2">

            {/* Hand-Drawn Star & Scrap Lamp Asset */}
            <div className="absolute top-0 left-0 text-amber-900 opacity-80 pointer-events-none hidden sm:block">
              <HandDrawnStar className="w-16 h-16" />
            </div>

            <img
              src="/assetsscrap/handholdlamp.png"
              alt=""
              className="absolute -right-4 top-2 w-28 opacity-35 pointer-events-none rotate-12 hidden lg:block hover:scale-105 transition-transform z-20"
            />
            <img
              src="/assetsscrap/magnifier.png"
              alt=""
              className="absolute left-6 bottom-4 w-20 opacity-30 pointer-events-none -rotate-12 hidden md:block"
            />
            <img
              src="/assetsscrap/threeexclamationmark.png"
              alt=""
              className="absolute right-1/4 top-0 w-12 opacity-60 pointer-events-none rotate-6 hidden sm:block"
            />

            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-block">
                <HandDrawnOval className="px-3 py-1">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-950 flex items-center gap-1.5">
                    <img src="/assetsscrap/threeexclamationmark.png" alt="" className="w-4 h-4 object-contain" />
                    SEASON 01 QUEST BOARD
                  </span>
                </HandDrawnOval>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-neutral-950 uppercase leading-none font-sans">
                EVENT & <span className="font-serif italic font-normal text-amber-900">TANTANGAN</span>
              </h1>

              {/* Hand-written Cursive Subtitle */}
              <div className="flex items-center justify-center gap-2 text-amber-900 pt-1">
                <span
                  className="text-lg sm:text-xl font-bold italic text-amber-900/90"
                  style={{ fontFamily: '"Caveat", "Dancing Script", "Comic Sans MS", cursive' }}
                >
                  selesaikan misi harian & kumpulkan bonus XP!
                </span>
                <HandDrawnArrow className="w-8 h-5 text-amber-900" />
              </div>
            </div>

            {/* User Stats Card Pin - Notebook Note Style */}
            <div className="mt-8 max-w-xl mx-auto bg-[#fffdfa] border-2 border-neutral-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(30,24,20,1)] relative z-10">
              <Tape className="absolute -top-3 left-8 z-20" />
              <Tape className="absolute -top-3 right-8 z-20" />

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-900 text-white font-black text-lg flex items-center justify-center border-2 border-neutral-900">
                    {profile?.nama ? profile.nama.charAt(0).toUpperCase() : "P"}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-neutral-950">
                      {profile?.nama || "Pembaca Gibry"}
                    </h3>
                    <p className="text-[11px] font-bold text-amber-900">
                      Level {profile?.level || 1} Reader • {profile?.totalPoints || 0} XP
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-amber-100/80 px-3 py-1.5 rounded-xl border border-amber-300">
                  <Sparkles size={14} className="text-amber-900" />
                  <span className="text-xs font-black text-amber-950">
                    {totalActiveQuests} Quest Aktif
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* HAND-CRAFTED FILTER SWITCHER */}
          <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
            {[
              { id: "all" as const, label: "Semua Misi", icon: Layers, count: uniqueEvents.length + uniqueChallenges.length },
              { id: "seasonal" as const, label: "Quest Musiman", icon: Trophy, count: uniqueEvents.length },
              { id: "daily" as const, label: "Misi Harian", icon: Target, count: uniqueChallenges.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all border-2 border-neutral-900 ${isActive
                      ? "bg-amber-900 text-white shadow-[3px_3px_0px_0px_rgba(30,24,20,1)] -translate-y-0.5"
                      : "bg-[#fffdfa] text-neutral-900 hover:bg-amber-50"
                    }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${isActive ? "bg-amber-800 text-white border-amber-700" : "bg-neutral-100 text-neutral-800 border-neutral-300"
                    }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* QUEST CARDS SECTION */}
          <div className="space-y-10">

            {/* FEATURED SEASON RAID CARD */}
            {(filter === "all" || filter === "seasonal") && spotlightEvent && (
              <div className="space-y-3 pt-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-950">
                  <Flame size={16} className="text-amber-900" />
                  <span>UTAMA: SEASON RAID</span>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#fffdfa] border-2 border-neutral-900 rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(30,24,20,1)] relative z-10"
                >
                  <Tape className="absolute -top-3 left-12 z-20" />

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

                    {/* Content Left */}
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-950 border-2 border-neutral-900">
                          HIGH REWARD RAID
                        </span>
                        <span className="text-xs font-bold text-neutral-600 flex items-center gap-1">
                          <Hourglass size={14} className="text-amber-900" />
                          {getDaysLeft(spotlightEvent.endDate)} Hari Tersisa
                        </span>
                      </div>

                      <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-neutral-950 uppercase font-sans">
                          {spotlightEvent.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-neutral-700 mt-2 leading-relaxed max-w-xl font-medium">
                          {spotlightEvent.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap pt-1">
                        <div className="px-4 py-2 rounded-xl bg-amber-100 text-amber-950 border-2 border-neutral-900 font-black text-xs flex items-center gap-2">
                          <Target size={15} className="text-amber-900" />
                          <span>Target: {spotlightEvent.rules.target} Bab</span>
                        </div>

                        <div className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-950 border-2 border-neutral-900 font-black text-xs flex items-center gap-2">
                          <Zap size={15} className="text-emerald-800 fill-emerald-800" />
                          <span>Progres Membaca</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress / Action Right */}
                    <div className="lg:w-80 border-t-2 lg:border-t-0 lg:border-l-2 pt-6 lg:pt-0 lg:pl-8 border-neutral-900 flex flex-col justify-between">
                      {getProgress(spotlightEvent.id) ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-xs font-black text-neutral-950">
                            <span>Progres Quest</span>
                            <span>{getProgress(spotlightEvent.id)!.progress} / {spotlightEvent.rules.target} Bab</span>
                          </div>

                          <div className="w-full h-3 rounded-xl bg-neutral-100 border-2 border-neutral-900 overflow-hidden p-0.5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (getProgress(spotlightEvent.id)!.progress / spotlightEvent.rules.target) * 100)}%` }}
                              transition={{ duration: 0.6 }}
                              className="h-full rounded-lg bg-amber-900"
                            />
                          </div>

                          {getProgress(spotlightEvent.id)!.completed ? (
                            <div className="p-3.5 rounded-xl bg-emerald-100 text-emerald-950 font-black text-xs flex items-center justify-center gap-2 border-2 border-neutral-900">
                              <CheckCircle2 size={16} />
                              <span>Misi Selesai</span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-center font-bold text-neutral-600">
                              Baca {spotlightEvent.rules.target - getProgress(spotlightEvent.id)!.progress} bab lagi untuk klaim XP!
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <button
                            onClick={() => handleJoinEvent(spotlightEvent.id)}
                            disabled={joining === spotlightEvent.id}
                            className="w-full py-4 px-6 rounded-2xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-black flex items-center justify-center gap-2 border-2 border-neutral-900 shadow-[3px_3px_0px_0px_rgba(30,24,20,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50"
                          >
                            {joining === spotlightEvent.id ? (
                              <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Mengaktifkan...</span>
                              </>
                            ) : (
                              <>
                                <Swords size={16} />
                                <span>Ikuti Season Raid</span>
                              </>
                            )}
                          </button>
                          <p className="text-[11px] text-center font-bold text-neutral-500">
                            Poin langsung diklaim otomatis setelah selesai
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                </motion.div>
              </div>
            )}

            {/* REMAINING SEASONAL EVENTS */}
            {(filter === "all" || filter === "seasonal") && remainingEvents.length > 0 && (
              <div className="space-y-4 pt-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-950">
                  QUEST MUSIMAN LAINNYA
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
                  {remainingEvents.map((event, idx) => {
                    const progress = getProgress(event.id);
                    const isJoined = !!progress;
                    const isCompleted = progress?.completed || false;
                    const percent = progress ? Math.min(100, Math.round((progress.progress / event.rules.target) * 100)) : 0;

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-[#fffdfa] border-2 border-neutral-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(30,24,20,1)] relative z-10 flex flex-col justify-between"
                      >
                        <Tape className="absolute -top-3 right-8 z-20" />

                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-950 border border-neutral-900">
                              SPECIAL QUEST
                            </span>
                            <span className="text-xs font-bold text-neutral-600 flex items-center gap-1">
                              <Clock size={12} className="text-amber-900" />
                              {getDaysLeft(event.endDate)} Hari
                            </span>
                          </div>

                          <div>
                            <h4 className="font-black text-lg text-neutral-950 uppercase font-sans">
                              {event.title}
                            </h4>
                            <p className="text-xs text-neutral-700 mt-1 leading-relaxed font-medium">
                              {event.description}
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t-2 border-neutral-900 space-y-3">
                          <div className="flex items-center justify-between text-xs font-black text-neutral-950">
                            <span>Target: {event.rules.target} Bab</span>
                            <span className="bg-amber-100 px-2 py-0.5 rounded-md border border-neutral-900">Misi Musiman</span>
                          </div>

                          {isJoined ? (
                            <div className="space-y-2">
                              <div className="h-2.5 rounded-lg bg-neutral-100 border border-neutral-900 overflow-hidden">
                                <div className={`h-full ${isCompleted ? "bg-emerald-600" : "bg-amber-900"}`} style={{ width: `${percent}%` }} />
                              </div>
                              {isCompleted ? (
                                <div className="text-xs font-black text-emerald-950 bg-emerald-100 p-2 rounded-xl text-center flex items-center justify-center gap-1 border border-neutral-900">
                                  <CheckCircle2 size={13} /> Selesai!
                                </div>
                              ) : (
                                <div className="text-[11px] font-bold text-center text-neutral-600">
                                  Progres: {progress!.progress}/{event.rules.target}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleJoinEvent(event.id)}
                              disabled={joining === event.id}
                              className="w-full py-2.5 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-black border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(30,24,20,1)] transition-all disabled:opacity-50"
                            >
                              {joining === event.id ? "Memproses..." : "Ambil Quest"}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DAILY & WEEKLY MISSIONS GRID */}
            {(filter === "all" || filter === "daily") && uniqueChallenges.length > 0 && (
              <div className="space-y-4 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-950">
                    <Target size={16} className="text-amber-900" />
                    <span>MISI HARIAN & MINGGUAN</span>
                  </div>
                  <span className="text-[11px] font-bold text-neutral-500">Diperbarui berkala</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-3">
                  {uniqueChallenges.map((challenge, i) => {
                    const uc = getUserChallengeProgress(challenge.id);
                    const isJoined = !!uc;
                    const isCompleted = uc?.completed || false;
                    const progressPercent = uc ? Math.min(100, Math.round((uc.current / challenge.target) * 100)) : 0;

                    return (
                      <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="bg-[#fffdfa] border-2 border-neutral-900 rounded-3xl p-5 shadow-[4px_4px_0px_0px_rgba(30,24,20,1)] relative z-10 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black border-2 border-neutral-900 ${isCompleted ? "bg-emerald-100 text-emerald-950" : "bg-amber-100 text-amber-950"
                              }`}>
                              {isCompleted ? <CheckCircle2 size={18} /> : <Zap size={18} />}
                            </div>

                            <div className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 text-xs font-black border border-neutral-900 flex items-center gap-1">
                              <Sparkles size={11} className="text-amber-900" />
                              <span>Tantangan Membaca</span>
                            </div>
                          </div>

                          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block mb-0.5">
                            {challenge.type === "weekly" ? "Misi Mingguan" : "Misi Harian"}
                          </span>
                          <h4 className="font-black text-base text-neutral-950 uppercase font-sans">
                            {challenge.title}
                          </h4>
                          <p className="text-xs text-neutral-700 mt-1 leading-relaxed font-medium">
                            {challenge.description}
                          </p>
                        </div>

                        <div className="pt-3 mt-4 border-t-2 border-neutral-900 space-y-3">
                          {isJoined && (
                            <div>
                              <div className="flex items-center justify-between text-[10px] font-black mb-1 text-neutral-600">
                                <span>Progres Misi</span>
                                <span>{uc?.current || 0} / {challenge.target}</span>
                              </div>
                              <div className="h-2.5 rounded-lg bg-neutral-100 border border-neutral-900 overflow-hidden">
                                <div
                                  className={`h-full ${isCompleted ? "bg-emerald-600" : "bg-amber-900"}`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {isCompleted ? (
                            <div className="text-xs font-black text-emerald-950 bg-emerald-100 p-2 rounded-xl text-center flex items-center justify-center gap-1 border border-neutral-900">
                              <CheckCircle2 size={13} /> Selesai
                            </div>
                          ) : isJoined ? (
                            <div className="text-xs font-black text-amber-950 bg-amber-100 p-2 rounded-xl text-center flex items-center justify-center gap-1 border border-neutral-900">
                              <Clock size={13} /> Berlangsung
                            </div>
                          ) : (
                            <button
                              onClick={() => handleJoinChallenge(challenge.id)}
                              disabled={joining === challenge.id}
                              className="w-full py-2.5 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-black border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(30,24,20,1)] transition-all disabled:opacity-50"
                            >
                              {joining === challenge.id ? "Memproses..." : "Aktifkan Misi"}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </PageTransition>
  );
}
