import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, BookOpen, User, Clock, MessageSquare } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";

const faqSections = [
  { icon: BookOpen, title: "Peminjaman Buku", items: [
    { q: "Bagaimana cara meminjam buku?", a: "Login ke akun Anda, jelajahi katalog buku, pilih buku yang diinginkan, lalu klik 'Pinjam Buku' atau 'Booking Buku' untuk buku fisik. Batas waktu peminjaman adalah 14 hari." },
    { q: "Berapa banyak buku yang bisa dipinjam?", a: "Anda dapat meminjam maksimal 3 buku secara bersamaan." },
    { q: "Apa beda buku digital dan buku fisik?", a: "Buku digital bisa dibaca langsung di platform, sedangkan buku fisik harus diambil di perpustakaan setelah melakukan booking online." },
    { q: "Bagaimana cara mengembalikan buku?", a: "Buka halaman Profil, temukan buku yang ingin dikembalikan, lalu klik 'Kembalikan'. Jika terlambat, akan ada denda Rp 1.000/hari." },
  ]},
  { icon: User, title: "Akun & Profil", items: [
    { q: "Bagaimana cara membuat akun?", a: "Klik 'Masuk' di navigation bar, lalu pilih 'Daftar sekarang'. Isi formulir pendaftaran dengan data yang valid." },
    { q: "Bagaimana cara mengedit profil?", a: "Buka halaman Profil, klik tombol 'Edit', ubah data yang diperlukan, lalu klik 'Simpan Perubahan'." },
    { q: "Lupa password, bagaimana?", a: "Silakan hubungi administrator perpustakaan di info@gibry.id untuk reset password." },
  ]},
  { icon: Clock, title: "Presensi & Kunjungan", items: [
    { q: "Bagaimana cara mencatat kehadiran?", a: "Login ke akun Anda, buka halaman 'Presensi', isi formulir kehadiran, lalu klik 'Catat Kehadiran'." },
    { q: "Apakah presensi wajib?", a: "Presensi tidak wajib, tetapi sangat disarankan untuk mendapatkan pencapaian dan statistik kunjungan." },
  ]},
  { icon: MessageSquare, title: "Ulasan & Favorit", items: [
    { q: "Bagaimana cara memberi ulasan?", a: "Buka detail buku, scroll ke bagian ulasan, berikan rating 1-5 bintang dan tulis komentar Anda." },
    { q: "Bagaimana cara menambahkan buku ke favorit?", a: "Klik ikon hati (Heart) pada buku yang Anda sukai di halaman Koleksi atau detail buku." },
  ]},
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--color-border)" }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left group">
        <span className="text-sm font-medium pr-4 transition-colors" style={{ color: "var(--color-secondary-foreground)" }}>{q}</span>
        <ChevronDown size={16} className="flex-shrink-0 transition-transform duration-200" style={{ color: "var(--color-muted-foreground)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <p className="text-sm leading-relaxed pb-4" style={{ color: "var(--color-muted-foreground)" }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpPage() {
  return (
    <PageTransition>
      <div className="tile">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--color-accent)", color: "var(--color-primary)" }}><HelpCircle size={22} /></div>
            <h1 className="text-display-lg mb-2">Pusat Bantuan</h1>
            <p style={{ color: "var(--color-muted-foreground)" }}>Temukan jawaban untuk pertanyaan yang sering diajukan</p>
          </div>
          <div className="space-y-6">
            {faqSections.map((section) => (
              <div key={section.title} className="card">
                <h3 className="text-tagline flex items-center gap-2 mb-4"><section.icon size={18} style={{ color: "var(--color-primary)" }} />{section.title}</h3>
                {section.items.map((item) => <FaqItem key={item.q} q={item.q} a={item.a} />)}
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-sm mb-3" style={{ color: "var(--color-muted-foreground)" }}>Masih punya pertanyaan?</p>
            <a href="mailto:info@gibry.id" className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-full text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: "var(--color-primary)" }}>Hubungi Kami</a>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
