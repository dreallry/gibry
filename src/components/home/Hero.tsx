import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { BookOpen, ChevronDown } from "lucide-react";

const rotatingWords = [
  "Membuka Pikiran",
  "Menginspirasi",
  "Memantik Karya",
  "Menemani Belajar",
];

// Interactive playful letter tile data for G I B R Y
const GIBRY_TILES = [
  { letter: "G", rotate: -3, hoverColor: "hover:bg-[#304D42] hover:text-[#FFF9EF] hover:border-[#304D42]" },
  { letter: "I", rotate: 2, hoverColor: "hover:bg-[#AD6549] hover:text-[#FFF9EF] hover:border-[#AD6549]" },
  { letter: "B", rotate: -2, hoverColor: "hover:bg-[#304D42] hover:text-[#FFF9EF] hover:border-[#304D42]" },
  { letter: "R", rotate: 2.5, hoverColor: "hover:bg-[#AD6549] hover:text-[#FFF9EF] hover:border-[#AD6549]" },
  { letter: "Y", rotate: -1.5, hoverColor: "hover:bg-[#304D42] hover:text-[#FFF9EF] hover:border-[#304D42]" },
];

export default function Hero() {
  const [wordIndex, setWordIndex] = useState(0);
  const { scrollY } = useScroll();

  // Hero stays pinned and clearly visible while ParallaxStory's organic wave rolls up over it
  const heroScale = useTransform(scrollY, [0, 800], [1, 0.96]);
  // Keeps opacity high as the wave physically rolls across Hero; only fades at the very end when completely covered
  const heroOpacity = useTransform(scrollY, [0, 650, 1000], [1, 0.9, 0]);
  const heroDisplay = useTransform(scrollY, (v) => (v >= 1050 ? "none" : "flex"));
  const heroPointerEvents = useTransform(scrollY, (v) => (v > 400 ? "none" : "auto"));

  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.section
      style={{ opacity: heroOpacity, display: heroDisplay, pointerEvents: heroPointerEvents }}
      className="relative h-screen flex flex-col justify-between pt-20 sm:pt-24 pb-4 bg-[#FFF9EF] overflow-hidden select-none"
    >
      {/* Subtle Warm Paper Texture & Atmospheric Ambient */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[44rem] h-[32rem] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #E8EBDF 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-24 w-[28rem] h-[28rem] rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #DCE2CD 0%, transparent 70%)" }}
        />
      </div>

      <motion.div
        style={{ scale: heroScale }}
        className="max-w-5xl mx-auto px-6 relative z-10 flex-1 flex flex-col justify-center items-center text-center my-auto pt-4 pb-8"
      >
        {/* Interactive Playful Letter Tiles (G I B R Y - Bouncing & Color Flip on Hover) */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className="flex items-center gap-1.5 sm:gap-2.5 bg-[#F2ECDF]/80 p-1.5 sm:p-2 rounded-2xl border border-[#DEDDD0] shadow-2xs"
            title="GIBRY - Gerakan Inovasi Baca & Ruang Yayasan"
          >
            {GIBRY_TILES.map((tile) => (
              <motion.div
                key={tile.letter}
                initial={{ rotate: tile.rotate }}
                whileHover={{
                  y: -12,
                  scale: 1.18,
                  rotate: [tile.rotate, tile.rotate > 0 ? -5 : 5, tile.rotate],
                  transition: { type: "spring", stiffness: 450, damping: 14 },
                }}
                whileTap={{ scale: 0.9, y: 2 }}
                className={`w-9 h-10 sm:w-11 sm:h-12 rounded-xl bg-[#FFF9EF] ${tile.hoverColor} border border-[#DEDDD0] shadow-xs hover:shadow-lg flex items-center justify-center cursor-pointer transition-colors duration-200 select-none group`}
              >
                <span className="font-editorial font-bold text-lg sm:text-2xl text-[#304D42] group-hover:text-[#FFF9EF] leading-none transition-transform duration-200 group-hover:scale-110">
                  {tile.letter}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Main Headline: Editorial Typography with Expressive Animated Underline */}
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[84px] font-editorial tracking-tight text-[#304D42] leading-[1.08]">
            <span className="block">Perpustakaan yang</span>
            <span className="relative inline-block mt-1 sm:mt-2">
              <AnimatePresence mode="wait">
                <motion.span
                  key={rotatingWords[wordIndex]}
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  transition={{
                    y: { type: "spring", stiffness: 220, damping: 22 },
                    opacity: { duration: 0.18 },
                  }}
                  className="relative inline-block text-[#AD6549] italic font-normal px-2 sm:px-3 pb-2 sm:pb-3"
                >
                  {rotatingWords[wordIndex]}

                  {/* Expressive Editorial Animated Underline Strip */}
                  <svg
                    className="absolute bottom-0 left-0 w-full h-3 sm:h-4 pointer-events-none text-[#AD6549] overflow-visible"
                    viewBox="0 0 320 18"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <motion.path
                      d="M 3,11 C 80,5 180,14 317,8"
                      stroke="currentColor"
                      strokeWidth="3.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.95 }}
                      transition={{
                        pathLength: { duration: 0.5, ease: [0.25, 1, 0.5, 1], delay: 0.1 },
                        opacity: { duration: 0.15 },
                      }}
                    />
                  </svg>
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          {/* Subtitle: Gray Olive secondary text */}
          <p className="mt-7 text-base sm:text-lg md:text-xl text-[#797D6E] max-w-xl mx-auto font-space leading-relaxed font-normal">
            Koleksi buku fisik dan literasi digital dalam satu ruang baca yang hangat, nyaman, dan terorganisir.
          </p>
        </div>

        {/* Clear Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
          <a
            href="#experience"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#304D42] hover:bg-[#233B32] text-[#FFF9EF] text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md w-full sm:w-auto group cursor-pointer"
          >
            <span>Jelajahi Koleksi</span>
            <span className="group-hover:translate-y-0.5 transition-transform">↓</span>
          </a>

          <Link
            to="/books"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#F2ECDF] hover:bg-[#E8EBDF] text-[#304D42] border border-[#DEDDD0] text-sm font-medium transition-colors w-full sm:w-auto shadow-2xs"
          >
            <BookOpen size={15} className="text-[#AD6549]" />
            <span>Katalog Buku</span>
          </Link>
        </div>

      </motion.div>

      {/* Downward Scroll Indicator */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-1 text-[#797D6E] mb-4 select-none pointer-events-none">
        <span className="text-[9px] font-mono tracking-widest uppercase opacity-75">
          GULIR KE BAWAH
        </span>
        <motion.div
          animate={{ y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <ChevronDown size={14} className="opacity-60 text-[#797D6E]" />
        </motion.div>
      </div>

    </motion.section>
  );
}
