import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBooks, type Book } from "@/lib/firestore";
import { BookOpen, ArrowRight, Bookmark } from "lucide-react";

export const CuratedLibraryShelf: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");

  useEffect(() => {
    getBooks()
      .then((data) => {
        setBooks(data);
      })
      .catch((err) => {
        console.error("Gagal memuat katalog buku:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = ["Semua", "Fiksi & Sastra", "Teknologi & IT", "Desain & Seni", "Pengembangan Diri"];

  const filteredBooks = books.filter((b) => {
    if (activeCategory === "Semua") return true;
    const g = (b.genre || "").toLowerCase();
    const j = (b.judul || "").toLowerCase();
    if (activeCategory === "Fiksi & Sastra") {
      return g.includes("fiksi") || g.includes("sastra") || g.includes("novel");
    }
    if (activeCategory === "Teknologi & IT") {
      return g.includes("teknologi") || g.includes("komputer") || g.includes("it") || j.includes("code");
    }
    if (activeCategory === "Desain & Seni") {
      return g.includes("desain") || g.includes("seni") || j.includes("desain");
    }
    if (activeCategory === "Pengembangan Diri") {
      return g.includes("pengembangan") || g.includes("motivasi") || j.includes("habits");
    }
    return true;
  });

  const displayBooks = filteredBooks.slice(0, 6);

  return (
    <section id="library-shelf" className="py-20 sm:py-24 px-4 sm:px-6 bg-[#E8EBDF] border-t border-b border-[#DEDDD0]">
      <div className="max-w-6xl mx-auto">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#797D6E] font-bold mb-2">
              <Bookmark size={13} className="text-[#AD6549]" />
              <span>REKOMENDASI BUKU PILIHAN</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-editorial text-[#304D42] leading-tight">
              Pilihan Buku Menarik untuk Kamu
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#797D6E] font-space max-w-xl leading-relaxed">
              Koleksi buku dan modul kejuruan yang paling sering dibaca siswa. Siap dipinjam langsung di perpustakaan atau diakses dalam format digital.
            </p>
          </div>

          <Link
            to="/books"
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#304D42] hover:text-[#AD6549] border-b border-[#304D42]/30 pb-0.5 self-start md:self-end transition-colors"
          >
            <span>LIHAT SEMUA BUKU</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-space font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-[#304D42] text-[#FFF9EF] shadow-2xs"
                  : "bg-[#FFF9EF] text-[#797D6E] hover:bg-[#DCE2CD] hover:text-[#304D42] border border-[#DEDDD0]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tactile Bookshelf Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="aspect-[3/4] bg-[#FFF9EF] rounded-2xl border border-[#DEDDD0]" />
                <div className="h-4 bg-[#FFF9EF] rounded w-3/4" />
                <div className="h-3 bg-[#FFF9EF] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : displayBooks.length === 0 ? (
          <div className="text-center py-16 bg-[#FFF9EF] border border-dashed border-[#DEDDD0] rounded-3xl p-8">
            <BookOpen size={32} className="mx-auto text-[#797D6E] mb-3" />
            <h3 className="font-editorial text-xl text-[#304D42]">Belum Ada Buku di Kategori Ini</h3>
            <p className="text-xs text-[#797D6E] font-space mt-1">
              Koleksi buku untuk kategori ini sedang diperbarui oleh pustakawan.
            </p>
            <button
              type="button"
              onClick={() => setActiveCategory("Semua")}
              className="mt-4 px-5 py-2 rounded-full bg-[#304D42] text-[#FFF9EF] text-xs font-space font-medium cursor-pointer"
            >
              Kembali ke Semua Koleksi
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
            {displayBooks.map((book, idx) => {
              const isAvailable = book.status === "Tersedia";
              return (
                <Link
                  key={book.id}
                  to={`/books?search=${encodeURIComponent(book.judul)}`}
                  className="group flex flex-col justify-between bg-[#FFF9EF] border border-[#DEDDD0] rounded-2xl p-3 hover:border-[#AD6549] hover:shadow-xs transition-all hover:-translate-y-1"
                >
                  <div>
                    {/* Book Cover with Spine Illusion */}
                    <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#E8EBDF] relative mb-3 shadow-2xs border border-[#DEDDD0]">
                      {book.cover ? (
                        <img
                          src={book.cover}
                          alt={book.judul}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-[#E8EBDF] text-[#797D6E]">
                          <BookOpen size={24} className="mb-1 opacity-70" />
                          <span className="font-editorial text-xs line-clamp-2">{book.judul}</span>
                        </div>
                      )}

                      {/* Stock Status Pill */}
                      <div className="absolute top-2 left-2">
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold shadow-2xs ${
                            isAvailable
                              ? "bg-[#304D42]/90 text-[#FFF9EF] backdrop-blur-xs"
                              : "bg-[#797D6E]/90 text-white backdrop-blur-xs"
                          }`}
                        >
                          {isAvailable ? "Tersedia" : "Dipinjam"}
                        </span>
                      </div>
                    </div>

                    {/* Accession Code Stamp */}
                    <span className="text-[9px] font-mono text-[#AD6549] font-bold block mb-1">
                      KODE RAK: GB-{101 + idx}
                    </span>

                    {/* Title & Author */}
                    <h4 className="font-editorial text-sm text-[#304D42] font-bold line-clamp-2 group-hover:text-[#AD6549] transition-colors leading-snug">
                      {book.judul}
                    </h4>
                    <p className="text-[11px] text-[#797D6E] font-space line-clamp-1 mt-1">
                      {book.penulis || "Penulis Sekolah"}
                    </p>
                  </div>

                  {/* Footer metadata: Genre */}
                  <div className="pt-2 border-t border-[#DEDDD0] mt-3 flex items-center justify-between text-[10px] font-mono text-[#797D6E]">
                    <span className="truncate">{book.genre || "Umum"}</span>
                    <span className="shrink-0 font-semibold text-[#AD6549] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Lihat Buku
                      <ArrowRight size={11} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default CuratedLibraryShelf;
