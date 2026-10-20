import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { WelcomeModal } from "@/components/WelcomeModal";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useAdminView } from "@/contexts/AdminViewContext";
import { Shield, ArrowRight } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { adminViewMode, setAdminViewMode } = useAdminView();

  // If user is admin and in dedicated admin mode (or on /admin), hide student floating navbar & footer
  const isDedicatedAdminView =
    isAdmin &&
    (location.pathname === "/admin" || (location.pathname === "/" && adminViewMode === "admin"));

  // Hide navbar and footer on chat pages, login page, and dedicated admin workspace
  const isImmersive =
    location.pathname.startsWith("/chat/") ||
    location.pathname.startsWith("/clubs/") ||
    location.pathname === "/login" ||
    isDedicatedAdminView;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-background)" }}>
      {/* Top Banner when Admin is inspecting the site in Student Preview Mode */}
      {isAdmin && adminViewMode === "student" && !isDedicatedAdminView && (
        <div className="bg-[#304D42] text-[#FFF9EF] px-4 py-2.5 text-xs font-space flex flex-wrap items-center justify-between gap-2 z-50 sticky top-0 shadow-sm border-b border-[#DEDDD0]/20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Shield size={14} className="text-[#AD6549]" />
            <span>
              <strong>Mode Pratinjau Siswa:</strong> Anda sedang memeriksa tampilan web dari sudut pandang siswa.
            </span>
          </div>
          <button
            onClick={() => setAdminViewMode("admin")}
            className="px-3 py-1 bg-[#AD6549] hover:bg-[#96553c] text-[#FFF9EF] rounded-lg font-bold transition-all text-xs cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <span>Kembali ke Panel Admin</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {!isImmersive && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
      {!isImmersive && <Footer />}
      <WelcomeModal />
    </div>
  );
}
