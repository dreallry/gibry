import React from "react";
import { motion } from "motion/react";
import { Users, BookOpen, MessageSquare, Sparkles, Plus, ArrowUpRight, Award, Heart } from "lucide-react";

// --- Custom Hand-Drawn / Vintage Accents ---

const ArrowDoodle = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 100 60" className={`text-[#a67c52] stroke-current fill-none overflow-visible ${className}`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10,50 Q 40,10 85,30" />
    <path d="M70,18 L85,30 L72,42" />
  </svg>
);

const CircularStamp = ({ onClick }: { onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className="relative w-24 h-24 sm:w-28 sm:h-28 bg-[#ece5d8] text-[#4a3f35] rounded-full flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer border border-[#dbd0ba] group"
  >
    <div className="absolute inset-1 animate-[spin_14s_linear_infinite]">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path id="circlePath" d="M 50, 50 m -36, 0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" fill="none" />
        <text className="text-[10.5px] font-bold tracking-[0.2em] uppercase" fill="#7d6b56">
          <textPath href="#circlePath" startOffset="0%">
            GIBRY • BACA BARENG • DISKUSI SERU • 
          </textPath>
        </text>
      </svg>
    </div>
    <div className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform">
      <div className="w-9 h-9 rounded-full bg-[#a67c52] text-white flex items-center justify-center shadow-xs">
        <Sparkles className="w-4 h-4" />
      </div>
    </div>
  </div>
);

export interface BookClubHeroProps {
  onJoinClick?: () => void;
  onCreateClick?: () => void;
  popularClub?: {
    id?: string;
    name: string;
    description: string;
    memberCount?: number;
  } | null;
}

export const Component = ({ onJoinClick, onCreateClick, popularClub }: BookClubHeroProps) => {
  const displayTitle = popularClub?.name || "Klub Novel Klasik & Sastra";
  const displayDesc = popularClub?.description || "Wadah diskusi novel fiksi sastra terbaik dari para penulis legendaris Indonesia dan dunia.";
  const displayCount = popularClub?.memberCount ?? 28;

  return (
    <div className="relative w-full mb-12">
      {/* Outer Banner Card */}
      <div 
        className="rounded-[2.5rem] p-6 sm:p-10 lg:p-12 relative overflow-hidden border transition-all"
        style={{ 
          background: "linear-gradient(135deg, var(--color-card) 0%, #f7f3ea 100%)", 
          borderColor: "var(--color-border)",
          boxShadow: "0 10px 30px rgba(74, 63, 53, 0.05)"
        }}
      >
        {/* Requested Garis Kotak-Kotak (Grid Background) */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20 z-0"
          style={{
            backgroundImage: "linear-gradient(var(--color-border) 1.5px, transparent 1.5px), linear-gradient(90deg, var(--color-border) 1.5px, transparent 1.5px)",
            backgroundSize: "3.5rem 3.5rem"
          }}
        ></div>

        {/* Decorative Warm Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#a67c52]/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#8d6e4c]/10 blur-3xl pointer-events-none"></div>

        {/* Floating Scrap Asset Artwork */}
        <img
          src="/assetsscrap/computer.png"
          alt=""
          className="absolute -right-6 top-10 w-36 opacity-30 pointer-events-none rotate-12 hidden lg:block hover:scale-105 transition-transform"
        />
        <img
          src="/assetsscrap/coffeecup.png"
          alt=""
          className="absolute left-1/2 bottom-2 w-20 opacity-25 pointer-events-none -rotate-12 hidden md:block"
        />
        <img
          src="/assetsscrap/2bd9d77f319d1e5fee827f50517ee04f-removebg-preview.png"
          alt=""
          className="absolute left-6 -top-4 w-20 opacity-20 pointer-events-none rotate-6"
        />

        {/* Content Header Grid */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Heading & Info */}
          <div className="lg:col-span-7 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[#dbd0ba]" style={{ background: "var(--color-muted)", color: "var(--color-primary)" }}>
              <img src="/assetsscrap/coffeecup.png" alt="" className="w-4 h-4 object-contain" />
              <span>Komunitas & Klub Baca</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15]" style={{ color: "var(--color-foreground)" }}>
              Temukan Teman Baca & <br className="hidden sm:inline" />
              <span className="italic font-serif" style={{ color: "var(--color-primary)" }}>Diskusi Seru</span> di Book Clubs
            </h1>

            <p className="text-sm sm:text-base max-w-xl leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
              Wadah interaktif bagi pencinta buku. Bagikan sudut pandang, selesaikan tantangan membaca bersama, dan raih badge keanggotaan spesial.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onCreateClick}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white shadow-sm transition-all hover:scale-105 hover:shadow-md"
                style={{ background: "var(--color-primary)" }}
              >
                <Plus className="w-4 h-4" />
                Buat Club Baru
              </button>

              <button
                onClick={onJoinClick}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold border transition-all hover:bg-black/5"
                style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
              >
                <span>Jelajahi Klub</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Playful Visual Cards Stack */}
          <div className="lg:col-span-5 relative flex justify-center lg:justify-end mt-4 lg:mt-0">
            <div className="relative w-full max-w-sm sm:max-w-md h-72 sm:h-80 flex items-center justify-center">
              
              {/* Floating Card 1: Dynamic Realtime Most Popular Club */}
              <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-2 left-2 sm:left-4 z-20 w-56 sm:w-64 p-4 rounded-2xl border shadow-md rotate-[-4deg] transition-transform hover:rotate-0"
                style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: "rgba(166,124,82,0.12)", color: "var(--color-primary)" }}>
                    Populer
                  </span>
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                </div>
                <h4 className="text-sm font-bold truncate" style={{ color: "var(--color-foreground)" }}>{displayTitle}</h4>
                <p className="text-[11px] mt-1 line-clamp-2" style={{ color: "var(--color-muted-foreground)" }}>
                  {displayDesc}
                </p>
                <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex -space-x-2">
                    {["Felix", "Sophia", "Oliver"].map((seed, idx) => (
                      <img key={idx} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayTitle.slice(0, 3) + seed}`} alt="" className="w-6 h-6 rounded-full border border-white bg-amber-100" />
                    ))}
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: "var(--color-muted-foreground)" }}>
                    {displayCount} Anggota
                  </span>
                </div>
              </motion.div>

              {/* Floating Card 2: Activity Streak */}
              <motion.div 
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-4 right-2 sm:right-4 z-30 w-52 sm:w-60 p-4 rounded-2xl border shadow-md rotate-[5deg] transition-transform hover:rotate-0"
                style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-muted)", color: "var(--color-primary)" }}>
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: "var(--color-foreground)" }}>Diskusi Pekanan</p>
                    <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>+150 Poin Komunitas</p>
                  </div>
                </div>
              </motion.div>

              {/* Decorative Stamp */}
              <div className="absolute -top-4 right-0 z-40">
                <CircularStamp onClick={onJoinClick} />
              </div>

              {/* Doodle Arrow Accent */}
              <ArrowDoodle className="absolute bottom-0 left-8 w-20 h-12 hidden sm:block opacity-60" />

            </div>
          </div>

        </div>

        {/* Bottom Feature Grid (3 Warm Benefit Pillars) */}
        <div className="mt-10 pt-8 border-t grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10" style={{ borderColor: "var(--color-border)" }}>
          
          <div className="flex items-start gap-4 p-4 rounded-2xl transition-colors hover:bg-black/[0.02]">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-[#dbd0ba]" style={{ background: "var(--color-muted)", color: "var(--color-primary)" }}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>Diskusi Tematik</h3>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
                Ruang obrolan interaktif untuk bedah bab, ulasan, dan tukar opini.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-2xl transition-colors hover:bg-black/[0.02]">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-[#dbd0ba]" style={{ background: "var(--color-muted)", color: "var(--color-primary)" }}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>Badge & Prestasi</h3>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
                Kumpulkan poin keaktifan dan buka lencana profil eksklusif.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-2xl transition-colors hover:bg-black/[0.02]">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-[#dbd0ba]" style={{ background: "var(--color-muted)", color: "var(--color-primary)" }}>
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>Bebas Buat Klub</h3>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
                Buat klub baca dengan genre atau topik khusus sesuai minat Anda.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Component;
