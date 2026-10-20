export interface AvatarFrame {
  id: string;
  name: string;
  tag?: string;
  description: string;
  rarity: "legendary" | "epic" | "rare" | "common";
  eventOnly?: boolean;
  eventDateRange?: {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    label: string;
  };
  imageOverlay?: string;
  imageScale?: number;
  ringClass?: string;
  glowClass?: string;
  badgeIcon?: string;
  themeColor: string;
}

export const AVATAR_FRAMES: AvatarFrame[] = [
  {
    id: "grand_launch_2026",
    name: "Lentera Harapan: Perdana 2026",
    tag: "Edisi Terbatas",
    description: "Bingkai kehormatan pembukaan perdana perpustakaan Gibry 2026. Melarungkan lentera cita-cita dan surat harapan ke langit malam beribu bintang.",
    rarity: "legendary",
    eventOnly: true,
    eventDateRange: {
      startDate: "2026-10-01",
      endDate: "2026-10-10",
      label: "1 - 10 Okt 2026",
    },
    imageOverlay: "/frames/frame_sky_lantern.png",
    imageScale: 1.38,
    ringClass: "ring-2 ring-[#E2A76F]/60 ring-offset-2 ring-offset-[#FFF9EF]",
    glowClass: "shadow-[0_0_16px_rgba(217,119,6,0.35)]",
    badgeIcon: "Sparkles",
    themeColor: "#D97706",
  },
  {
    id: "sakura_matsuri",
    name: "Festival Sakura & Kitsune",
    tag: "Koleksi Budaya",
    description: "Pesona musim semi bermekaran di bawah dahan sakura, ditemani topeng kitsune pembawa berkah dan manisnya dango literasi.",
    rarity: "epic",
    eventOnly: false,
    imageOverlay: "/frames/frame_sakura_matsuri.png",
    imageScale: 1.42,
    ringClass: "ring-2 ring-pink-400/60 ring-offset-2 ring-offset-[#FFF9EF]",
    glowClass: "shadow-[0_0_14px_rgba(236,72,153,0.35)]",
    badgeIcon: "Flower",
    themeColor: "#EC4899",
  },
  {
    id: "halloween_spooky_2026",
    name: "Malam Labu & Sayap Kelam",
    tag: "Event Halloween",
    description: "Perayaan malam Halloween di perpustakaan. Sayap kelelawar misteri bersama lentera labu Jack-o'-lantern pembawa kehangatan.",
    rarity: "legendary",
    eventOnly: true,
    eventDateRange: {
      startDate: "2026-10-20",
      endDate: "2026-10-31",
      label: "20 - 31 Okt 2026",
    },
    imageOverlay: "/frames/frame_halloween_pumpkin.png",
    imageScale: 1.42,
    ringClass: "ring-2 ring-orange-500/60 ring-offset-2 ring-offset-[#FFF9EF]",
    glowClass: "shadow-[0_0_14px_rgba(234,88,12,0.4)]",
    badgeIcon: "Flame",
    themeColor: "#EA580C",
  },
  {
    id: "pixel_cat_nostalgia",
    name: "Kucing Piksel 8-Bit",
    tag: "Retro Arcade",
    description: "Estetika retro 8-bit ceria dengan kucing piksel biru pastel, balon pesan cinta, perban imut, dan kerlip bintang kosmik.",
    rarity: "rare",
    eventOnly: false,
    imageOverlay: "/frames/frame_pixel_cat.png",
    imageScale: 1.82,
    ringClass: "ring-2 ring-sky-400/60 ring-offset-2 ring-offset-[#FFF9EF]",
    glowClass: "shadow-[0_0_14px_rgba(56,189,248,0.35)]",
    badgeIcon: "Heart",
    themeColor: "#0284C7",
  },
  {
    id: "emerald_scholar",
    name: "Zamrud Literasi",
    tag: "Koleksi Klasik",
    description: "Bingkai kehormatan pustaka dengan estetika hijau botani khas Gibry.",
    rarity: "rare",
    eventOnly: false,
    ringClass: "ring-3 ring-[#304D42] ring-offset-2 ring-offset-[#FFF9EF]",
    glowClass: "shadow-[0_0_12px_rgba(48,77,66,0.35)]",
    themeColor: "#304D42",
  },
  {
    id: "golden_reader",
    name: "Emas Pustakawan",
    tag: "Pencapaian",
    description: "Penghargaan khusus untuk pembaca aktif dan konsisten menjelajahi buku.",
    rarity: "epic",
    eventOnly: false,
    ringClass: "ring-3 ring-[#D97706] ring-offset-2 ring-offset-[#FFF9EF]",
    glowClass: "shadow-[0_0_14px_rgba(217,119,6,0.4)]",
    themeColor: "#D97706",
  },
];

export function getAvatarFrame(id: string | null | undefined): AvatarFrame | undefined {
  if (!id) return undefined;
  return AVATAR_FRAMES.find((f) => f.id === id);
}

export function isFrameEventActive(
  frameOrId: AvatarFrame | string,
  targetDate?: Date
): { isActive: boolean; reason: string } {
  const frame = typeof frameOrId === "string" ? getAvatarFrame(frameOrId) : frameOrId;
  if (!frame) {
    return { isActive: false, reason: "Bingkai tidak ditemukan" };
  }

  if (!frame.eventDateRange) {
    return { isActive: true, reason: "Tersedia kapan saja" };
  }

  const now = targetDate || new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  const { startDate, endDate, label } = frame.eventDateRange;

  if (todayStr < startDate) {
    return { isActive: false, reason: `Event belum dimulai (periode klaim: ${label})` };
  }
  if (todayStr > endDate) {
    return { isActive: false, reason: `Periode event telah berakhir pada ${endDate}` };
  }
  return { isActive: true, reason: `Event sedang aktif (${label})` };
}
