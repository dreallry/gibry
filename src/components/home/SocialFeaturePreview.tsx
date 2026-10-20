import React, { useState } from "react";
import { Send, Star, CheckCircle2, Bell, BookOpen, MessageSquareQuote } from "lucide-react";
import { useToast } from "@/components/Toast";
import { motion, AnimatePresence } from "framer-motion";

interface StudentReview {
  id: string;
  studentName: string;
  grade: string;
  bookTitle: string;
  author: string;
  rating: number;
  quote: string;
  timeAgo: string;
  category: string;
}

const REAL_REVIEWS: StudentReview[] = [
  {
    id: "rev-1",
    studentName: "Nadia Larasati",
    grade: "Kelas XI Desain Komunikasi Visual 1",
    bookTitle: "Bumi Manusia",
    author: "Pramoedya Ananta Toer",
    rating: 5,
    quote:
      "Konflik batin Minke dan penggambaran situasi zaman kolonial sangat membekas. Gaya tulisannya membuat kita merenungkan arti pendidikan dan keadilan.",
    timeAgo: "Kemarin, 14:20 WIB",
    category: "Sastra Indonesia",
  },
  {
    id: "rev-2",
    studentName: "Farhan Maulana",
    grade: "Kelas X Teknik Jaringan Komputer 3",
    bookTitle: "Jaringan Komputer Dasar & Cisco Packet Tracer",
    author: "Kemendikbudristek",
    rating: 5,
    quote:
      "Penjelasannya runut dan ada panduan topologi jaringan praktis. Sangat membantu buat persiapan praktikum di laboratorium sekolah.",
    timeAgo: "2 hari lalu",
    category: "Modul Kejuruan",
  },
  {
    id: "rev-3",
    studentName: "Rian Aditya",
    grade: "Kelas XII Rekayasa Perangkat Lunak 2",
    bookTitle: "Filosofi Teras",
    author: "Henry Manampiring",
    rating: 5,
    quote:
      "Buku yang pas untuk melatih ketenangan berpikir saat mulai penat mengerjakan proyek tugas akhir kejuruan atau persiapan ujian kelulusan.",
    timeAgo: "3 hari lalu",
    category: "Pengembangan Diri",
  },
];

interface OutgoingRec {
  id: string;
  recipient: string;
  grade: string;
  bookTitle: string;
  note: string;
  timestamp: string;
}

