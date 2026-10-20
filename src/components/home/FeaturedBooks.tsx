import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBooks, type Book } from "@/lib/firestore";
import { ArrowUpRight, BookOpen } from "lucide-react";

export const FeaturedBooks: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBooks()
      .then((data) => {
        // Take 4 distinctive books with covers
        const withCovers = data.filter((b) => b.cover);
        const selected = withCovers.length >= 4 ? withCovers.slice(0, 4) : data.slice(0, 4);
        setBooks(selected);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading && books.length === 0) {
    return (
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="h-6 w-48 bg-[#ece5d8] rounded mb-10 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-7 h-96 bg-[#ece5d8] rounded-3xl animate-pulse" />
          <div className="col-span-12 md:col-span-5 h-96 bg-[#ece5d8] rounded-3xl animate-pulse" />
        </div>
      </section>
    );
  }

  if (books.length < 2) return null;

  return (
    <section id="catalog" className="py-24 px-6 max-w-6xl mx-auto">
      {/* Editorial Section Introduction (Zainab Kabira style) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[#8c7a65]">
            KATALOG PILIHAN
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-editorial text-[#332b24] mt-2">
            Koleksi Terpilih Minggu Ini
          </h2>
          <p className="mt-3 text-[#6b5844] font-space text-base max-w-xl">
            Buku dan modul yang paling sering dipinjam oleh siswa untuk tugas kejuruan maupun bacaan santai.
          </p>
        </div>

        <Link
          to="/books"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#4a3f35] hover:text-[#8c6d48] border-b border-[#4a3f35]/30 pb-0.5 self-start md:self-end transition-colors"
        >
          <span>LIHAT SEMUA BUKU</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* Staggered 2x2 Gallery Grid (Zainab Kabira project-tiles pattern) */}
      <div className="space-y-6">
        {/* Row 1: Wide + Narrow */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {books[0] && (
            <Link
              to={`/books?search=${encodeURIComponent(books[0].judul)}`}
              className="group relative md:col-span-7 h-[360px] sm:h-[420px] rounded-[36px] overflow-hidden border border-[#d8ccb8] bg-[#f5efe4] flex flex-col justify-end p-6 sm:p-8"
            >
              {/* Background Cover Art */}
              <div className="absolute inset-0 z-0">
                {books[0].cover ? (
                  <img
                    src={books[0].cover}
                    alt={books[0].judul}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#eae1d0] text-[#7d6b56]">
                    <BookOpen size={48} />
                  </div>
                )}
                {/* Dark Gradient Overlay for contrast and readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1f1914]/90 via-[#1f1914]/40 to-transparent" />
              </div>

              {/* Content on Bottom */}
              <div className="relative z-10 text-white">
                <span className="text-[11px] font-mono tracking-wider uppercase text-amber-200/90 font-medium">
                  {books[0].genre || "Koleksi Perpustakaan"}
                </span>
                <h3 className="text-2xl sm:text-3xl font-editorial leading-tight mt-1 text-[#fffdfa] group-hover:text-amber-100 transition-colors">
                  {books[0].judul}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 font-space mt-1.5 line-clamp-2">
                  Penulis: {books[0].penulis} {books[0].penerbit ? `• Penerbit ${books[0].penerbit}` : ""}
                </p>
              </div>
            </Link>
          )}

          {books[1] && (
            <Link
              to={`/books?search=${encodeURIComponent(books[1].judul)}`}
              className="group relative md:col-span-5 h-[360px] sm:h-[420px] rounded-[36px] overflow-hidden border border-[#d8ccb8] bg-[#f5efe4] flex flex-col justify-end p-6 sm:p-8"
            >
              <div className="absolute inset-0 z-0">
                {books[1].cover ? (
                  <img
                    src={books[1].cover}
                    alt={books[1].judul}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#eae1d0] text-[#7d6b56]">
                    <BookOpen size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1f1914]/90 via-[#1f1914]/40 to-transparent" />
              </div>

              <div className="relative z-10 text-white">
                <span className="text-[11px] font-mono tracking-wider uppercase text-amber-200/90 font-medium">
                  {books[1].genre || "Koleksi Perpustakaan"}
                </span>
                <h3 className="text-xl sm:text-2xl font-editorial leading-tight mt-1 text-[#fffdfa] group-hover:text-amber-100 transition-colors">
                  {books[1].judul}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 font-space mt-1.5 line-clamp-1">
                  Penulis: {books[1].penulis}
                </p>
              </div>
            </Link>
          )}
        </div>

        {/* Row 2: Narrow + Wide (Inverted pattern) */}
        {books.length >= 4 && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {books[2] && (
              <Link
                to={`/books?search=${encodeURIComponent(books[2].judul)}`}
                className="group relative md:col-span-5 h-[360px] sm:h-[420px] rounded-[36px] overflow-hidden border border-[#d8ccb8] bg-[#f5efe4] flex flex-col justify-end p-6 sm:p-8"
              >
                <div className="absolute inset-0 z-0">
                  {books[2].cover ? (
                    <img
                      src={books[2].cover}
                      alt={books[2].judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#eae1d0] text-[#7d6b56]">
                      <BookOpen size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1f1914]/90 via-[#1f1914]/40 to-transparent" />
                </div>

                <div className="relative z-10 text-white">
                  <span className="text-[11px] font-mono tracking-wider uppercase text-amber-200/90 font-medium">
                    {books[2].genre || "Koleksi Perpustakaan"}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-editorial leading-tight mt-1 text-[#fffdfa] group-hover:text-amber-100 transition-colors">
                    {books[2].judul}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-300 font-space mt-1.5 line-clamp-1">
                    Penulis: {books[2].penulis}
                  </p>
                </div>
              </Link>
            )}

            {books[3] && (
              <Link
                to={`/books?search=${encodeURIComponent(books[3].judul)}`}
                className="group relative md:col-span-7 h-[360px] sm:h-[420px] rounded-[36px] overflow-hidden border border-[#d8ccb8] bg-[#f5efe4] flex flex-col justify-end p-6 sm:p-8"
              >
                <div className="absolute inset-0 z-0">
                  {books[3].cover ? (
                    <img
                      src={books[3].cover}
                      alt={books[3].judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#eae1d0] text-[#7d6b56]">
                      <BookOpen size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1f1914]/90 via-[#1f1914]/40 to-transparent" />
                </div>

                <div className="relative z-10 text-white">
                  <span className="text-[11px] font-mono tracking-wider uppercase text-amber-200/90 font-medium">
                    {books[3].genre || "Koleksi Perpustakaan"}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-editorial leading-tight mt-1 text-[#fffdfa] group-hover:text-amber-100 transition-colors">
                    {books[3].judul}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-300 font-space mt-1.5 line-clamp-2">
                    Penulis: {books[3].penulis} {books[3].penerbit ? `• Penerbit ${books[3].penerbit}` : ""}
                  </p>
                </div>
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedBooks;
