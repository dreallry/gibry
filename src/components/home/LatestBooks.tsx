import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { getLatestBooks, type Book } from "@/lib/firestore";

export default function LatestBooks() {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    getLatestBooks(3)
      .then(setBooks)
      .catch(() => {});
  }, []);

  return (
    <section className="bg-[#18181b] relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/[0.02] rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-20 relative">
        <div className="text-center mb-12">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Katalog</span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2">
            Koleksi yang Terus Bertumbuh
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {books.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-[#272729] rounded-2xl overflow-hidden border border-zinc-800">
                  <div className="aspect-[3/4] bg-zinc-800 animate-pulse" />
                  <div className="p-5">
                    <div className="h-4 bg-zinc-800 animate-pulse rounded mb-2 w-3/4" />
                    <div className="h-3 bg-zinc-800 animate-pulse rounded mb-3 w-1/2" />
                    <div className="flex gap-3">
                      <div className="h-3 bg-zinc-800 animate-pulse rounded w-12" />
                      <div className="h-3 bg-zinc-800 animate-pulse rounded w-16" />
                    </div>
                  </div>
                </div>
              ))
            : books.map((book, i) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link
                  to={`/books?search=${encodeURIComponent(book.judul)}`}
                  className="block bg-[#272729] rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/20 transition-all duration-300 group"
                >
                  <div className="aspect-[3/4] overflow-hidden relative">
                    {book.cover ? (
                      <img
                        src={book.cover}
                        alt={book.judul}
                        className="w-full h-full object-cover rounded-t-2xl group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <BookOpen size={32} className="text-zinc-600" />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                      <span className="text-white text-xs font-medium flex items-center gap-1.5">
                        Lihat Detail <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-white text-sm leading-snug truncate group-hover:text-zinc-200 transition-colors">
                      {book.judul}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1.5 truncate">
                      {book.penulis}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-[11px] text-zinc-500">
                      <span>{book.tahun}</span>
                      <span className="w-px h-3 bg-zinc-700" />
                      <span>{book.halaman} halaman</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/books"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white transition-all group"
          >
            Lihat Semua Buku
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