export const SocialFeaturePreview: React.FC = () => {
  const { toast } = useToast();

  const [selectedRecipient, setSelectedRecipient] = useState("Farhan Maulana (X TKJ 3)");
  const [selectedBook, setSelectedBook] = useState("Dasar-Dasar Rekayasa Perangkat Lunak");
  const [personalNote, setPersonalNote] = useState("Bab 3 tentang logika sistem wajib kamu baca buat persiapan tugas!");
  const [isSending, setIsSending] = useState(false);

  // Phone notification state
  const [phoneNotification, setPhoneNotification] = useState<{
    show: boolean;
    sender: string;
    book: string;
    note: string;
  } | null>(null);

  // Recommendation logs
  const [recList, setRecList] = useState<OutgoingRec[]>([
    {
      id: "rec-init-1",
      recipient: "Nadia Larasati (XI DKV 1)",
      grade: "XI DKV 1",
      bookTitle: "Bumi Manusia",
      note: "Kamu pasti suka gaya tutur Pramoedya di bab awal ini.",
      timestamp: "10:05 WIB",
    },
  ]);

  const handleSendRecommendation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalNote.trim()) return;

    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);

      const newRec: OutgoingRec = {
        id: `rec-${Date.now()}`,
        recipient: selectedRecipient,
        grade: selectedRecipient.includes("TKJ") ? "X TKJ 3" : "XI DKV 1",
        bookTitle: selectedBook,
        note: personalNote,
        timestamp: "Baru saja",
      };

      setRecList((prev) => [newRec, ...prev]);

      // Trigger realistic smartphone notification banner
      setPhoneNotification({
        show: true,
        sender: "Ahmad Darrell (XII RPL 1)",
        book: selectedBook,
        note: personalNote,
      });

      toast("Rekomendasi buku terkirim", {
        description: `Buku "${selectedBook}" direkomendasikan kepada ${selectedRecipient}.`,
      });

      // Auto dismiss phone notification after 6 seconds
      setTimeout(() => {
        setPhoneNotification((prev) => (prev ? { ...prev, show: false } : null));
      }, 6000);
    }, 700);
  };

  return (
    <section id="community" className="bg-[#FAF7F0] py-20 px-6 border-b border-[#DEDDD0]">
      <div className="max-w-6xl mx-auto">
        {/* Section Header: Two Fonts, Clean, High Contrast */}
        <div className="max-w-3xl mb-14">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8E523A] block mb-2 font-sans">
            Budaya Literasi & Rekomendasi
          </span>
          <h2 className="text-3xl sm:text-5xl font-editorial text-[#203830] leading-tight tracking-tight">
            Membaca tak lagi terasa sendirian.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#3E5249] font-sans leading-relaxed">
            Saling berbagi ulasan jujur tentang bab yang berkesan dan merekomendasikan buku ke teman sejurusan untuk
            referensi tugas sekolah.
          </p>
        </div>

        {/* ── BALANCED 2-COLUMN LAYOUT: ULASAN SISWA vs KIRIM REKOMENDASI ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* KOLOM KIRI (col-span-6): ULASAN REKAN SISWA YANG NYATA */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DEDDD0]">
              <span className="text-sm font-bold text-[#203830] font-sans flex items-center gap-2">
                <MessageSquareQuote size={16} className="text-[#8E523A]" />
                <span>Ulasan & Catatan Baca Siswa</span>
              </span>
              <span className="text-xs text-[#5A6C63] font-sans">3 Ulasan Terhangat</span>
            </div>

            <div className="space-y-4">
              {REAL_REVIEWS.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-[#FFFDF9] border border-[#DEDDD0] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#203830] font-sans leading-tight">
                        {rev.studentName}
                      </h4>
                      <p className="text-xs text-[#5A6C63] font-sans mt-0.5">{rev.grade}</p>
                    </div>

                    <div className="flex items-center gap-1 text-amber-600">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} size={13} fill="currentColor" />
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#F4EFE6] rounded-xl px-3.5 py-2 text-xs font-sans text-[#203830] flex items-center justify-between">
                    <span className="font-semibold">{rev.bookTitle}</span>
                    <span className="text-[#5A6C63]">{rev.category}</span>
                  </div>

                  <p className="text-sm text-[#3E5249] font-sans leading-relaxed italic">
                    "{rev.quote}"
                  </p>

                  <div className="flex items-center justify-between text-xs text-[#5A6C63] font-sans pt-1 border-t border-[#DEDDD0]/60">
                    <span>Penulis: {rev.author}</span>
                    <span>{rev.timeAgo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KOLOM KANAN (col-span-6): INTERAKSI KIRIM REKOMENDASI DENGAN NOTIFIKASI NYATA */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DEDDD0]">
              <span className="text-sm font-bold text-[#203830] font-sans flex items-center gap-2">
                <BookOpen size={16} className="text-[#8E523A]" />
                <span>Uji Coba Kirim Rekomendasi Buku</span>
              </span>
              <span className="text-xs text-[#5A6C63] font-sans">Simulasi Interaksi</span>
            </div>

            {/* FORM KIRIM REKOMENDASI */}
            <form
              onSubmit={handleSendRecommendation}
              className="bg-[#FFFDF9] border border-[#DEDDD0] rounded-2xl p-6 sm:p-7 shadow-xs space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[#203830] font-sans mb-1.5">
                  1. Pilih Rekan Siswa yang Ingin Direkomendasikan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Farhan Maulana (X TKJ 3)",
                    "Nadia Larasati (XI DKV 1)",
                    "Rian Aditya (XII RPL 2)",
                    "Dimas Pratama (X RPL 1)",
                  ].map((target) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => setSelectedRecipient(target)}
                      className={`px-3 py-2 rounded-xl text-xs font-sans font-medium text-left transition-all cursor-pointer ${
                        selectedRecipient === target
                          ? "bg-[#203830] text-[#FFFDF9] shadow-xs"
                          : "bg-[#F4EFE6] text-[#3E5249] hover:bg-[#E8EBDF]"
                      }`}
                    >
                      {target}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#203830] font-sans mb-1.5">
                  2. Judul Buku yang Direkomendasikan
                </label>
                <select
                  value={selectedBook}
                  onChange={(e) => setSelectedBook(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4EFE6] border border-[#DEDDD0] text-sm text-[#203830] font-sans focus:outline-none focus:border-[#8E523A]"
                >
                  <option value="Dasar-Dasar Rekayasa Perangkat Lunak">Dasar-Dasar Rekayasa Perangkat Lunak</option>
                  <option value="Bumi Manusia">Bumi Manusia (Pramoedya Ananta Toer)</option>
                  <option value="Filosofi Teras">Filosofi Teras (Henry Manampiring)</option>
                  <option value="Jaringan Komputer Dasar">Jaringan Komputer Dasar</option>
                  <option value="Atomic Habits">Atomic Habits (James Clear)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#203830] font-sans mb-1.5">
                  3. Catatan Singkat untuk Rekanmu
                </label>
                <textarea
                  rows={2}
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  placeholder="Tulis alasan kenapa buku ini layak dibaca..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F4EFE6] border border-[#DEDDD0] text-sm text-[#203830] font-sans placeholder:text-[#797D6E] focus:outline-none focus:border-[#8E523A]"
                />
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full py-3 px-5 rounded-xl bg-[#203830] hover:bg-[#152620] text-[#FFFDF9] text-sm font-semibold font-sans transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
              >
                <Send size={14} className={isSending ? "animate-pulse" : ""} />
                <span>{isSending ? "Mengirim Rekomendasi..." : "Kirim Rekomendasi Buku"}</span>
              </button>
            </form>

            {/* REALISTIC SMARTPHONE NOTIFICATION POPUP (PERSIS NOTIFIKASI DI PONSEL) */}
            <AnimatePresence>
              {phoneNotification && phoneNotification.show && (
                <motion.div
                  initial={{ opacity: 0, y: -16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="bg-[#203830] text-[#FFFDF9] rounded-2xl p-4 shadow-lg border border-[#3E5249] relative overflow-hidden"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Bell size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs text-[#DCE2CD]">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">DigiPus Sekolah</span>
                        <span>Baru Saja</span>
                      </div>
                      <p className="text-sm font-bold text-white mt-0.5 leading-snug">
                        {phoneNotification.sender} merekomendasikan buku
                      </p>
                      <p className="text-xs text-[#DCE2CD] mt-0.5 font-medium">
                        "{phoneNotification.book}"
                      </p>
                      <p className="text-xs text-[#E8EBDF]/90 italic mt-1 bg-black/20 p-2 rounded-lg">
                        "{phoneNotification.note}"
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* DAFTAR REKOMENDASI TERKIRIM */}
            <div className="bg-[#FFFDF9] border border-[#DEDDD0] rounded-2xl p-5 shadow-xs space-y-3">
              <span className="text-xs font-bold text-[#203830] font-sans block">
                Riwayat Rekomendasi Terkirim
              </span>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {recList.map((rec) => (
                  <div key={rec.id} className="bg-[#F4EFE6] rounded-xl p-3 text-xs font-sans space-y-1">
                    <div className="flex items-center justify-between text-[#203830]">
                      <span className="font-bold">Ke: {rec.recipient}</span>
                      <span className="text-[#5A6C63]">{rec.timestamp}</span>
                    </div>
                    <p className="text-[#203830] font-medium">{rec.bookTitle}</p>
                    <p className="text-[#5A6C63] italic">"{rec.note}"</p>
                    <div className="flex items-center gap-1 text-emerald-800 text-[11px] font-medium pt-1">
                      <CheckCircle2 size={12} />
                      <span>Terkirim ke notifikasi siswa</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialFeaturePreview;
