import React from "react";

export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "primary"
  | "sage"
  | "ochre"
  | "terracotta";

interface AdminBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

/**
 * Lencana status selaras dengan palet hangat Gibry.
 * Bebas dari warna neon yang bertabrakan, tetap memenuhi standar kontras WCAG AA.
 */
const variantStyles: Record<Exclude<BadgeVariant, "sage" | "ochre" | "terracotta">, { bg: string; dot: string }> = {
  // Selesai / Tersedia / Lunas: Nuansa Sage dan Forest Green
  success: {
    bg: "bg-[#E8EBDF] text-[#304D42] border-[#DEDDD0] dark:bg-[#2C473D] dark:text-[#FFF9EF] dark:border-[#3A5B4F]",
    dot: "bg-[#304D42] dark:bg-[#DCE2CD]",
  },
  // Sedang Berjalan / Dipinjam: Nuansa Oker Hangat
  warning: {
    bg: "bg-[#FAF3E0] text-[#784918] border-[#E8DCB8] dark:bg-[#3D3422] dark:text-[#F3D48E] dark:border-[#5A4C32]",
    dot: "bg-[#784918] dark:bg-[#F3D48E]",
  },
  // Terlambat / Denda / Perhatian: Nuansa Terracotta Hangat
  danger: {
    bg: "bg-[#FDF2EE] text-[#94492C] border-[#F1D2C8] dark:bg-[#3D251D] dark:text-[#EAA48F] dark:border-[#5C392D]",
    dot: "bg-[#94492C] dark:bg-[#EAA48F]",
  },
  // Informasi / Format: Nuansa Warm Ivory
  info: {
    bg: "bg-[#F2ECDF] text-[#304D42] border-[#DEDDD0] dark:bg-[#2C473D] dark:text-[#FFF9EF] dark:border-[#3A5B4F]",
    dot: "bg-[#565D4F] dark:bg-[#BAC0B3]",
  },
  // Netral: Gray Olive terkalibrasi
  neutral: {
    bg: "bg-[#EFECE4] text-[#565D4F] border-[#DEDDD0] dark:bg-[#233B32] dark:text-[#BAC0B3] dark:border-[#3A5B4F]",
    dot: "bg-[#565D4F] dark:bg-[#BAC0B3]",
  },
  // Penekanan Utama: Forest Green tegas
  primary: {
    bg: "bg-[#304D42] text-[#FFF9EF] border-[#304D42] dark:bg-[#9E5336] dark:text-[#FFF9EF] dark:border-[#9E5336]",
    dot: "bg-[#FFF9EF] dark:bg-[#FFF9EF]",
  },
};

export function AdminBadge({
  children,
  variant = "neutral",
  className = "",
  dot = true,
}: AdminBadgeProps) {
  const canonical = variant === "sage" ? "success" : variant === "ochre" ? "warning" : variant === "terracotta" ? "danger" : variant;
  const styles = variantStyles[canonical];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold tracking-wide ${styles.bg} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />}
      <span>{children}</span>
    </span>
  );
}
