import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useAdminView } from "@/contexts/AdminViewContext";
import { lazy, Suspense } from 'react';
import Hero from "@/components/home/Hero";
import ParallaxStory from "@/components/home/ParallaxStory";
import CuratedLibraryShelf from "@/components/home/CuratedLibraryShelf";
import StudentDeskDashboard from "@/components/home/StudentDeskDashboard";
import SearchBar from "@/components/home/SearchBar";
import CTA from "@/components/home/CTA";

const AdminPage = lazy(() => import('@/pages/AdminPage'));

export default function HomePage() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { adminViewMode } = useAdminView();

  // Jika akun adalah Admin/Pustakawan dan berada dalam mode Admin (default)
  if (user && isAdmin && adminViewMode === "admin") {
    return <Suspense fallback={<p role="status">Memuat...</p>}><AdminPage /></Suspense>;
  }

  return (
    <>
      {user ? (
        /* ============================================================
           DASHBOARD SETELAH USER LOGIN (SISWA ATAU PRATINJAU SISWA)
           Konsep: "Meja Baca Digital Siswa" (Warm Tactile Library Desk)
           ============================================================ */
        <div className="bg-[#FFF9EF] min-h-screen">
          <StudentDeskDashboard />
          <CuratedLibraryShelf />
        </div>
      ) : (
        /* ============================================================
           DASHBOARD SEBELUM USER LOGIN (LANDING EKSPLORASI)
           Konsep: "Perpustakaan Terbuka & Bilik Komunitas Interaktif"
           - Hero Editorial Hangat dengan Aksen Arsip Perpustakaan
           - Parallax Story: Alur 3 Detik Sirkulasi Digital
           - Preview Fitur Sosial Interaktif (Bisa Uji Coba Langsung)
           - Rak Buku Pilihan Pustakawan
           - Pencarian Cepat Katalog Indeks
           - Undangan Ruang Cerita (CTA)
           ============================================================ */
        <div className="relative bg-[#FFF9EF]">
          {/* Pinned Sticky Hero Section: Stays pinned as user scrolls down */}
          <div className="sticky top-0 h-screen w-full z-0 overflow-hidden">
            <Hero />
          </div>

          {/* Rising Section: Wavy paper edge slides up over the Hero to reveal ParallaxStory */}
          <div className="relative z-10 shadow-2xl">
            <ParallaxStory />
            <SearchBar />
            <CuratedLibraryShelf />
            <CTA />
          </div>
        </div>
      )}
    </>
  );
}
