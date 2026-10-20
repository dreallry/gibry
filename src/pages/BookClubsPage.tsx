import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getBookClubs, onBookClubsChanged, createBookClub, joinBookClub, leaveBookClub, isUserClubMember, type BookClub } from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import { 
  Users, Plus, X, Loader2, UserMinus, UserPlus, MessageCircle, Sparkles, 
  Search, Compass, Flame, CheckCircle2, Bookmark, BookOpen, Lightbulb, 
  Feather, Award, TrendingUp, BookMarked
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import BookClubHero from "@/components/ui/hero";

const CLUB_THEMES = [
  { bg: "from-amber-500/10 to-orange-500/5", border: "border-amber-900/15", badge: "bg-amber-100 text-amber-900", icon: BookOpen, accent: "#a67c52" },
  { bg: "from-sky-500/10 to-indigo-500/5", border: "border-sky-900/15", badge: "bg-sky-100 text-sky-900", icon: Lightbulb, accent: "#2563eb" },
  { bg: "from-purple-500/10 to-pink-500/5", border: "border-purple-900/15", badge: "bg-purple-100 text-purple-900", icon: Feather, accent: "#7c3aed" },
  { bg: "from-emerald-500/10 to-teal-500/5", border: "border-emerald-900/15", badge: "bg-emerald-100 text-emerald-900", icon: Award, accent: "#059669" },
];

export default function BookClubsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clubs, setClubs] = useState<BookClub[]>([]);
  const [userClubIds, setUserClubIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [newClubDesc, setNewClubDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [leaveClubId, setLeaveClubId] = useState<string | null>(null);

  // Filters & Search State
  const [activeFilter, setActiveFilter] = useState<"all" | "my" | "popular">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onBookClubsChanged(async (allClubs) => {
      setClubs(allClubs);
      if (user) {
        const memberClubIds = new Set<string>();
        for (const club of allClubs) {
          if (await isUserClubMember(club.id, user.uid)) {
            memberClubIds.add(club.id);
          }
        }
        setUserClubIds(memberClubIds);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  async function loadClubs() {
    try {
      const allClubs = await getBookClubs();
      setClubs(allClubs);

      if (user) {
        const memberClubIds = new Set<string>();
        for (const club of allClubs) {
          if (await isUserClubMember(club.id, user.uid)) {
            memberClubIds.add(club.id);
          }
        }
        setUserClubIds(memberClubIds);
      }
    } catch (err) { console.error(err); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newClubName.trim()) return;
    setCreating(true);
    try {
      await createBookClub(newClubName.trim(), newClubDesc.trim(), user.uid);
      toast("success", "Book club berhasil dibuat!");
      setShowCreate(false);
      setNewClubName("");
      setNewClubDesc("");
      loadClubs();
    } catch (err: any) {
      toast("error", err.message || "Gagal membuat book club");
    } finally { setCreating(false); }
  }

  async function handleJoin(clubId: string) {
    if (!user) return;
    try {
      await joinBookClub(clubId, user.uid);
      toast("success", "Berhasil bergabung ke club!");
      loadClubs();
    } catch (err: any) { toast("error", err.message); }
  }

  async function handleLeave(clubId: string) {
    if (!user) return;
    try {
      await leaveBookClub(clubId, user.uid);
      toast("info", "Berhasil keluar dari club");
      loadClubs();
    } catch (err: any) { toast("error", err.message); }
  }

  const scrollToClubs = () => {
    const el = document.getElementById("club-list-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Filtered Clubs Logic
  const filteredClubs = clubs.filter((club) => {
    const matchesSearch = 
      club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (club.description && club.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeFilter === "my") return userClubIds.has(club.id);
    if (activeFilter === "popular") return (club.memberCount || 0) >= 3;
    return true;
  });

  // Calculate Realtime Most Popular Club
  const popularClub = clubs.length > 0 
    ? [...clubs].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))[0] 
    : null;

  return (
    <PageTransition>
      <div className="tile">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Elegant Hero Component with Realtime Popular Club Data */}
          <BookClubHero 
            onCreateClick={() => setShowCreate(true)}
            onJoinClick={scrollToClubs}
            popularClub={popularClub}
          />

          {/* Section Header & Interactive Filter Bar */}
          <div id="club-list-section" className="pt-4 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles size={16} className="text-amber-800" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Jelajahi Komunitas
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--color-foreground)" }}>
                  Klub Baca Tersedia
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
                  Temukan komunitas baca favorit Anda dan mulailah berdiskusi
                </p>
              </div>

              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white shadow-xs transition-all hover:scale-105"
                style={{ background: "var(--color-primary)" }}
              >
                <Plus size={16} /> Buat Club Baru
              </button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="card p-3 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                {[
                  { id: "all", label: "Semua Klub", icon: Compass },
                  { id: "my", label: `Klub Saya (${userClubIds.size})`, icon: Bookmark },
                  { id: "popular", label: "Populer", icon: Flame },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        isActive
                          ? "bg-[#4a3f35] text-white shadow-xs"
                          : "text-neutral-600 hover:bg-black/5"
                      }`}
                    >
                      <Icon size={14} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-72">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari klub atau topik..."
                  className="w-full text-xs py-2 pl-9 pr-4 rounded-xl border outline-none transition-all focus:border-amber-700 bg-white/80"
                  style={{ borderColor: "var(--color-border)" }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Loading Skeleton */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card p-6 rounded-3xl animate-pulse">
                  <div className="h-20 bg-black/5 rounded-2xl mb-4"></div>
                  <div className="h-5 w-2/3 bg-black/5 rounded mb-3" />
                  <div className="h-3 w-full bg-black/5 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-black/5 rounded" />
                </div>
              ))}
            </div>
          ) : filteredClubs.length === 0 ? (
            <div className="card text-center py-16 p-8 rounded-3xl">
              <Users size={44} className="mx-auto mb-4 text-amber-800/50" />
              <h3 className="text-lg font-bold mb-1" style={{ color: "var(--color-foreground)" }}>
                {searchQuery ? "Klub Tidak Ditemukan" : "Belum Ada Book Club"}
              </h3>
              <p className="text-xs max-w-md mx-auto" style={{ color: "var(--color-muted-foreground)" }}>
                {searchQuery 
                  ? `Tidak ada klub yang cocok dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                  : "Jadilah pelopor! Buat klub baca pertama Anda untuk mengundang teman-teman berdiskusi buku."}
              </p>
              <button
                onClick={() => { setSearchQuery(""); setShowCreate(true); }}
                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold text-white transition-all hover:scale-105"
                style={{ background: "var(--color-primary)" }}
              >
                <Plus size={15} /> Buat Club Baru
              </button>
            </div>
          ) : (
            /* Exciting Cards Grid Layout */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredClubs.map((club, i) => {
                  const isMember = userClubIds.has(club.id);
                  const theme = CLUB_THEMES[i % CLUB_THEMES.length];
                  const IconComponent = theme.icon;
                  
                  return (
                    <motion.div
                      key={club.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      className="card rounded-[2rem] overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 border"
                      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
                    >
                      {/* Decorative Card Header Banner */}
                      <div>
                        <div className={`h-24 bg-gradient-to-r ${theme.bg} p-4 flex items-start justify-between relative overflow-hidden border-b border-black/5`}>
                          <div className="w-9 h-9 rounded-xl bg-white/80 backdrop-blur-xs flex items-center justify-center text-amber-900 border border-black/5 shadow-xs">
                            <IconComponent size={18} />
                          </div>

                          {isMember ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-xs">
                              <CheckCircle2 size={11} /> Joined
                            </span>
                          ) : (
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${theme.badge} border border-black/5`}>
                              Klub Aktif
                            </span>
                          )}

                          {/* Subtle Icon Pattern Background */}
                          <div className="absolute -right-3 -bottom-3 opacity-10 text-amber-900 pointer-events-none">
                            <BookMarked size={72} />
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-5">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className="text-base font-bold truncate group-hover:text-amber-800 transition-colors" style={{ color: "var(--color-foreground)" }}>
                              {club.name}
                            </h3>
                          </div>

                          <p className="text-xs leading-relaxed line-clamp-2 min-h-[2.25rem] mb-4" style={{ color: "var(--color-muted-foreground)" }}>
                            {club.description || "Komunitas membaca & berdiskusi bersama mengenai berbagai buku menarik."}
                          </p>

                          {/* Member Avatars Stack */}
                          <div className="flex items-center justify-between pt-3 border-t border-black/5">
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2 overflow-hidden">
                                {["Felix", "Sofia", "Leo", "Maya"].slice(0, Math.min(3, club.memberCount || 1)).map((seed, idx) => (
                                  <img
                                    key={idx}
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed + club.id}`}
                                    alt=""
                                    className="w-6 h-6 rounded-full border-2 border-white bg-amber-50"
                                  />
                                ))}
                              </div>
                              <span className="text-[11px] font-bold" style={{ color: "var(--color-muted-foreground)" }}>
                                {club.memberCount} Anggota
                              </span>
                            </div>

                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/5 text-neutral-600">
                              <TrendingUp size={10} /> Aktif
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="p-5 pt-0">
                        {isMember ? (
                          <div className="flex gap-2">
                            <Link 
                              to={`/clubs/${club.id}`} 
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]" 
                              style={{ background: "var(--color-primary)" }}
                            >
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <MessageCircle size={14} /> Ruang Chat
                            </Link>

                            <button 
                              onClick={() => setLeaveClubId(club.id)} 
                              className="px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" 
                              style={{ borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}
                              title="Keluar dari club"
                            >
                              <UserMinus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleJoin(club.id)} 
                            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all hover:bg-black/5 group-hover:border-amber-800/40" 
                            style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
                          >
                            <UserPlus size={14} className="text-amber-800" /> Gabung Klub
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Confirm Leave Dialog */}
        <ConfirmDialog
          open={!!leaveClubId}
          title="Keluar dari Club?"
          message="Apakah Anda yakin ingin keluar dari book club ini? Anda perlu bergabung kembali untuk mengakses chat dan aktivitas club."
          confirmText="Ya, Keluar"
          variant="warning"
          onConfirm={() => { if (leaveClubId) handleLeave(leaveClubId); setLeaveClubId(null); }}
          onCancel={() => setLeaveClubId(null)}
        />

        {/* Create Club Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="rounded-3xl max-w-md w-full p-6 shadow-2xl" style={{ background: "var(--color-card)" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>Buat Book Club Baru</h3>
                <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--color-muted)" }}><X size={16} /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-foreground)" }}>Nama Club</label>
                  <input type="text" value={newClubName} onChange={(e) => setNewClubName(e.target.value)} className="search-pill" placeholder="Contoh: Klub Novel Klasik" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-foreground)" }}>Deskripsi</label>
                  <textarea value={newClubDesc} onChange={(e) => setNewClubDesc(e.target.value)} className="search-pill h-24 p-3 resize-none" placeholder="Jelaskan topik bacaan atau fokus diskusi klub ini..." />
                </div>
                <button type="submit" disabled={creating || !newClubName.trim()} className="w-full h-12 text-white rounded-full text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: "var(--color-primary)" }}>
                  {creating ? <><Loader2 size={16} className="animate-spin" /> Membuat...</> : "Buat Club"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
