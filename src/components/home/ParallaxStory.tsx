import React, { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ScanLine,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

// S-curve flight path coordinating alongside the cards (strictly increasing Y, naturally undulating)
const FLIGHT_PATH_D =
  "M 830,30 C 900,160 930,290 890,430 C 850,570 910,710 930,850 C 945,980 910,1120 865,1260 C 825,1380 870,1480 820,1540";

// Micro-wobble & floating aerodynamic styling
const PlaneFloatStyles: React.FC = () => (
  <style>{`
    @keyframes gibryPlaneBob {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-5px);
      }
    }
    @keyframes gibryPlaneSway {
      0%, 100% {
        transform: rotate(0deg);
      }
      25% {
        transform: rotate(-2.5deg);
      }
      75% {
        transform: rotate(2deg);
      }
    }
    @keyframes gibryPlaneShadow {
      0%, 100% {
        filter: drop-shadow(0 6px 10px rgba(32, 56, 48, 0.22));
      }
      50% {
        filter: drop-shadow(0 14px 18px rgba(32, 56, 48, 0.13));
      }
    }
    .gibry-plane-bob {
      animation: gibryPlaneBob 3.6s ease-in-out infinite;
      will-change: transform;
    }
    .gibry-plane-sway {
      animation: gibryPlaneSway 2.8s ease-in-out infinite, gibryPlaneShadow 3.6s ease-in-out infinite;
      will-change: transform, filter;
    }
  `}</style>
);

export const ParallaxStory: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const clipRectRef = useRef<SVGRectElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const bankRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sectionEl = sectionRef.current;
    const bodyEl = bodyRef.current;
    const pathEl = pathRef.current;
    const clipRectEl = clipRectRef.current;
    const planeEl = planeRef.current;
    const bankEl = bankRef.current;

    if (!sectionEl || !bodyEl || !pathEl || !planeEl) return;

    let totalLength = 0;
    try {
      totalLength = pathEl.getTotalLength();
    } catch {
      totalLength = 1600;
    }

    let targetProgress = 0;
    let currentProgress = 0;
    let currentBank = 0;
    let rafId: number | null = null;
    let isRunning = false;

    // Aerodynamic cubic bezier curve for relaxed gliding:
    // Gentle launch, calm sustained cruising, soft touchdown
    const calcAerodynamicProgress = (raw: number): number => {
      const clamped = Math.max(0, Math.min(1, raw));
      return clamped < 0.5
        ? 4 * clamped * clamped * clamped
        : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
    };

    const updateFlight = () => {
      if (!bodyEl || !planeEl || !pathEl) return;

      // Inertia damping (0.055 provides graceful aerodynamic lag & deceleration)
      const diff = targetProgress - currentProgress;
      currentProgress += diff * 0.055;

      const bodyRect = bodyEl.getBoundingClientRect();
      const scaleX = bodyRect.width / 1000;
      const scaleY = bodyRect.height / 1600;

      const currentDist = currentProgress * totalLength;
      const pt = pathEl.getPointAtLength(currentDist);

      // Tangent vector for heading (pitch angle)
      const sampleDelta = 6;
      const ptAhead = pathEl.getPointAtLength(Math.min(totalLength, currentDist + sampleDelta));
      const ptBehind = pathEl.getPointAtLength(Math.max(0, currentDist - sampleDelta));

      const dx = (ptAhead.x - ptBehind.x) * scaleX;
      const dy = (ptAhead.y - ptBehind.y) * scaleY;
      const heading = Math.atan2(dy, dx) * (180 / Math.PI);

      // Curvature detection for banking (roll into curves)
      const ptTurn = pathEl.getPointAtLength(Math.min(totalLength, currentDist + 24));
      const turnDx = (ptTurn.x - pt.x) * scaleX;
      const turnDy = (ptTurn.y - pt.y) * scaleY;
      const turnHeading = Math.atan2(turnDy, turnDx) * (180 / Math.PI);
      const turnRate = turnHeading - heading;
      const targetBank = Math.max(-18, Math.min(18, turnRate * 2.2));

      // Smooth banking inertia
      currentBank += (targetBank - currentBank) * 0.08;

      // Screen coordinates relative to body container
      const posX = pt.x * scaleX;
      const posY = pt.y * scaleY;

      // Natural aerodynamic fade-in during takeoff and fade-out into the horizon at exit
      let opacity = 1;
      let scale = 1;

      if (currentProgress < 0.05) {
        // Takeoff fade-in
        opacity = Math.max(0, currentProgress / 0.05);
        scale = 0.85 + (currentProgress / 0.05) * 0.15;
      } else if (currentProgress > 0.76) {
        // Natural horizon exit: starts fading out smoothly as it reaches the end of the cards
        // Gracefully fades out and scales down into the distance between progress 0.76 and 0.90
        const exitT = Math.max(0, Math.min(1, (currentProgress - 0.76) / 0.14));
        opacity = Math.max(0, (Math.cos(exitT * Math.PI) + 1) / 2);
        scale = 1 - exitT * 0.35; // Gently shrinks from 1.0 to 0.65 as if gliding away
      }

      planeEl.style.opacity = String(opacity);
      planeEl.style.transform = `translate3d(${posX}px, ${posY}px, 0) translate(-50%, -50%) rotate(${heading}deg) scale(${scale})`;

      if (bankEl) {
        bankEl.style.transform = `rotate(${currentBank}deg)`;
      }

      if (clipRectEl) {
        // Reveal trail strictly behind the aircraft nose/tail, capped before bottom border
        const trailCapY = 1420;
        const trailY = Math.min(pt.y + 10, trailCapY);
        clipRectEl.setAttribute("height", String(Math.max(20, trailY)));
      }

      // Continue animation loop while motion hasn't settled
      if (Math.abs(diff) > 0.0002) {
        rafId = requestAnimationFrame(updateFlight);
      } else {
        isRunning = false;
      }
    };

    const handleScroll = () => {
      const secRect = sectionEl.getBoundingClientRect();
      const vh = window.innerHeight;

      // Start gliding gently when the story enters view (top of section reaches 85% of viewport)
      // Travel duration spans comfortably across the entire height of cards
      const scrollStart = vh * 0.85;
      const scrollRange = secRect.height + vh * 0.3;
      const rawProgress = (scrollStart - secRect.top) / scrollRange;

      targetProgress = calcAerodynamicProgress(rawProgress);

      if (!isRunning) {
        isRunning = true;
        rafId = requestAnimationFrame(updateFlight);
      }
    };

    // Initial positioning
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      id="experience"
      ref={sectionRef}
      className="relative z-10 select-none overflow-x-clip"
    >
      <PlaneFloatStyles />

      {/* ── GELOMBANG ORGANIK BERLAPIS (SCULPTED MULTI-LAYER PAPER WAVE) ── */}
      {/* Memiliki kontur jelas, bayangan jatuh, dan garis deckle agar tampak fisik menutupi Hero */}
      <div className="relative w-full leading-none z-30 pointer-events-none -mb-1">
        <svg
          viewBox="0 0 1440 220"
          preserveAspectRatio="none"
          className="w-full h-28 sm:h-36 md:h-48 block drop-shadow-[0_-20px_35px_rgba(32,56,48,0.18)]"
        >
          {/* Back Wave Layer: Deeper organic parchment fold */}
          <path
            d="M 0,220 L 0,120 C 220,35 480,185 780,95 C 1040,15 1280,145 1440,75 L 1440,220 Z"
            fill="#E5DDD0"
            opacity="0.85"
          />
          {/* Front Main Wave Layer with crisp sculpted deckle edge */}
          <path
            d="M 0,220 L 0,90 C 260,165 520,35 820,135 C 1080,210 1310,55 1440,105 L 1440,220 Z"
            fill="#F2ECDF"
            stroke="#D6CEBA"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* ── BODY SECTION DENGAN BACKGROUND #F2ECDF (TERSAMBUNG MULUS KE GELOMBANG) ── */}
      <div
        ref={bodyRef}
        className="relative bg-[#F2ECDF] pt-4 sm:pt-8 pb-28 border-b border-[#DEDDD0]"
      >
        {/* ── SCROLL-DRIVEN FLIGHT TRAIL (SVG LAYER) ── */}
        <svg
          viewBox="0 0 1000 1600"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
        >
          <defs>
            <clipPath id="gliderTrailClip">
              <rect ref={clipRectRef} x="0" y="0" width="1000" height="40" />
            </clipPath>
            <linearGradient id="gliderTrailGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#AD6549" stopOpacity="0.85" />
              <stop offset="84%" stopColor="#AD6549" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#AD6549" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Dynamic Flight Trail: delicate dashed line revealed strictly behind the glider */}
          <path
            ref={pathRef}
            d={FLIGHT_PATH_D}
            fill="none"
            stroke="url(#gliderTrailGrad)"
            strokeWidth="2.4"
            strokeDasharray="6 8"
            strokeLinecap="round"
            clipPath="url(#gliderTrailClip)"
          />
        </svg>

        {/* ── HIGH-PERFORMANCE ORIGAMI GLIDER (HTML/GPU ACCELERATED, 0 REACT RE-RENDERS) ── */}
        <div
          ref={planeRef}
          className="absolute top-0 left-0 pointer-events-none z-20 will-change-transform"
          style={{
            transform: "translate3d(830px, 30px, 0) translate(-50%, -50%) rotate(55deg)",
            opacity: 1,
          }}
        >
          {/* Layer 1: banking (roll into curves) */}
          <div ref={bankRef} className="will-change-transform">
            {/* Layer 2 + 3: ambient air wobble (two different periods) */}
            <div className="gibry-plane-bob">
              <div className="gibry-plane-sway relative w-11 h-9 sm:w-14 sm:h-11 flex items-center justify-center">
                {/* Crisp Origami Paper Airplane with tactile folds & 3D shadow */}
                <svg
                  viewBox="-24 -18 48 36"
                  className="w-11 h-9 sm:w-14 sm:h-11 overflow-visible filter drop-shadow-[0_6px_10px_rgba(32,56,48,0.22)]"
                >
                  {/* Wingtip Vapor Slipstreams */}
                  <line
                    x1="-8"
                    y1="-11"
                    x2="-26"
                    y2="-11"
                    stroke="#AD6549"
                    strokeWidth="1.4"
                    strokeDasharray="2 3"
                    opacity="0.7"
                  />
                  <line
                    x1="-8"
                    y1="11"
                    x2="-26"
                    y2="11"
                    stroke="#AD6549"
                    strokeWidth="1.4"
                    strokeDasharray="2 3"
                    opacity="0.7"
                  />

                  {/* Top Wing Fold (Light cream/ivory catches light) */}
                  <polygon
                    points="20,0 -12,-14 -4,0"
                    fill="#FFFDF9"
                    stroke="#304D42"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />

                  {/* Bottom Wing Fold (Olive-ivory shaded facet) */}
                  <polygon
                    points="20,0 -12,14 -4,0"
                    fill="#E8EDE2"
                    stroke="#304D42"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />

                  {/* Center Fuselage Spine Crease */}
                  <line
                    x1="20"
                    y1="0"
                    x2="-14"
                    y2="0"
                    stroke="#304D42"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />

                  {/* Under-belly Origami Keel Tab */}
                  <polygon
                    points="-4,0 -13,0 -9,6"
                    fill="#C6D3B6"
                    stroke="#304D42"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10 pt-4 sm:pt-6">
          {/* Section Header: Clean, Two Fonts, High Contrast */}
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-sans font-semibold text-[#8E523A] uppercase tracking-wider mb-2.5">
              <span>LAYANAN PERPUSTAKAAN DIGITAL</span>
            </div>

            <h2 className="text-3xl sm:text-5xl md:text-6xl font-editorial text-[#203830] leading-[1.08] tracking-tight">
              Tiga kemudahan baru di perpustakaan sekolahmu.
            </h2>

            <p className="mt-4 text-base sm:text-lg text-[#3E5249] font-sans leading-relaxed">
              Tidak ada lagi kartu pinjam kertas yang terselip atau buku tamu fisik yang kusut. Peminjaman
              buku dan pengisian kunjungan dirancang cepat, mudah, dan transparan.
            </p>
          </div>

          {/* ── FITUR 01: WIDE SHOWCASE DENGAN SCREENSHOT PREVIEW TAMPILAN REAL ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-16 pb-16 border-b border-[#DEDDD0]">
            {/* Narrative Column */}
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-semibold text-[#8E523A] uppercase tracking-wider font-sans">
                Alur Peminjaman Cepat
              </span>
              <h3 className="text-2xl sm:text-4xl font-editorial text-[#203830] leading-snug">
                Ambil di rak, scan barcode, beres.
              </h3>
              <p className="text-base text-[#3E5249] font-sans leading-relaxed">
                Lupakan kartu pinjam kuning yang mudah hilang di saku. Siswa cukup mengarahkan kamera ponsel ke barcode
                di sampul buku atau di meja sirkulasi. Riwayat peminjaman langsung masuk ke akun siswa dalam hitungan detik.
              </p>

              <div className="pt-2 space-y-2 text-sm text-[#304D42] font-sans">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#E8EBDF] text-[#304D42] flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <span>Tenggat waktu pinjam 14 hari dengan pengingat otomatis sebelum jatuh tempo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#E8EBDF] text-[#304D42] flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <span>Stok rak fisik buku dan modul kejuruan tersinkronisasi real-time</span>
                </div>
              </div>
            </div>

            {/* Real UI Preview Screenshot Window (Bukan Uji Coba Mainan) */}
            <div className="lg:col-span-6">
              <div className="bg-[#FFFDF9] border border-[#DEDDD0] rounded-2xl shadow-sm overflow-hidden">
                {/* Browser / Device Header Bar */}
                <div className="bg-[#E8EBDF] px-4 py-2.5 border-b border-[#DEDDD0] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#DEDDD0]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#DEDDD0]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#DEDDD0]" />
                  </div>
                  <div className="bg-[#FFFDF9] px-3 py-1 rounded-md text-[11px] font-sans text-[#5A6C63] flex items-center gap-1.5 border border-[#DEDDD0]">
                    <ScanLine size={12} className="text-[#8E523A]" />
                    <span>digipus.sch.id/scan</span>
                  </div>
                  <span className="text-[10px] font-sans text-[#5A6C63] font-medium">Kamera Aktif</span>
                </div>

                {/* Real Screen Content Mockup */}
                <div className="p-6 space-y-4">
                  {/* Viewfinder Scanner Area */}
                  <div className="bg-[#203830] rounded-xl p-6 text-center text-[#FFFDF9] relative overflow-hidden">
                    <div className="absolute inset-4 border-2 border-dashed border-[#DCE2CD]/40 rounded-lg pointer-events-none" />
                    <ScanLine size={32} className="mx-auto text-[#DCE2CD] mb-2 opacity-80" />
                    <p className="text-xs font-sans text-[#DCE2CD]">Arahkan kamera ke barcode buku</p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-sans font-medium">
                      Barcode Terdeteksi: 978-602-244-884-6
                    </span>
                  </div>

                  {/* Detected Book Card Preview */}
                  <div className="bg-[#FAF7F0] border border-[#DEDDD0] rounded-xl p-4 flex items-center gap-4">
                    <img
                      src="/covers/jaringankomputer.jpg"
                      alt="Sampul Buku"
                      className="w-14 h-20 object-cover rounded-lg border border-[#DEDDD0] shrink-0 shadow-2xs"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs text-[#5A6C63] font-sans">
                        <span>MODUL KEJURUAN</span>
                        <span className="bg-[#E8EBDF] px-2 py-0.5 rounded text-[#203830] font-medium">RAK RPL-01</span>
                      </div>
                      <h5 className="font-editorial text-base font-bold text-[#203830] mt-0.5 truncate">
                        Dasar Rekayasa Perangkat Lunak
                      </h5>
                      <p className="text-xs text-[#5A6C63] font-sans mt-0.5">Kemendikbudristek (2022)</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          <CheckCircle2 size={12} />
                          <span>Tersedia • 14 Hari Pinjam</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* App Bottom Confirmation Action */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-sans text-[#5A6C63]">Tenggat otomatis: 14 hari kerja</span>
                    <div className="px-4 py-2 rounded-xl bg-[#203830] text-[#FFFDF9] text-xs font-sans font-semibold">
                      Pinjam Buku Ini
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── FITUR 02 & 03: BALANCED GRID DENGAN REAL UI PREVIEWS ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* FITUR 02: BUKU TAMU DIGITAL (PRESENSI MANDIRI) */}
            <div className="bg-[#FFFDF9] border border-[#DEDDD0] rounded-2xl p-7 sm:p-8 flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-[#8E523A] uppercase tracking-wider block mb-1 font-sans">
                  Presensi Pengunjung
                </span>
                <h3 className="text-2xl sm:text-3xl font-editorial text-[#203830] leading-snug">
                  Buku Tamu Digital Tanpa Antrean
                </h3>
                <p className="mt-2.5 text-sm text-[#4A5D54] font-sans leading-relaxed">
                  Cukup satu kali tap saat memasuki ruang perpustakaan. Waktu kunjungan otomatis tersimpan di profil siswa
                  dan langsung terhubung dengan laporan akreditasi sekolah secara otomatis.
                </p>
              </div>

              {/* Real UI Preview Window for Attendance */}
              <div className="mt-6 pt-5 border-t border-[#DEDDD0]">
                <div className="bg-[#FAF7F0] border border-[#DEDDD0] rounded-xl overflow-hidden">
                  {/* Header Screen Bar */}
                  <div className="bg-[#E8EBDF] px-3.5 py-2 border-b border-[#DEDDD0] flex items-center justify-between text-xs text-[#5A6C63] font-sans">
                    <span className="font-semibold text-[#203830]">digipus.sch.id/attendance</span>
                    <span className="text-[10px] text-emerald-800 font-medium">Sesi Aktif</span>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#203830] text-[#FFFDF9] font-editorial font-bold text-sm flex items-center justify-center">
                        AD
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-[#203830] font-sans">Ahmad Darrell</h5>
                        <p className="text-xs text-[#5A6C63] font-sans">Kelas XII Rekayasa Perangkat Lunak 1</p>
                      </div>
                    </div>

                    <div className="bg-white border border-[#DEDDD0] rounded-lg p-3 text-xs font-sans space-y-1.5">
                      <div className="flex justify-between text-[#3E5249]">
                        <span>Lokasi Presensi:</span>
                        <span className="font-medium text-[#203830]">Ruang Baca Utama</span>
                      </div>
                      <div className="flex justify-between text-[#3E5249]">
                        <span>Waktu Masuk:</span>
                        <span className="font-bold text-[#203830]">10:15 WIB (Istirahat 1)</span>
                      </div>
                      <div className="flex justify-between text-[#3E5249]">
                        <span>Status:</span>
                        <span className="font-semibold text-emerald-800">Hadir Terverifikasi ✓</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] font-sans text-[#5A6C63]">
                      <span>Rekap bulanan: 12 kunjungan</span>
                      <span className="text-[#8E523A] font-medium">Sinkron ke Buku Tamu</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FITUR 03: CEK KETERSEDIAAN KATALOG & RAK REAL-TIME */}
            <div className="bg-[#FFFDF9] border border-[#DEDDD0] rounded-2xl p-7 sm:p-8 flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-[#8E523A] uppercase tracking-wider block mb-1 font-sans">
                  Katalog & Ketersediaan Rak
                </span>
                <h3 className="text-2xl sm:text-3xl font-editorial text-[#203830] leading-snug">
                  Cek Ketersediaan Buku dari Mana Saja
                </h3>
                <p className="mt-2.5 text-sm text-[#4A5D54] font-sans leading-relaxed">
                  Tidak perlu bolak-balik mencari ke rak jika buku sedang dipinjam rekan lain. Cek nomor rak, kategori
                  kejuruan, dan status ketersediaan langsung di ponselmu sebelum ke perpustakaan.
                </p>
              </div>

              {/* Real UI Preview Window for Catalog Shelf */}
              <div className="mt-6 pt-5 border-t border-[#DEDDD0]">
                <div className="bg-[#FAF7F0] border border-[#DEDDD0] rounded-xl overflow-hidden">
                  {/* Header Screen Bar */}
                  <div className="bg-[#E8EBDF] px-3.5 py-2 border-b border-[#DEDDD0] flex items-center justify-between text-xs text-[#5A6C63] font-sans">
                    <span className="font-semibold text-[#203830]">digipus.sch.id/books</span>
                    <Link
                      to="/books"
                      className="text-[11px] text-[#8E523A] font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>Buka Katalog</span>
                      <ArrowRight size={11} />
                    </Link>
                  </div>

                  <div className="p-4 space-y-2.5">
                    {[
                      {
                        title: "Bumi Manusia",
                        author: "Pramoedya Ananta Toer",
                        shelf: "Rak Sastra B-02",
                        status: "Tersedia (3 Eks)",
                        avail: true,
                      },
                      {
                        title: "Filosofi Teras",
                        author: "Henry Manampiring",
                        shelf: "Rak Pengembangan D-01",
                        status: "Dipinjam (Kembali 18 Okt)",
                        avail: false,
                      },
                    ].map((b, i) => (
                      <div
                        key={i}
                        className="bg-white border border-[#DEDDD0] rounded-lg p-2.5 flex items-center justify-between text-xs font-sans"
                      >
                        <div className="min-w-0 pr-2">
                          <h6 className="font-bold text-[#203830] truncate">{b.title}</h6>
                          <p className="text-[11px] text-[#5A6C63]">{b.author} • {b.shelf}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                            b.avail
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                    ))}

                    <div className="pt-1 flex items-center justify-between text-[11px] font-sans text-[#5A6C63]">
                      <span>Total 1.400+ modul & literasi</span>
                      <span className="text-[#203830] font-medium">Stok Terkini Real-time</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ParallaxStory;
