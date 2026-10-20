import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveChallenges } from "@/lib/firestore";
import { Trophy, ArrowRight, Target } from "lucide-react";

export const QuestWidget: React.FC = () => {
  const { user } = useAuth();
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    if (user) {
      getActiveChallenges().then((challenges) => {
        setActiveCount(challenges.length);
      }).catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="bg-[#304D42] text-[#FFF9EF] rounded-3xl p-5 sm:p-6 border border-[#304D42] shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#DCE2CD]/20 border border-[#DCE2CD]/30 text-[#DCE2CD] flex items-center justify-center shrink-0">
            <Trophy size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#DCE2CD]/20 text-[#DCE2CD] border border-[#DCE2CD]/30 flex items-center gap-1 font-semibold tracking-wider">
                <Target size={11} className="text-[#E8EBDF]" />
                MISI BACA MINGGUAN
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-bold font-editorial text-[#FFF9EF] mt-1">
              Tantangan & Misi Membaca
            </h4>
            <p className="text-xs text-[#DCE2CD]/90 font-space mt-0.5">
              {activeCount > 0 ? `${activeCount} misi aktif siap kamu selesaikan` : "Pantau perkembangan membaca melalui misi yang tersedia."}
            </p>
          </div>
        </div>

        <Link
          to="/events"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#AD6549] hover:bg-[#96553c] text-[#FFF9EF] text-xs font-bold font-space transition-all shadow-xs shrink-0 active:scale-95"
        >
          <span>Buka Daftar Misi</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
};
