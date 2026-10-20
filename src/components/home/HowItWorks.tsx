import HowItWorksUI, { Step } from "@/components/ui/how-it-works";
import { UserPlus, Search, BookOpenCheck, Trophy } from "lucide-react";

export default function HowItWorks() {
  const steps: Step[] = [
    {
      title: "Buat Akun",
      description: "Daftar gratis dalam hitungan detik dan rasakan kemudahan akses perpustakaan digital.",
      colorTheme: "orange",
      icon: UserPlus,
    },
    {
      title: "Jelajahi Katalog",
      description: "Temukan koleksi favorit dari ribuan buku, modul, dan e-journal berkualitas.",
      colorTheme: "blue",
      icon: Search,
    },
    {
      title: "Pinjam & Baca",
      description: "Pinjam buku secara digital tanpa antre dan baca langsung di mana saja.",
      colorTheme: "purple",
      icon: BookOpenCheck,
    },
    {
      title: "Raih Poin & Level",
      description: "Kumpulkan poin dari aktivitas membaca dan tingkatkan badge profil Anda.",
      colorTheme: "emerald",
      icon: Trophy,
    },
  ];

  return (
    <HowItWorksUI
      badge="Proses Mudah"
      title="Cara Kerjanya"
      subtitle="4 langkah praktis untuk mulai membaca buku favorit Anda di DigiPus"
      features={steps}
    />
  );
}
