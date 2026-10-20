"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen01Icon,
  LibraryIcon,
  Calendar03Icon,
  CheckmarkCircle01Icon,
  StarIcon,
  Award01Icon,
  BarChartIcon,
  MapPinIcon,
  CustomerService01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";

const FEATURES = [
  {
    id: "digital",
    label: "Koleksi Digital",
    icon: BookOpen01Icon,
    image:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1200",
    description: "Akses ribuan buku digital kapan saja dan di mana saja.",
  },
  {
    id: "physical",
    label: "Peminjaman Fisik",
    icon: LibraryIcon,
    image:
      "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=1200",
    description: "Pinjam buku fisik langsung dari perpustakaan kami.",
  },
  {
    id: "booking",
    label: "Booking Online",
    icon: Calendar03Icon,
    image:
      "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1200",
    description: "Reservasi buku sebelum datang ke perpustakaan.",
  },
  {
    id: "attendance",
    label: "Presensi Cepat",
    icon: CheckmarkCircle01Icon,
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1200",
    description: "Catat kehadiran secara online tanpa antre.",
  },
  {
    id: "reviews",
    label: "Ulasan Buku",
    icon: StarIcon,
    image:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1200",
    description: "Baca dan tulis ulasan untuk buku favorit Anda.",
  },
  {
    id: "achievements",
    label: "Pencapaian",
    icon: Award01Icon,
    image:
      "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?q=80&w=1200",
    description: "Raih badge dan penghargaan dari kegiatan membaca.",
  },
  {
    id: "stats",
    label: "Statistik Baca",
    icon: BarChartIcon,
    image:
      "https://images.unsplash.com/photo-1551288049-bbda38a10ad5?q=80&w=1200",
    description: "Pantau perkembangan membaca Anda secara visual.",
  },
  {
    id: "location",
    label: "Lokasi Perpustakaan",
    icon: MapPinIcon,
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200",
    description: "Temukan lokasi perpustakaan dengan peta interaktif.",
  },
  {
    id: "help",
    label: "Bantuan Mudah",
    icon: CustomerService01Icon,
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200",
    description: "Dapatkan bantuan kapan saja melalui pusat bantuan.",
  },
];

const AUTO_PLAY_INTERVAL = 3500;
const ITEM_HEIGHT = 65;

const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

