"use client";

import React from "react";
import { LazyMotion, domAnimation, m } from "motion/react";
import { LucideIcon } from "lucide-react";

export type ColorTheme = "orange" | "blue" | "purple" | "emerald" | "amber";

export interface CardProps {
  number: string;
  title: string;
  description: string;
  colorTheme?: ColorTheme;
  className?: string;
  rotate?: string;
  icon?: LucideIcon;
  colors?: {
    bg: string;
    text: string;
    border: string;
  };
}

const NotepadBinding = () => (
  <div className="flex items-center justify-around px-4 -mt-3.5 mb-2 z-20 relative pointer-events-none">
    {[0, 1, 2, 3, 4].map((i) => (
      <div key={i} className="flex flex-col items-center">
        {/* Metallic Spiral Ring */}
        <div className="w-3 h-5.5 rounded-full bg-gradient-to-r from-neutral-400 via-neutral-100 to-neutral-500 border border-neutral-800 shadow-xs z-20 -mb-1.5" />
        {/* Punch Hole */}
        <div className="w-2 h-2 rounded-full bg-neutral-900/60 z-10" />
      </div>
    ))}
  </div>
);

const Card = ({
  number,
  title,
  description,
  colorTheme = "blue",
  className = "",
  rotate = "",
  icon: Icon,
  colors: customColors,
}: CardProps) => {
  const defaultBgColors: Record<ColorTheme, string> = {
    orange: "bg-amber-100/80",
    blue: "bg-sky-100/80",
    purple: "bg-purple-100/80",
    emerald: "bg-emerald-100/80",
    amber: "bg-yellow-100/80",
  };
  const defaultTextColors: Record<ColorTheme, string> = {
    orange: "text-amber-900",
    blue: "text-sky-900",
    purple: "text-purple-900",
    emerald: "text-emerald-900",
    amber: "text-yellow-900",
  };
  const defaultBorderColors: Record<ColorTheme, string> = {
    orange: "border-amber-300",
    blue: "border-sky-300",
    purple: "border-purple-300",
    emerald: "border-emerald-300",
    amber: "border-yellow-300",
  };

  const bgColor = customColors?.bg || defaultBgColors[colorTheme] || defaultBgColors.blue;
  const textColor = customColors?.text || defaultTextColors[colorTheme] || defaultTextColors.blue;
  const borderColor = customColors?.border || defaultBorderColors[colorTheme] || defaultBorderColors.blue;

  return (
    <div
      className={`relative w-full md:flex-1 transition-all duration-300 hover:z-30 hover:scale-105 ${rotate} ${className}`}
    >
      <div 
        className="p-3 rounded-[24px] shadow-sm hover:shadow-md border h-full flex flex-col transition-shadow relative"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        {/* Notepad Spiral Rings */}
        <NotepadBinding />

        <div
          className={`${bgColor} border ${borderColor} rounded-[16px] p-5 flex-1 flex flex-col relative overflow-hidden`}
        >
          {/* Perforated Tear-off Line */}
          <div className="absolute top-2 left-0 right-0 border-t-2 border-dashed border-black/10 pointer-events-none" />

          <div className="flex items-center justify-between mb-3 pt-1">
            <span
              className={`${textColor} text-3xl font-black tracking-tight`}
              style={{
                fontFamily: '"Comic Sans MS", "Chalkboard SE", system-ui, sans-serif',
              }}
            >
              {number}
            </span>
            {Icon && (
              <div 
                className={`p-2 rounded-xl ${textColor} shadow-xs border border-black/10`}
                style={{ background: "var(--color-card)" }}
              >
                <Icon className="w-5 h-5" />
              </div>
            )}
          </div>
          <h3 
            className="text-xl font-bold leading-tight mb-2"
            style={{ color: "var(--color-foreground)" }}
          >
            {title}
          </h3>
          <p 
            className="text-sm leading-relaxed"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export interface Step {
  title: string;
  description: string;
  colorTheme?: ColorTheme;
  icon?: LucideIcon;
  colors?: {
    bg: string;
    text: string;
    border: string;
  };
}

export interface StepPosition {
  className?: string;
  rotate?: string;
}

export interface HowItWorksProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  features?: Step[];
  className?: string;
  stepPositions?: StepPosition[];
}

const DEFAULT_CARD_POSITIONS: StepPosition[] = [
  { className: "md:translate-y-0", rotate: "rotate-2" },
  { className: "md:translate-y-4", rotate: "-rotate-2" },
  { className: "md:-translate-y-2", rotate: "rotate-3" },
  { className: "md:translate-y-3", rotate: "-rotate-3" },
  { className: "md:translate-y-1", rotate: "rotate-2" },
];

export default function HowItWorks({
  title = "Cara Kerjanya",
  subtitle = "Langkah mudah untuk mulai menikmati perpustakaan digital kami",
  badge = "Proses Mudah",
  features,
  className = "",
  stepPositions,
}: HowItWorksProps) {
  const defaultFeatures: Step[] = [
    {
      title: "Buat Akun",
      description:
        "Daftar gratis hanya dalam 1 menit. Masukkan data Anda dan mulai jelajahi.",
      colorTheme: "orange",
    },
    {
      title: "Cari & Pilih Buku",
      description:
        "Temukan koleksi favorit dari ribuan judul buku, modul, dan jurnal digital.",
      colorTheme: "blue",
    },
    {
      title: "Pinjam & Baca",
      description:
        "Pinjam buku secara instan tanpa antre dan baca langsung dari perangkat Anda.",
      colorTheme: "purple",
    },
    {
      title: "Kumpulkan Poin",
      description:
        "Selesaikan bacaan, dapatkan badge pencapaian, dan tingkatkan level Anda.",
      colorTheme: "emerald",
    },
  ];

  const data = features && features.length > 0 ? features : defaultFeatures;
  const positions = stepPositions || DEFAULT_CARD_POSITIONS;

  return (
    <LazyMotion features={domAnimation}>
      <section
        className={`py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden ${className}`}
        style={{ background: "var(--color-muted)" }}
      >
        {/* Subtle grid background using theme border color */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.25]"
          style={{
            backgroundImage: "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        ></div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header section */}
          {(title || subtitle || badge) && (
            <div className="text-center max-w-2xl mx-auto mb-14">
              {badge && (
                <span className="block text-xs font-mono uppercase tracking-wider text-[#8c7a65] mb-2 font-medium">
                  {badge}
                </span>
              )}
              {title && (
                <h2 className="text-3xl sm:text-4xl font-editorial text-[#332b24]">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-2 text-sm sm:text-base text-[#6b5844] font-space">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Cards container & Horizontal SVG path */}
          <div className="relative">
            {/* Horizontal Connecting SVG line */}
            {data.length > 1 && (
              <svg
                className="absolute top-1/2 left-0 w-full -translate-y-1/2 h-32 pointer-events-none hidden md:block z-0 opacity-60"
                viewBox="0 0 1000 100"
                preserveAspectRatio="none"
              >
                {(() => {
                  const stepWidth = 1000 / data.length;
                  let pathD = "";
                  data.forEach((_, idx) => {
                    if (idx >= data.length - 1) return;
                    const startX = idx * stepWidth + stepWidth * 0.7;
                    const endX = (idx + 1) * stepWidth + stepWidth * 0.3;
                    const midX = (startX + endX) / 2;
                    const startY = idx % 2 === 0 ? 35 : 65;
                    const endY = idx % 2 === 0 ? 65 : 35;
                    
                    if (idx === 0) {
                      pathD += `M ${startX} ${startY} C ${midX} ${startY - 25}, ${midX} ${endY + 25}, ${endX} ${endY}`;
                    } else {
                      pathD += ` C ${midX} ${startY - 25}, ${midX} ${endY + 25}, ${endX} ${endY}`;
                    }
                  });

                  return (
                    <m.path
                      d={pathD || "M 100 50 C 300 20, 400 80, 600 50 C 700 20, 800 80, 900 50"}
                      stroke="var(--color-primary)"
                      strokeWidth="2.5"
                      strokeDasharray="8 6"
                      fill="none"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      initial={{ strokeDashoffset: 0 }}
                      animate={{
                        strokeDashoffset: -140,
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  );
                })()}
              </svg>
            )}

            {/* Horizontal Flex Grid of Cards */}
            <div className="flex flex-col md:flex-row items-stretch justify-center gap-6 lg:gap-8 relative z-10">
              {data.map((step, index) => {
                const position = positions[index % positions.length];
                const formattedNum = index < 9 ? `0${index + 1}` : `${index + 1}`;

                return (
                  <Card
                    key={step.title || index}
                    number={formattedNum}
                    title={step.title}
                    description={step.description}
                    colorTheme={step.colorTheme || (index % 2 === 0 ? "orange" : "blue")}
                    colors={step.colors}
                    icon={step.icon}
                    rotate={position.rotate}
                    className={position.className}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </LazyMotion>
  );
}
