import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  { text: "Fitur Paspor Membaca bikin nagih! Saya dan teman sekelas sekarang balapan mengumpulkan semua stamp genre fiksi dan modul coding.", name: "Andi Pratama", role: "Siswa Kelas XII RPL", image: "https://randomuser.me/api/portraits/men/32.jpg" },
  { text: "Presensi perpustakaan sekarang tinggal satu ketukan, tidak ada antrean panjang lagi pas jam istirahat.", name: "Siti Nurhaliza", role: "Siswa Kelas XI TKJ", image: "https://randomuser.me/api/portraits/women/44.jpg" },
  { text: "Misi mingguan memberi dorongan nyata buat baca buku di luar pelajaran sekolah. XP dan reward-nya seru!", name: "Rizky Ramadhan", role: "Siswa Kelas X DKV", image: "https://randomuser.me/api/portraits/men/62.jpg" },
  { text: "DigiPus mempermudah kami guru mengamati keaktifan literasi siswa secara transparan dan terdata rapi.", name: "Ibu Sri Wahyuni", role: "Guru Bahasa Indonesia", image: "https://randomuser.me/api/portraits/women/68.jpg" },
  { text: "Peminjaman buku digital sangat praktis untuk referensi tugas kejuruan dari rumah tanpa batas waktu perpustakaan tutup.", name: "Dewi Kartika", role: "Siswa Kelas XII MM", image: "https://randomuser.me/api/portraits/women/55.jpg" },
  { text: "Sistem poin dan badge keanggotaan membuat kegiatan membaca di Gibry punya kebanggaan tersendiri.", name: "Fajar Nugroho", role: "Ketua Komunitas Literasi", image: "https://randomuser.me/api/portraits/men/75.jpg" },
  { text: "Desainnya estetik dan rapi banget di HP. Cari buku referensi ujian kejuruan jadi gampang banget.", name: "Maya Putri", role: "Siswa Kelas X Akuntansi", image: "https://randomuser.me/api/portraits/women/90.jpg" },
  { text: "Fitur rekomendasi cerdasnya tepat sasaran. Setiap selesai satu buku, selalu ada saran bacaan baru yang cocok.", name: "Dimas Pratama", role: "Siswa Kelas XI RPL", image: "https://randomuser.me/api/portraits/men/28.jpg" },
  { text: "Klub bukunya aktif dan seru untuk diskusi santai. Membaca tidak lagi terasa sendirian.", name: "Anisa Rahmawati", role: "Anggota Book Club", image: "https://randomuser.me/api/portraits/women/44.jpg" },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const TestimonialsColumn = (props: {
  className?: string;
  testimonials: typeof testimonials;
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{ duration: props.duration || 10, repeat: Infinity, ease: "linear", repeatType: "loop" }}
        className="flex flex-col gap-6 pb-6"
      >
        {[0, 1].map((index) => (
          <React.Fragment key={index}>
            {props.testimonials.map(({ text, image, name, role }, i) => (
              <div
                className="p-6 rounded-3xl max-w-xs w-full transition-all duration-300 hover:shadow-lg border bg-[#fffcf5]"
                style={{ borderColor: "var(--color-border)" }}
                key={i}
              >
                <div className="flex items-center gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={12} className="fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <div className="text-xs sm:text-sm leading-relaxed text-[#4a3f35] font-space">{text}</div>
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#ede5d8]">
                  <img width={36} height={36} src={image} alt={name} className="h-9 w-9 rounded-full object-cover" />
                  <div className="flex flex-col">
                    <div className="font-editorial text-sm tracking-tight text-[#4a3f35]">{name}</div>
                    <div className="text-[11px] font-mono text-[#7d6b56]">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
};

export default function Testimonials() {
  return (
    <section className="relative overflow-hidden py-24 bg-[#ece5d8]/40 border-t border-[#dbd0ba]/60">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-2xl mx-auto text-center mb-12"
        >
          <span className="font-mono text-xs tracking-widest uppercase font-bold text-amber-800 mb-2">
            SUARA KOMUNITAS KAMI
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-editorial tracking-tight text-[#4a3f35]">
            Pengalaman Nyata Pembaca
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#7d6b56] font-space">
            Dengarkan bagaimana Gibry menemani ribuan pembaca dan penggiat literasi setiap hari.
          </p>
        </motion.div>
          <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
            <TestimonialsColumn testimonials={firstColumn} duration={15} />
            <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
            <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
          </div>
        </div>
      </section>
  );
}