export function FeatureCarousel() {
  const [step, setStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentIndex =
    ((step % FEATURES.length) + FEATURES.length) % FEATURES.length;

  const nextStep = useCallback(() => {
    setStep((prev) => prev + 1);
  }, []);

  const handleChipClick = (index: number) => {
    const diff = (index - currentIndex + FEATURES.length) % FEATURES.length;
    if (diff > 0) setStep((s) => s + diff);
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextStep, AUTO_PLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [nextStep, isPaused]);

  const getCardStatus = (index: number) => {
    const diff = index - currentIndex;
    const len = FEATURES.length;

    let normalizedDiff = diff;
    if (diff > len / 2) normalizedDiff -= len;
    if (diff < -len / 2) normalizedDiff += len;

    if (normalizedDiff === 0) return "active";
    if (normalizedDiff === -1) return "prev";
    if (normalizedDiff === 1) return "next";
    return "hidden";
  };

  return (
    <div className="w-full max-w-7xl mx-auto md:p-8">
      <div className="relative overflow-hidden rounded-[2.5rem] lg:rounded-[3rem] flex flex-col lg:flex-row min-h-[550px] lg:aspect-[16/9] border border-border/40">
        {/* Left panel - feature list */}
        <div
          className="w-full lg:w-[40%] min-h-[320px] md:min-h-[420px] lg:h-full relative z-30 flex flex-col items-start justify-center overflow-hidden px-6 md:px-12 lg:pl-14"
          style={{ background: "linear-gradient(135deg, #a67c52 0%, #8d6e4c 100%)" }}
        >
          <div className="absolute inset-x-0 top-0 h-12 md:h-16 lg:h-14 bg-gradient-to-b from-[#a67c52] via-[#a67c52]/80 to-transparent z-40" />
          <div className="absolute inset-x-0 bottom-0 h-12 md:h-16 lg:h-14 bg-gradient-to-t from-[#8d6e4c] via-[#a67c52]/80 to-transparent z-40" />
          <div className="relative w-full h-full flex items-center justify-center lg:justify-start z-20">
            {FEATURES.map((feature, index) => {
              const distance = index - currentIndex;
              const wrappedDistance = wrap(
                -(FEATURES.length / 2),
                FEATURES.length / 2,
                distance
              );

              return (
                <motion.div
                  key={feature.id}
                  style={{
                    height: ITEM_HEIGHT,
                    width: "fit-content",
                  }}
                  animate={{
                    y: wrappedDistance * ITEM_HEIGHT,
                    opacity: 1 - Math.abs(wrappedDistance) * 0.25,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 90,
                    damping: 22,
                    mass: 1,
                  }}
                  className="absolute flex items-center justify-start"
                >
                  <button
                    onClick={() => handleChipClick(index)}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    className={cn(
                      "relative flex items-center gap-3 px-5 md:px-8 lg:px-7 py-3 md:py-4 lg:py-3.5 rounded-full transition-all duration-700 text-left group border",
                      index === currentIndex
                        ? "bg-white text-[#a67c52] border-white z-10 shadow-lg"
                        : "bg-transparent text-white/60 border-white/20 hover:border-white/40 hover:text-white"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center transition-colors duration-500",
                        index === currentIndex ? "text-[#a67c52]" : "text-white/40"
                      )}
                    >
                      <HugeiconsIcon
                        icon={feature.icon}
                        size={18}
                        strokeWidth={2}
                      />
                    </div>

                    <span className="font-normal text-xs md:text-sm tracking-tight whitespace-nowrap uppercase">
                      {feature.label}
                    </span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right panel - image cards */}
        <div className="flex-1 min-h-[450px] md:min-h-[550px] lg:h-full relative flex items-center justify-center py-14 md:py-20 lg:py-14 px-6 md:px-10 lg:px-10 overflow-hidden border-t lg:border-t-0 lg:border-l border-border/20" style={{ background: "var(--color-muted)" }}>
          <div className="relative w-full max-w-[380px] aspect-[4/5] flex items-center justify-center">
            {FEATURES.map((feature, index) => {
              const status = getCardStatus(index);
              const isActive = status === "active";
              const isPrev = status === "prev";
              const isNext = status === "next";

              return (
                <motion.div
                  key={feature.id}
                  initial={false}
                  animate={{
                    x: isActive ? 0 : isPrev ? -100 : isNext ? 100 : 0,
                    scale: isActive ? 1 : isPrev || isNext ? 0.85 : 0.7,
                    opacity: isActive ? 1 : isPrev || isNext ? 0.4 : 0,
                    rotate: isPrev ? -3 : isNext ? 3 : 0,
                    zIndex: isActive ? 20 : isPrev || isNext ? 10 : 0,
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 25,
                    mass: 0.8,
                  }}
                  className="absolute inset-0 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-4 md:border-8 border-background bg-background origin-center"
                >
                  <img
                    src={feature.image}
                    alt={feature.label}
                    className={cn(
                      "w-full h-full object-cover transition-all duration-700",
                      isActive
                        ? "grayscale-0 blur-0"
                        : "grayscale blur-[2px] brightness-75"
                    )}
                  />

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute inset-x-0 bottom-0 p-8 pt-28 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end pointer-events-none"
                      >
                        <div
                          className="text-white px-3 py-1 rounded-full text-[11px] font-normal uppercase tracking-[0.15em] w-fit mb-3 border border-white/20"
                          style={{ background: "rgba(166, 124, 82, 0.8)" }}
                        >
                          {index + 1} &bull; {feature.label}
                        </div>
                        <p className="text-white font-normal text-lg md:text-xl leading-tight drop-shadow-md">
                          {feature.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div
                    className={cn(
                      "absolute top-6 left-6 flex items-center gap-2 transition-opacity duration-300",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  >
                    <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_white]" />
                    <span className="text-white/80 text-[10px] font-normal uppercase tracking-[0.25em] font-mono">
                      Live Session
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureCarousel;
