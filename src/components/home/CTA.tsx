import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function CTA() {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden bg-[#304D42] text-[#FFF9EF] pt-20 sm:pt-28 pb-12 sm:pb-16 px-6 sm:px-10">
      {/* Torn Paper Top Transition from Sage Ivory (#E8EBDF) above */}
      <div className="absolute top-0 left-0 right-0 w-full overflow-hidden leading-none z-20 pointer-events-none">
        <svg
          viewBox="0 0 1200 24"
          preserveAspectRatio="none"
          className="w-full h-5 text-[#E8EBDF] fill-current block"
        >
          <path d="M0,0 L1200,0 L1200,12 Q1170,1 1140,8 Q1110,21 1080,14 Q1050,2 1020,11 Q990,22 960,15 Q930,3 900,12 Q870,23 840,15 Q810,1 780,10 Q750,22 720,16 Q690,4 660,12 Q630,23 600,15 Q570,1 540,8 Q510,21 480,14 Q450,2 420,11 Q390,22 360,16 Q330,3 300,10 Q270,23 240,15 Q210,0 180,9 Q150,22 120,14 Q90,3 60,11 Q30,19 0,12 Z" />
        </svg>
      </div>

      {/* Delicate Curved Accent Lines (Aksen Garis Lengkung Organik) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <svg
          viewBox="0 0 1440 560"
          fill="none"
          preserveAspectRatio="none"
          className="w-full h-full opacity-70"
        >
          {/* Sweeping Right Arc Set (Behind Subtitle & Button) */}
          <path
            d="M 680,-40 C 860,110 1140,240 1480,480"
            stroke="#FFF9EF"
            strokeWidth="1.2"
            opacity="0.12"
          />
          <path
            d="M 780,-40 C 960,120 1220,260 1540,540"
            stroke="#DCE2CD"
            strokeWidth="1"
            strokeDasharray="5 7"
            opacity="0.16"
          />
          <path
            d="M 880,-40 C 1040,110 1300,240 1600,480"
            stroke="#AD6549"
            strokeWidth="1.2"
            opacity="0.25"
          />

          {/* Undulating Center / Bottom Contour Waves */}
          <path
            d="M -100,320 C 260,200 520,440 880,310 C 1140,210 1380,310 1600,250"
            stroke="#FFF9EF"
            strokeWidth="1"
            opacity="0.09"
          />
          <path
            d="M -100,400 C 280,270 560,500 920,380 C 1180,280 1420,380 1600,320"
            stroke="#DCE2CD"
            strokeWidth="1"
            strokeDasharray="6 8"
            opacity="0.14"
          />

          {/* Gentle Left Accent Arc (Behind Display Headline) */}
          <path
            d="M -60,160 C 140,140 320,280 440,480"
            stroke="#FFF9EF"
            strokeWidth="1"
            opacity="0.08"
          />
          <path
            d="M -60,220 C 160,200 360,340 480,540"
            stroke="#AD6549"
            strokeWidth="1"
            strokeDasharray="4 6"
            opacity="0.18"
          />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left Column: Bold Display Headline */}
          <div className="lg:col-span-7">
            <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-editorial leading-[1.05] tracking-tight text-[#FFF9EF]">
              Tak perlu buru-
              <br />
              buru.
              <br />
              Cukup mulai.
            </h2>
          </div>

          {/* Right Column: Thoughtful Subtitle & Tactile Pill CTA Button */}
          <div className="lg:col-span-5 flex flex-col items-start lg:items-start justify-center space-y-7">
            <p className="text-xl sm:text-2xl font-editorial leading-relaxed text-[#FFF9EF]/90 max-w-md">
              Lima menit. Satu halaman.
              <br />
              Sebuah kebiasaan yang bisa membawamu ke mana saja.
            </p>

            <div>
              <Link
                to={user ? "/books" : "/login"}
                className="inline-flex items-center justify-between sm:justify-center gap-3 px-8 py-4 rounded-full bg-[#F2ECDF] hover:bg-[#FFF9EF] text-[#304D42] text-sm sm:text-base font-semibold font-space transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] group cursor-pointer"
              >
                <span>Buat ruang untuk ceritamu</span>
                <ArrowUpRight
                  size={18}
                  className="text-[#304D42] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
