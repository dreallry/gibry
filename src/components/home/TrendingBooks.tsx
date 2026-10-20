import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getTrendingBooksThisWeek, getFriendsCurrentlyReading, type Book } from "@/lib/firestore";
import { Flame, Users, BookOpen, Star, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export const TrendingBooks: React.FC = () => {
  const { user } = useAuth();
  const [trending, setTrending] = useState<Book[]>([]);
  const [friendsReading, setFriendsReading] = useState<{ friendName: string; friendPhoto?: string; book: Book }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTrendingBooksThisWeek(4),
      user ? getFriendsCurrentlyReading(user.uid) : Promise.resolve([]),
    ])
      .then(([t, f]) => {
        setTrending(t);
        setFriendsReading(f);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading || (!trending.length && !friendsReading.length)) return null;

  return (
    <div className="space-y-8 my-8">
      {/* Trending Books Row */}
      {trending.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Flame size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif text-[#4a3f35]">Sedang Hangat Minggu Ini</h3>
                <p className="text-xs text-[#7d6b56]">Buku paling banyak dipinjam dan dibaca rekan perpustakaan</p>
              </div>
            </div>
            <Link to="/books?sort=popular" className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1">
              <span>Lihat Semua</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {trending.map((book) => (
              <Link
                key={book.id}
                to={`/books?search=${encodeURIComponent(book.judul)}`}
                className="group bg-[#fffdfa] border border-[#dbd0ba] rounded-2xl p-3 shadow-2xs hover:shadow-md transition-all flex flex-col"
              >
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#e8dfcf] relative mb-2.5">
                  {book.cover ? (
                    <img
                      src={book.cover}
                      alt={book.judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#7d6b56]">
                      <BookOpen size={28} />
                    </div>
                  )}
                  {book.genre && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white">
                      {book.genre}
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-xs text-[#4a3f35] line-clamp-1 group-hover:text-amber-700 transition-colors">
                  {book.judul}
                </h4>
                <p className="text-[11px] text-[#7d6b56] line-clamp-1 mt-0.5">{book.penulis}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Friends Currently Reading Row */}
      {friendsReading.length > 0 && (
        <div className="bg-[#f7f2e7] border border-[#dbd0ba] rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} className="text-amber-700" />
            <h4 className="text-sm font-bold text-[#4a3f35]">Bacaan yang Dibagikan Teman</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {friendsReading.map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl p-3 border border-[#ede5d8] flex items-center gap-3">
                {item.friendPhoto ? (
                  <img src={item.friendPhoto} alt={item.friendName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-xs">
                    {item.friendName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#4a3f35] truncate">{item.friendName}</p>
                  <p className="text-[11px] text-[#7d6b56] truncate mt-0.5">membaca <span className="font-semibold text-amber-800">"{item.book.judul}"</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
