import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/books?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const quickChips = ["Pramoedya", "Teknologi", "Desain", "Sejarah", "Pemrograman"];

  return (
    <section id="search-catalog" className="relative pt-12 pb-16 sm:pt-16 sm:pb-24 bg-[#FAF7F0] overflow-hidden">
      {/* Torn Paper Top Transition from ParallaxStory (#F2ECDF) above */}
      <div className="absolute top-0 left-0 right-0 w-full overflow-hidden leading-none z-20 pointer-events-none">
        <svg
          viewBox="0 0 1200 24"
          preserveAspectRatio="none"
          className="w-full h-5 sm:h-6 text-[#F2ECDF] fill-current block drop-shadow-[0_2px_4px_rgba(48,77,66,0.06)]"
        >
          <path d="M0,0 L1200,0 L1200,12 Q1170,1 1140,8 Q1110,21 1080,14 Q1050,2 1020,11 Q990,22 960,15 Q930,3 900,12 Q870,23 840,15 Q810,1 780,10 Q750,22 720,16 Q690,4 660,12 Q630,23 600,15 Q570,1 540,8 Q510,21 480,14 Q450,2 420,11 Q390,22 360,16 Q330,3 300,10 Q270,23 240,15 Q210,0 180,9 Q150,22 120,14 Q90,3 60,11 Q30,19 0,12 Z" />
        </svg>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 relative z-10 pt-4 sm:pt-6">
        <div className="bg-[#FFF9EF] border border-[#DEDDD0] rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-[0_10px_35px_rgba(48,77,66,0.07)] text-center relative overflow-hidden">
          {/* Subtle Decorative Archival Corners */}
          <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 text-[10px] font-mono text-[#DEDDD0] select-none pointer-events-none">┌</div>
          <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 text-[10px] font-mono text-[#DEDDD0] select-none pointer-events-none">┐</div>
          <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 text-[10px] font-mono text-[#DEDDD0] select-none pointer-events-none">└</div>
          <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 text-[10px] font-mono text-[#DEDDD0] select-none pointer-events-none">┘</div>

          <h2 className="text-xl sm:text-3xl font-editorial text-[#304D42]">
            Cari Koleksi Buku Perpustakaan
          </h2>
          <p className="text-xs sm:text-sm mt-1.5 sm:mt-2 text-[#797D6E] font-space max-w-md mx-auto leading-relaxed">
            Ketik judul, nama pengarang, genre, atau nomor ISBN buku yang kamu cari.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 sm:mt-7 relative">
            <div className={`relative flex items-center transition-all duration-300 ${focused ? 'scale-[1.01]' : ''}`}>
              <Search size={18} className="absolute left-4 sm:left-5 pointer-events-none text-[#797D6E]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Cari judul, penulis, atau topik buku..."
                className="w-full h-12 sm:h-14 rounded-2xl pl-11 sm:pl-13 pr-14 text-base sm:text-sm font-space outline-none transition-all bg-[#FAF7F0] text-[#304D42] placeholder:text-[#797D6E]/70 touch-manipulation"
                style={{
                  border: `1.5px solid ${focused ? "#304D42" : "#DEDDD0"}`,
                  boxShadow: focused ? "0 0 0 3px rgba(48, 77, 66, 0.12)" : "none",
                }}
              />
              <button
                type="submit"
                className="absolute right-1.5 sm:right-2 w-10 h-10 sm:w-10 sm:h-10 bg-[#304D42] hover:bg-[#233B32] active:scale-95 text-[#FFF9EF] rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation"
                title="Cari"
                aria-label="Cari buku"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </form>

          {/* Quick Search Chips */}
          <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs font-space">
            <span className="text-[11px] text-[#797D6E] font-mono mr-1">Pencarian populer:</span>
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setQuery(chip);
                  navigate(`/books?search=${encodeURIComponent(chip)}`);
                }}
                className="px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#E8EBDF] hover:bg-[#DCE2CD] active:scale-95 text-[#304D42] text-xs sm:text-[11px] font-medium border border-[#DEDDD0] transition-all cursor-pointer touch-manipulation"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
