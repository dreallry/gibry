import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Menu,
  X,
  User,
  ClipboardCheck,
  BookOpen,
  MapPin,
  Users,
  Trophy,
  BookMarked,
  StickyNote,
  ChevronDown,
  Shield,
  Calendar,
  Gift,
  Award,
  Target,
  Receipt,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationList } from "@/components/ui/notification-list";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAdmin } from "@/hooks/useAdmin";

const navLinks = [
  { label: "Beranda", path: "/" },
  { label: "Koleksi", path: "/books", icon: BookOpen },
  { label: "Lokasi", path: "/location", icon: MapPin },
  { label: "Presensi", path: "/attendance", icon: ClipboardCheck, public: true },
  { label: "Komunitas", path: "/social", icon: Users, public: true },
];

const moreLinks = [
  { label: "Transaksi", path: "/transactions", icon: Receipt },
  { label: "Peringkat Siswa", path: "/leaderboard", icon: Trophy },
  { label: "Klub Buku", path: "/clubs", icon: BookMarked },
  { label: "Catatan Buku", path: "/notes", icon: StickyNote },
  { label: "Event & Misi", path: "/events", icon: Calendar },
  { label: "Hadiah & Poin", path: "/rewards", icon: Gift },
];

// Refined playful spring physics (subtle tactile bounce, never overbouncy)
const springPhysics = {
  type: "spring" as const,
  stiffness: 440,
  damping: 20,
  mass: 0.75,
};

