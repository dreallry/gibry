import React from "react";
import { Flame, Compass, Zap, Trophy, Calendar } from "lucide-react";

interface ReadingHeatmapProps {
  activityHeatmap?: Record<string, number>;
  readingPaceDays?: number;
  genreDiversityScore?: number;
  percentileRank?: number;
  readingStreak: number;
}

export const ReadingHeatmap: React.FC<ReadingHeatmapProps> = ({
  activityHeatmap = {},
  readingPaceDays = 7,
  genreDiversityScore = 50,
  percentileRank = 50,
  readingStreak,
}) => {
  // Generate last 16 weeks (112 days) up to today
  const days: { dateStr: string; count: number; dayOfWeek: number }[] = [];
  const today = new Date();

  for (let i = 111; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({
      dateStr,
      count: activityHeatmap[dateStr] || 0,
      dayOfWeek: d.getDay(),
    });
  }

  function getColor(count: number) {
    if (count === 0) return "bg-[#e8dfcf] dark:bg-stone-800";
    if (count === 1) return "bg-amber-300";
    if (count === 2) return "bg-amber-500";
    return "bg-amber-700";
  }

  return (
    <div className="space-y-6">
      {/* 3 Core Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pace */}
        <div className="bg-[#fcfaf7] border border-[#dbd0ba] rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#7d6b56]">Reading Pace</p>
              <h4 className="text-xl font-bold text-[#4a3f35]">
                {readingPaceDays} <span className="text-xs font-normal text-[#7d6b56]">hari / buku</span>
              </h4>
            </div>
          </div>
          <p className="text-xs text-[#7d6b56] mt-2">
            {readingPaceDays <= 4
              ? "Kecepatan membaca sangat impresif! Kamu seorang pembaca cepat."
              : "Tempo membaca stabil dan teratur untuk memahami isi buku."}
          </p>
        </div>

        {/* Diversity Score */}
        <div className="bg-[#fcfaf7] border border-[#dbd0ba] rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Compass size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#7d6b56]">Genre Diversity</p>
              <h4 className="text-xl font-bold text-[#4a3f35]">{genreDiversityScore}%</h4>
            </div>
          </div>
          <div className="w-full bg-[#e8dfcf] rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(10, genreDiversityScore))}%` }}
            />
          </div>
          <p className="text-xs text-[#7d6b56] mt-2">
            {genreDiversityScore >= 70
              ? "Eksplorasi beragam: kamu terbuka pada banyak kategori ilmu."
              : "Coba baca genre baru untuk meningkatkan wawasan literasimu."}
          </p>
        </div>

        {/* Community Standing */}
        <div className="bg-[#fcfaf7] border border-[#dbd0ba] rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Trophy size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#7d6b56]">Peringkat Literasi</p>
              <h4 className="text-xl font-bold text-[#4a3f35]">Top {100 - percentileRank + 5}%</h4>
            </div>
          </div>
          <p className="text-xs text-[#7d6b56] mt-2">
            Aktivitasmu lebih tinggi dari mayoritas pembaca di DigiPus. Pertahankan!
          </p>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="bg-[#fcfaf7] border border-[#dbd0ba] rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-amber-700" />
            <h4 className="text-sm font-bold text-[#4a3f35]">Peta Aktivitas Membaca (16 Minggu Terakhir)</h4>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#7d6b56]">
            <span>Kurang</span>
            <div className="w-3 h-3 rounded-xs bg-[#e8dfcf]" />
            <div className="w-3 h-3 rounded-xs bg-amber-300" />
            <div className="w-3 h-3 rounded-xs bg-amber-500" />
            <div className="w-3 h-3 rounded-xs bg-amber-700" />
            <span>Aktif</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="grid grid-rows-7 grid-flow-col gap-1.5 w-max">
            {days.map((d, idx) => (
              <div
                key={idx}
                title={`${d.dateStr}: ${d.count} aktivitas`}
                className={`w-3.5 h-3.5 rounded-xs transition-transform hover:scale-125 cursor-pointer ${getColor(d.count)}`}
              />
            ))}
          </div>
        </div>
        <p className="text-[11px] text-[#7d6b56] mt-3">
          Mencatat aktivitas peminjaman, pengembalian, ulasan buku, dan presensi perpustakaan harian.
        </p>
      </div>
    </div>
  );
};
