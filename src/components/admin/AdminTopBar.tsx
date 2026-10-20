import React, { useState, useEffect } from "react";
import { Menu, Eye, Moon, Sun } from "lucide-react";
import { useAdminView } from "@/contexts/AdminViewContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";

interface AdminTopBarProps {
  onOpenMobile: () => void;
  activeBorrowsCount?: number;
  unpaidFinesCount?: number;
}

export function AdminTopBar({
  onOpenMobile,
}: AdminTopBarProps) {
  const { setAdminViewMode } = useAdminView();
  const { profile } = useAuth();
  const { isSuperAdmin, isLibrarian, isViewer } = useAdmin();

  const [isDark, setIsDark] = useState(() => {
    return (
      localStorage.getItem("gibry-theme") === "dark" ||
      document.documentElement.classList.contains("dark")
    );
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("gibry-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("gibry-theme", "light");
    }
  }, [isDark]);

  const roleLabel = isSuperAdmin
    ? "Administrator"
    : isLibrarian
      ? "Pustakawan"
      : isViewer
        ? "Pemeriksa"
        : "Petugas";

  return (
    <header className="sticky top-0 z-30 bg-[#FFF9EF]/95 dark:bg-[#1B2E27]/95 backdrop-blur-md border-b border-[#DEDDD0] dark:border-[#3A5B4F] px-4 md:px-8 py-3 flex items-center justify-between transition-colors">
      {/* Sisi Kiri: Menu Mobile dan Judul Panel */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] rounded-xl transition-colors cursor-pointer"
          aria-label="Buka Menu"
        >
          <Menu size={20} />
        </button>

        <div>
          <span className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF]">
            Panel Pengelola Perpustakaan
          </span>
          <span className="hidden sm:inline-block ml-2 text-xs text-[#565D4F] dark:text-[#BAC0B3]">
            Gibry School Library
          </span>
        </div>
      </div>

      {/* Sisi Kanan: Aksi Ringkas */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Tombol Pratinjau Tampilan Siswa */}
        <button
          onClick={() => setAdminViewMode("student")}
          className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#2C473D] hover:bg-[#E8EBDF] dark:hover:bg-[#37564A] text-[#304D42] dark:text-[#FFF9EF] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          title="Beralih ke pratinjau antarmuka siswa"
        >
          <Eye size={15} className="text-[#94492C] dark:text-[#E2AA90]" />
          <span className="hidden sm:inline">Tampilan Siswa</span>
          <span className="sm:hidden">Siswa</span>
        </button>

        {/* Toggle Mode Gelap */}
        <button
          onClick={() => setIsDark((prev) => !prev)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors cursor-pointer shadow-2xs"
          title={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
          aria-label={isDark ? "Mode Terang" : "Mode Gelap"}
        >
          {isDark ? <Sun size={16} className="text-[#E2AA90]" /> : <Moon size={16} className="text-[#304D42]" />}
        </button>

        {/* Profil Petugas */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#DEDDD0] dark:border-[#3A5B4F]">
          <div className="w-8 h-8 rounded-full bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
            {profile?.nama ? profile.nama.charAt(0) : "P"}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-[#304D42] dark:text-[#FFF9EF] leading-tight truncate max-w-[120px]">
              {profile?.nama || "Pustakawan"}
            </p>
            <p className="text-[10px] text-[#565D4F] dark:text-[#BAC0B3] leading-tight">
              {roleLabel}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
