import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  QrCode,
  Award,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  ScanLine,
} from "lucide-react";

export const SchoolExperience: React.FC = () => {
  // Interactive Feature Playground States
  const [activeTab, setActiveTab] = useState<"pinjam" | "paspor" | "presensi">("pinjam");
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState("Teknologi");
  const [stampedList, setStampedList] = useState<string[]>(["Teknologi"]);
  const [presensiDone, setPresensiDone] = useState(false);

  const handleSimulateScan = () => {
    setIsScanning(true);
    setScanComplete(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
    }, 1200);
  };

  const handleToggleStamp = (name: string) => {
    setSelectedStamp(name);
    if (!stampedList.includes(name)) {
      setStampedList([...stampedList, name]);
    }
  };

  return (
    <section
      id="school-overview"
      className="relative z-10 bg-[#fbf8f2] border-t border-[#ded2be] pt-24 pb-32"
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Playful & Confident Studio Merge Opening */}
        <div className="max-w-3xl mb-16">
          <span className="text-xs font-mono tracking-widest uppercase text-[#8c7a65]">
            BAGAIMANA DIGIPUS BEKERJA
          </span>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-editorial text-[#26201b] mt-3 leading-[1.08] tracking-tight">
            Perpustakaan yang bikin penasaran.
            <span className="block text-[#8c6d48] italic font-normal">
              Bukan yang bikin ngantuk.
            </span>
          </h2>

          <p className="mt-5 text-base sm:text-lg md:text-xl text-[#5c4d3d] font-space leading-relaxed font-light">
            Waktu pertama kali merancang DigiPus, kami bertanya: kenapa perpustakaan sekolah sering sepi?
            Jawabannya bukan karena siswa malas membaca, tapi karena caranya yang ketinggalan zaman.
            Kartu kertas gampang hilang, antrean buku tamu bikin segan, dan tidak ada rasa serunya.
          </p>

          <p className="mt-2 text-xs font-mono text-[#8c7a65]">
            (Bocoran: Begitu cara pinjamnya kami bikin secepat scan belanjaan dan ada stempel paspornya, siswa malah betah mampir)
          </p>
        </div>

        {/* Studio Merge Style Interactive Experience Matrix */}
        <div className="bg-[#fffdfa] border border-[#d8ccb8] rounded-3xl p-6 sm:p-10 shadow-sm">
          {/* Navigation Pill Switcher */}
          <div className="flex flex-wrap items-center gap-2 pb-6 border-b border-[#ded2be]">
            {[
              { id: "pinjam", label: "01. Pinjam Buku 3 Detik", icon: QrCode },
              { id: "paspor", label: "02. Paspor & Misi Membaca", icon: Award },
              { id: "presensi", label: "03. Presensi Sekali Ketuk", icon: CheckCircle2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-[#26201b] text-white shadow-xs"
                      : "bg-[#f5ede2] text-[#5c4d3d] hover:bg-[#ece2d3] border border-[#ded2be]/60"
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Playground */}
          <div className="pt-8">
            <AnimatePresence mode="wait">
              {/* TAB 1: PINJAM BUKU */}
              {activeTab === "pinjam" && (
                <motion.div
                  key="pinjam"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                >
                  <div className="lg:col-span-6 space-y-4">
                    <span className="text-xs font-mono uppercase tracking-widest text-[#8c6d48] font-semibold">
                      ALUR PEMINJAMAN CERDAS
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-editorial text-[#26201b]">
                      Tinggal ambil buku di rak, scan barcode, beres.
                    </h3>
                    <p className="text-sm sm:text-base text-[#5c4d3d] font-space leading-relaxed font-light">
                      Siswa tidak perlu lagi mengisi kartu pinjam kuning yang rawan hilang di kantong celana.
                      Cukup scan kode di sampul buku pakai ponsel atau di meja sirkulasi, buku langsung masuk ke riwayat baca akun siswa.
                    </p>
                    <div className="p-4 rounded-xl bg-[#f7f2e8] border border-[#ded2be] text-xs text-[#524436] space-y-1">
                      <p className="font-semibold text-[#26201b]">Kenapa pihak sekolah menyukainya?</p>
                      <p className="font-light">
                        Stok di rak selalu akurat, ada pengingat ramah sebelum jatuh tempo, dan risiko buku terselip berkurang drastis.
                      </p>
                    </div>
                  </div>

                  {/* Interactive Laser Barcode Scanner Simulator */}
                  <div className="lg:col-span-6 bg-[#fbf8f2] border border-[#d8ccb8] rounded-2xl p-6 sm:p-7 text-center">
                    <span className="text-[10px] font-mono tracking-wider uppercase text-[#8c7a65] block mb-4">
                      COBA SIMULASI SCANNER DI BAWAH INI
                    </span>

                    <div className="relative max-w-xs mx-auto aspect-[4/3] rounded-2xl bg-white border border-[#ded2be] p-4 flex flex-col justify-between overflow-hidden shadow-xs">
                      {/* Laser Line Animation when scanning */}
                      {isScanning && (
                        <motion.div
                          initial={{ top: "10%" }}
                          animate={{ top: "85%" }}
                          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                          className="absolute left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] z-20"
                        />
                      )}

                      <div className="flex justify-between items-center text-[10px] font-mono text-[#8c7a65]">
                        <span>BUKU KEJURUAN</span>
                        <span>RAK A-03</span>
                      </div>

                      <div className="my-auto py-2">
                        <div className="font-editorial text-lg text-[#26201b] font-bold">
                          Desain Antarmuka & Logika Web
                        </div>
                        <div className="text-[11px] font-mono text-[#8c7a65] mt-0.5">
                          ISBN: 978-602-0012-34-5
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-[#f0e7d8] text-[11px]">
                        {scanComplete ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 size={13} /> Berhasil Terpinjam (Batas 14 Hari)
                          </span>
                        ) : isScanning ? (
                          <span className="text-amber-700 font-medium flex items-center gap-1">
                            <Clock size={12} className="animate-spin" /> Membaca Barcode...
                          </span>
                        ) : (
                          <span className="text-[#8c7a65]">Siap dipindai</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={handleSimulateScan}
                        disabled={isScanning}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#26201b] hover:bg-[#15110e] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <ScanLine size={14} />
                        <span>{isScanning ? "Memindai..." : "Klik untuk Tes Pindai Barcode"}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: PASPOR MEMBACA */}
              {activeTab === "paspor" && (
                <motion.div
                  key="paspor"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                >
                  <div className="lg:col-span-6 space-y-4">
                    <span className="text-xs font-mono uppercase tracking-widest text-[#8c6d48] font-semibold">
                      FITUR UNIK: GAMIFIKASI BACA
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-editorial text-[#26201b]">
                      Setiap buku tamat, stempel paspor bertambah.
                    </h3>
                    <p className="text-sm sm:text-base text-[#5c4d3d] font-space leading-relaxed font-light">
                      Anak muda suka mengoleksi pencapaian. Di DigiPus, setiap siswa memegang Paspor Membaca digital.
                      Tamat satu novel? Cap sastra mendarat. Selesai modul coding? Cap teknologi terbuka. Ditambah misi mingguan berhadiah XP, membaca jadi petualangan yang bikin bangga.
                    </p>
                    <div className="p-4 rounded-xl bg-[#f7f2e8] border border-[#ded2be] text-xs text-[#524436] space-y-1">
                      <p className="font-semibold text-[#26201b]">Kenapa pihak sekolah menyukainya?</p>
                      <p className="font-light">
                        Membaca bukan lagi keterpaksaan karena ada kepuasan nyata saat melihat paspor terisi penuh dan level keanggotaan naik.
                      </p>
                    </div>
                  </div>

                  {/* Interactive Passport Booklet Stamping Simulator */}
                  <div className="lg:col-span-6 bg-[#fbf8f2] border border-[#d8ccb8] rounded-2xl p-6 sm:p-7 text-center">
                    <span className="text-[10px] font-mono tracking-wider uppercase text-[#8c7a65] block mb-3">
                      SENTUH STEMPEL UNTUK MENGELEKSI CAP
                    </span>

                    <div className="max-w-sm mx-auto bg-white border-2 border-[#d8ccb8] rounded-2xl p-5 shadow-xs text-left">
                      <div className="flex items-center justify-between border-b border-[#ded2be] pb-2 mb-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#8c7a65]">
                          PASPOR MEMBACA DIGITAL
                        </span>
                        <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                          {stampedList.length} / 4 STEMPEL
                        </span>
                      </div>

                      {/* Stamping Grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { name: "Teknologi", color: "#a67c52" },
                          { name: "Karya Sastra", color: "#8d6e4c" },
                          { name: "Sains & Logika", color: "#735a3a" },
                          { name: "Desain Kreatif", color: "#b3906f" },
                        ].map((stamp) => {
                          const isCollected = stampedList.includes(stamp.name);
                          return (
                            <button
                              key={stamp.name}
                              onClick={() => handleToggleStamp(stamp.name)}
                              className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                                isCollected
                                  ? "bg-[#f5ede2] border-[#8c6d48] text-[#332b24] shadow-xs rotate-[-2deg]"
                                  : "bg-[#faf8f5] border-dashed border-[#d8ccb8] text-[#a69580] hover:border-[#8c6d48]"
                              }`}
                            >
                              <span className="block text-[9px] font-mono uppercase tracking-wider">
                                {isCollected ? "RESMI DICAP" : "BELUM AKTIF"}
                              </span>
                              <span className="font-editorial text-sm block mt-1">
                                {stamp.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <p className="mt-3 text-[11px] text-[#7d6b56] font-space text-center">
                        {stampedList.length === 4
                          ? "Keren! Seluruh stempel berhasil dikoleksi di paspor digitalmu."
                          : "Ketuk salah satu kotak untuk mencoba sensasi stempel paspor."}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: PRESENSI SEKALI KETUK */}
              {activeTab === "presensi" && (
                <motion.div
                  key="presensi"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                >
                  <div className="lg:col-span-6 space-y-4">
                    <span className="text-xs font-mono uppercase tracking-widest text-[#8c6d48] font-semibold">
                      PRESENSI PAPERLESS
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-editorial text-[#26201b]">
                      Buku tamu yang tidak akan pernah lecek atau robek.
                    </h3>
                    <p className="text-sm sm:text-base text-[#5c4d3d] font-space leading-relaxed font-light">
                      Begitu siswa masuk pintu perpustakaan, cukup satu kali tap presensi dari ponsel atau tablet perpustakaan.
                      Data langsung terhubung dengan akun siswa, mencatat waktu kunjungan, dan langsung masuk ke rekapitulasi sekolah.
                    </p>
                    <div className="p-4 rounded-xl bg-[#f7f2e8] border border-[#ded2be] text-xs text-[#524436] space-y-1">
                      <p className="font-semibold text-[#26201b]">Kenapa pihak sekolah menyukainya?</p>
                      <p className="font-light">
                        Pustakawan tidak perlu lagi menyalin ratusan tanda tangan kertas saat akreditasi sekolah tiba. Data pengunjung siap cetak dalam 1 klik.
                      </p>
                    </div>
                  </div>

                  {/* Interactive Attendance Check-in Simulator */}
                  <div className="lg:col-span-6 bg-[#fbf8f2] border border-[#d8ccb8] rounded-2xl p-6 sm:p-7 text-center">
                    <span className="text-[10px] font-mono tracking-wider uppercase text-[#8c7a65] block mb-4">
                      SIMULASI PRESENSI MANDIRI PENGUNJUNG
                    </span>

                    <div className="max-w-xs mx-auto bg-white border border-[#ded2be] rounded-2xl p-5 shadow-xs text-left">
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#f0e7d8]">
                        <div className="w-10 h-10 rounded-full bg-[#f5ede2] text-[#8c6d48] flex items-center justify-center font-bold font-editorial">
                          GB
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#26201b]">Anggota Komunitas Gibry</p>
                          <p className="text-[10px] font-mono text-[#8c7a65]">ID: #GB-8921</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-[#524436] font-space mb-4">
                        <div className="flex justify-between">
                          <span className="text-[#8c7a65]">Lokasi:</span>
                          <span className="font-medium">Perpustakaan Utama</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8c7a65]">Status:</span>
                          <span className="font-bold text-amber-900">
                            {presensiDone ? "Sudah Presensi Hari Ini" : "Belum Presensi"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setPresensiDone(!presensiDone)}
                        className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          presensiDone
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-[#26201b] hover:bg-[#171310] text-white"
                        }`}
                      >
                        {presensiDone ? "Presensi Terverifikasi" : "Ketuk untuk Presensi Sekarang"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Studio Merge Style Conversational Footer Invitation */}
        <div className="mt-16 pt-10 border-t border-[#ded2be] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h4 className="text-xl sm:text-2xl font-editorial text-[#26201b]">
              Tertarik membawa pengalaman membaca seperti ini ke sekolahmu?
            </h4>
            <p className="text-sm text-[#6b5844] font-space mt-1 font-light">
              Mulai dengan melihat buku dan modul yang sudah aktif dipinjam oleh siswa saat ini.
            </p>
          </div>

          <Link
            to="/books"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#26201b] hover:bg-[#1a1512] text-white text-xs font-mono uppercase tracking-wider font-semibold transition-all shrink-0 cursor-pointer"
          >
            <span>Buka Katalog Koleksi</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SchoolExperience;
