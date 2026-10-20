import React from "react";
import {
  ArrowDownLeft,
  BookOpen,
  Users,
  Megaphone,
  BarChart3,
  Eye,
  LogOut,
  X,
  BookOpenCheck,
} from "lucide-react";
import { useAdminView } from "@/contexts/AdminViewContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";

export type AdminTab =
  | "circulation"
  | "books"
  | "users"
  | "programs"
  | "reports"
  // Backward-compatibility aliases
  | "dashboard"
  | "evaluation"
  | "fines"
  | "reading_lists"
  | "events"
  | "rewards"
  | "announcements"
  | "presensi"
  | "moderation"
  | "invitations"
  | "suggestions"
  | "audit_logs";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface MenuItem {
  id: AdminTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  aliases?: AdminTab[];
}

export function AdminSidebar({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}: AdminSidebarProps) {
  const { setAdminViewMode } = useAdminView();
  const { user, profile, logout } = useAuth();
  const { isSuperAdmin, isLibrarian, isViewer } = useAdmin();

  // 5 Menu Inti Meja Kerja yang Tenang dan Manusiawi
  const staffMenuItems: MenuItem[] = [
    {
      id: "circulation",
      label: "Meja Sirkulasi",
      description: "Peminjaman, kembali, dan presensi",
      icon: ArrowDownLeft,
      aliases: ["circulation", "dashboard", "fines", "presensi"],
    },
    {
      id: "books",
      label: "Katalog Koleksi",
      description: "Koleksi fisik dan buku digital",
      icon: BookOpen,
      aliases: ["books"],
    },
    {
      id: "users",
      label: "Keanggotaan Siswa",
      description: "Data siswa dan kode undangan",
      icon: Users,
      aliases: ["users", "invitations"],
    },
    {
      id: "programs",
      label: "Program Literasi",
      description: "Mading, tantangan, hadiah, usulan",
      icon: Megaphone,
      aliases: [
        "programs",
        "announcements",
        "events",
        "rewards",
        "suggestions",
        "moderation",
        "reading_lists",
      ],
    },
    {
      id: "reports",
      label: "Laporan Perpustakaan",
      description: "Statistik, evaluasi, dan audit",
      icon: BarChart3,
      aliases: ["reports", "evaluation", "audit_logs"],
    },
  ];

  // Viewer role (pemeriksa laporan)
  const viewerMenuItems: MenuItem[] = [
    {
      id: "reports",
      label: "Laporan Perpustakaan",
      description: "Statistik pembaca dan kepatuhan",
      icon: BarChart3,
      aliases: ["reports", "evaluation", "dashboard"],
    },
    {
      id: "books",
      label: "Katalog Koleksi",
      description: "Pencarian katalog koleksi",
      icon: BookOpen,
      aliases: ["books"],
    },
    {
      id: "users",
      label: "Keanggotaan Siswa",
      description: "Daftar siswa terdaftar",
      icon: Users,
      aliases: ["users"],
    },
  ];

  const menuItems = isViewer ? viewerMenuItems : staffMenuItems;

  const roleText = isSuperAdmin
    ? "Administrator"
    : isLibrarian
      ? "Pustakawan"
      : isViewer
        ? "Pemeriksa"
        : "Petugas";

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#FFF9EF] dark:bg-[#1B2E27] border-r border-[#DEDDD0] dark:border-[#3A5B4F] flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header Sidebar: Identitas Sekolah yang Bersahaja */}
        <div className="p-5 border-b border-[#DEDDD0] dark:border-[#3A5B4F] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] flex items-center justify-center font-bold shadow-2xs">
              <BookOpenCheck size={18} />
            </div>
            <div>
              <h1 className="font-serif font-bold text-base text-[#304D42] dark:text-[#FFF9EF] tracking-tight">
                Gibry Perpus
              </h1>
              <p className="text-[11px] font-medium text-[#565D4F] dark:text-[#BAC0B3]">
                {roleText} Meja Layanan
              </p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center lg:hidden text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#304D42] dark:hover:text-[#FFF9EF] rounded-xl cursor-pointer"
            aria-label="Tutup Menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* 5 Menu Inti Bersih dan Nyaman */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5">
          <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#565D4F] dark:text-[#BAC0B3]">
            Menu Utama
          </p>

          {menuItems.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.aliases && item.aliases.includes(activeTab));
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`min-h-[44px] w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#304D42] dark:bg-[#9E5336] text-[#FFF9EF] shadow-2xs"
                    : "text-[#304D42] dark:text-[#FFF9EF] hover:bg-[#F2ECDF] dark:hover:bg-[#233B32]"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? "bg-white/15 text-[#FFF9EF]"
                      : "text-[#565D4F] dark:text-[#BAC0B3]"
                  }`}
                >
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-tight truncate">
                    {item.label}
                  </p>
                  <p
                    className={`text-[10px] leading-tight truncate mt-0.5 ${
                      isActive
                        ? "text-[#FFF9EF]/80"
                        : "text-[#565D4F] dark:text-[#BAC0B3]"
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bagian Bawah: Pratinjau Siswa & Profil Petugas */}
        <div className="p-3 border-t border-[#DEDDD0] dark:border-[#3A5B4F] space-y-2 bg-[#F2ECDF]/60 dark:bg-[#233B32]">
          <button
            onClick={() => setAdminViewMode("student")}
            className="min-h-[44px] w-full py-2 px-3 rounded-xl bg-[#E8EBDF] dark:bg-[#2C473D] hover:bg-[#d8decb] dark:hover:bg-[#37564A] text-[#304D42] dark:text-[#FFF9EF] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs border border-[#DEDDD0] dark:border-[#3A5B4F]"
            title="Lihat website seperti yang dilihat siswa"
          >
            <Eye size={15} className="text-[#94492C] dark:text-[#E2AA90]" />
            <span>Lihat Tampilan Siswa</span>
          </button>

          <div className="flex items-center justify-between px-2 pt-1 text-xs">
            <div className="min-w-0 pr-2">
              <p className="font-bold text-[#304D42] dark:text-[#FFF9EF] truncate">
                {profile?.nama || user?.email}
              </p>
              <p className="text-[10px] text-[#565D4F] dark:text-[#BAC0B3]">
                {roleText} Gibry
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-[#565D4F] dark:text-[#BAC0B3] hover:text-[#94492C] dark:hover:text-[#E2AA90] rounded-xl transition-colors cursor-pointer"
              title="Keluar dari akun"
              aria-label="Keluar akun"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