// Slightly bouncier spring for dropdown popups
const dropdownSpring = {
  type: "spring" as const,
  stiffness: 500,
  damping: 20,
  mass: 0.7,
};

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();
  const { user, profile, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isPast = window.scrollY > 20;
          setScrolled((prev) => (prev !== isPast ? isPast : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  // Smooth scroll to top when clicking the current page link (especially Beranda)
  const handleNavClick = (path: string, e?: React.MouseEvent) => {
    if (location.pathname === path) {
      if (e) e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      {/* ── DESKTOP & TABLET: FLOATING MACOS-STYLE DOCK PILL NAVBAR ── */}
      <header className="fixed top-3 sm:top-4 left-0 right-0 z-50 flex justify-center pointer-events-none px-3">
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="pointer-events-auto flex items-center gap-1 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full select-none"
          style={{
            background: scrolled
              ? "rgba(30, 52, 44, 0.90)"
              : "rgba(32, 56, 48, 0.82)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255, 249, 239, 0.2)",
            boxShadow: scrolled
              ? "0 16px 36px -6px rgba(16, 28, 24, 0.45), 0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.28)"
              : "0 12px 28px -4px rgba(16, 28, 24, 0.35), 0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.22)",
          }}
        >
          {/* ── BRAND ISLAND (SPLIT PILL BADGE) ── */}
          <motion.div
            whileHover={{ scale: 1.05, rotate: [0, -3, 3, 0] }}
            whileTap={{ scale: 0.95 }}
            transition={springPhysics}
            className="flex items-center"
          >
            <Link
              to="/"
              onClick={(e) => handleNavClick("/", e)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <img
                src="/digipusslogo.jpg"
                alt="Gibry"
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover shadow-2xs border border-white/20"
              />
              <span className="font-editorial font-bold text-sm sm:text-base tracking-tight text-[#FFF9EF]">
                Gibry
              </span>
            </Link>
          </motion.div>

          {/* macOS Dock Segment Divider */}
          <div className="hidden md:block h-4 w-px bg-[#FFF9EF]/20 mx-1 pointer-events-none" />

          {/* ── MAIN NAVIGATION DOCK ITEMS (DESKTOP) ── */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <motion.div
                  key={link.path}
                  whileHover={{ y: -2, scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  transition={springPhysics}
                  className="relative"
                >
                  <Link
                    to={link.path}
                    onClick={(e) => handleNavClick(link.path, e)}
                    className="relative px-3.5 py-1.5 rounded-full text-xs font-medium font-space transition-colors flex items-center gap-1.5 text-center"
                    style={{
                      color: active ? "#FFF9EF" : "rgba(255, 249, 239, 0.78)",
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {/* Active Pill Highlight */}
                    {active && (
                      <motion.div
                        layoutId="dock-active-pill"
                        className="absolute inset-0 bg-[#FFF9EF]/20 rounded-full border border-[#FFF9EF]/30 shadow-2xs backdrop-blur-xs"
                        transition={{ type: "spring", stiffness: 460, damping: 28 }}
                      />
                    )}

                    {/* Clean Inline Active Indicator Dot (Rapi di dalam Pill) */}
                    {active && (
                      <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-[#AD6549] shadow-[0_0_6px_#AD6549] shrink-0" />
                    )}

                    <span className="relative z-10">{link.label}</span>
                  </Link>
                </motion.div>
              );
            })}

            {/* "Lainnya" Dropdown Pill for Logged-in Users */}
            {user && (
              <div ref={moreRef} className="relative">
                <motion.button
                  whileHover={{ y: -2, scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  transition={springPhysics}
                  onClick={() => setMoreOpen(!moreOpen)}
                  className="relative px-3 py-1.5 rounded-full text-xs font-medium font-space flex items-center gap-1.5 cursor-pointer transition-colors"
                  style={{
                    color: moreOpen ? "#FFF9EF" : "rgba(255, 249, 239, 0.78)",
                    background: moreOpen ? "rgba(255, 249, 239, 0.18)" : "transparent",
                  }}
                >
                  <span>Lainnya</span>
                  <motion.div
                    animate={{ rotate: moreOpen ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <ChevronDown size={11} />
                  </motion.div>
                </motion.button>

                {/* Bouncy Dropdown Card */}
                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.88, y: -8, rotateX: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -6, rotateX: 4 }}
                      transition={dropdownSpring}
                      className="absolute top-full right-0 mt-3 w-54 rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-2xl"
                      style={{
                        transformOrigin: "top right",
                        background: "rgba(24, 44, 36, 0.96)",
                        border: "1px solid rgba(255, 249, 239, 0.22)",
                        boxShadow: "0 20px 48px -4px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      <div className="space-y-0.5">
                        {moreLinks.map((link) => (
                          <motion.div
                            key={link.path}
                            whileHover={{ x: 4, scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 450, damping: 18 }}
                          >
                            <Link
                              to={link.path}
                              onClick={() => setMoreOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl font-space transition-colors hover:bg-white/10"
                              style={{
                                color: isActive(link.path) ? "#FFF9EF" : "rgba(255, 249, 239, 0.75)",
                                background: isActive(link.path) ? "rgba(173, 101, 73, 0.25)" : "transparent",
                              }}
                            >
                              <link.icon size={13} className="text-[#AD6549]" />
                              <span>{link.label}</span>
                            </Link>
                          </motion.div>
                        ))}

                        {isAdmin && (
                          <>
                            <div className="my-1 border-t border-white/10" />
                            <motion.div
                              whileHover={{ x: 4, scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              transition={{ type: "spring", stiffness: 450, damping: 18 }}
                            >
                              <Link
                                to="/admin"
                                onClick={() => setMoreOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl font-space transition-colors hover:bg-white/10"
                                style={{
                                  color: isActive("/admin") ? "#FFF9EF" : "rgba(255, 249, 239, 0.75)",
                                  background: isActive("/admin") ? "rgba(173, 101, 73, 0.25)" : "transparent",
                                }}
                              >
                                <Shield size={13} className="text-[#AD6549]" />
                                <span>Admin Panel</span>
                              </Link>
                            </motion.div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* macOS Dock Segment Divider */}
          <div className="h-4 w-px bg-[#FFF9EF]/20 mx-1 pointer-events-none" />

          {/* ── ACTION / AUTH ISLAND (SPLIT PILL BADGE) ── */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {user ? (
              <>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                  whileTap={{ scale: 0.92 }}
                  transition={springPhysics}
                >
                  <NotificationList />
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={springPhysics}
                >
                  <Link
                    to="/profile"
                    className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full text-xs font-space transition-all border border-white/10 hover:border-white/25"
                    style={{
                      background: location.pathname === "/profile" ? "rgba(255, 249, 239, 0.2)" : "rgba(255, 249, 239, 0.08)",
                      color: "#FFF9EF",
                    }}
                  >
                    {profile?.photoURL ? (
                      <img
                        src={profile.photoURL}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover border border-[#AD6549]/60"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[#AD6549] text-white flex items-center justify-center text-[9px] font-bold">
                        {profile?.nama?.charAt(0) || "U"}
                      </div>
                    )}
                    <span className="hidden sm:inline font-medium">Profil</span>
                  </Link>
                </motion.div>

                <motion.button
                  whileHover={{ scale: 1.1, rotate: 6 }}
                  whileTap={{ scale: 0.9 }}
                  transition={springPhysics}
                  onClick={() => setShowLogoutConfirm(true)}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white cursor-pointer"
                  title="Keluar"
                >
                  <LogOut size={13} />
                </motion.button>
              </>
            ) : (
              <motion.div
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                transition={springPhysics}
              >
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#F2ECDF] hover:bg-[#FFF9EF] text-[#304D42] text-xs font-bold font-space shadow-xs transition-colors"
                >
                  <span>Masuk</span>
                </Link>
              </motion.div>
            )}

            {/* Mobile Menu Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={springPhysics}
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={17} /> : <Menu size={17} />}
            </motion.button>
          </div>
        </motion.nav>
      </header>

      {/* ── MOBILE MENU (PULL-TO-DISMISS FROSTED GLASS DOCK SHEET) ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs md:hidden"
              onClick={() => setMobileOpen(false)}
            />

            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.04, bottom: 0.55 }}
              onDragEnd={(_e, info) => {
                if (info.offset.y > 60 || info.velocity.y > 350) {
                  setMobileOpen(false);
                }
              }}
              whileDrag={{ scale: 0.99 }}
              initial={{ opacity: 0, scale: 0.9, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -12 }}
              transition={{ type: "spring", stiffness: 450, damping: 22, mass: 0.8 }}
              className="fixed top-18 left-4 right-4 z-50 md:hidden rounded-2xl p-3 shadow-2xl backdrop-blur-2xl max-h-[calc(100vh-88px)] overflow-y-auto cursor-grab active:cursor-grabbing"
              style={{
                background: "rgba(28, 48, 40, 0.96)",
                border: "1px solid rgba(255, 249, 239, 0.2)",
                boxShadow: "0 20px 48px rgba(0, 0, 0, 0.4)",
              }}
            >
              {/* Swipe Drag Pill Handle (Tanda Nyeret / Tarik ke Bawah) */}
              <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-2.5" />

              <div className="flex flex-col space-y-1">
                {navLinks.map((link) => {
                  const active = isActive(link.path);
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileOpen(false)}
                      className="px-4 py-2.5 text-xs font-space font-medium rounded-xl flex items-center justify-between transition-colors"
                      style={{
                        color: active ? "#FFF9EF" : "rgba(255, 249, 239, 0.75)",
                        background: active ? "rgba(255, 249, 239, 0.16)" : "transparent",
                      }}
                    >
                      <span>{link.label}</span>
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-[#AD6549]" />}
                    </Link>
                  );
                })}

                {user && (
                  <>
                    <div className="my-1.5 border-t border-white/10" />
                    <span className="px-4 py-1 text-[10px] uppercase font-mono tracking-wider text-white/40">
                      Menu Eksplorasi
                    </span>
                    {moreLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setMobileOpen(false)}
                        className="px-4 py-2 text-xs font-space rounded-xl flex items-center gap-2.5 transition-colors hover:bg-white/10 text-white/80"
                      >
                        <link.icon size={13} className="text-[#AD6549]" />
                        <span>{link.label}</span>
                      </Link>
                    ))}

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="px-4 py-2 text-xs font-space rounded-xl flex items-center gap-2.5 transition-colors hover:bg-white/10 text-white/80"
                      >
                        <Shield size={13} className="text-[#AD6549]" />
                        <span>Admin Panel</span>
                      </Link>
                    )}
                  </>
                )}

                <div className="my-1.5 border-t border-white/10" />

                {user ? (
                  <div className="flex items-center justify-between pt-1 px-2">
                    <Link
                      to="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 text-xs text-white/85 font-space hover:text-white"
                    >
                      <User size={14} className="text-[#AD6549]" />
                      <span>Profil Saya</span>
                    </Link>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="text-xs text-red-300 font-space hover:text-red-200 cursor-pointer flex items-center gap-1"
                    >
                      <LogOut size={13} />
                      <span>Keluar</span>
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="mt-1 py-2 rounded-xl bg-[#F2ECDF] text-[#304D42] text-center text-xs font-bold font-space shadow-xs"
                  >
                    Masuk ke Akun
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Keluar dari Akun?"
        message="Apakah Anda yakin ingin keluar? Anda perlu login kembali untuk mengakses fitur komunitas dan peminjaman."
        confirmText="Ya, Keluar"
        variant="warning"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}

export default Navbar;
