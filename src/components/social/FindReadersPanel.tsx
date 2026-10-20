import { Search, UserPlus } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { calculateLevel } from "@/lib/firestore";
import type { useSocialFriends } from "@/hooks/social/useSocialFriends";

type Props = Pick<
  ReturnType<typeof useSocialFriends>,
  | "searchQuery"
  | "handleSearch"
  | "searching"
  | "searchResults"
  | "handleSendRequest"
> &
{
  activeTab: "timeline" | "friends" | "find";
  openUserProfile: (userId: string) => void;
};

export function FindReadersPanel({
  activeTab,
  searchQuery,
  handleSearch,
  searching,
  searchResults,
  openUserProfile,
  handleSendRequest,
}: Props) {
  return (
    <>
      {activeTab === "find" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7d6b56]" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#fffcf5] border border-[#dbd0ba] rounded-xl text-xs font-semibold text-[#4a3f35] placeholder:text-[#7d6b56]/60 focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30 transition-all"
              placeholder="Cari nama atau username teman / sesama pembaca..."
            />
          </div>

          {searching ? (
            <div className="py-12 text-center text-[#7d6b56] text-xs font-medium animate-pulse">
              Mencari pembaca di seluruh perpustakaan...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="bg-[#fffcf5] border border-[#dbd0ba] rounded-2xl p-8 text-center space-y-2">
              <Search size={32} className="mx-auto text-[#a67c52] opacity-60" />
              <p className="text-xs text-[#7d6b56]">
                {searchQuery.length < 2
                  ? "Ketik minimal 2 karakter nama atau username untuk mencari teman."
                  : "Tidak ditemukan anggota dengan nama atau username tersebut."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {searchResults.map((u) => {
                const levelInfo = u.totalPoints ? calculateLevel(u.totalPoints) : null;
                return (
                  <div
                    key={u.uid}
                    className="bg-[#fffcf5] border border-[#dbd0ba] rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-[#a67c52]/40 transition-colors"
                  >
                    <div
                      className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                      onClick={() => openUserProfile(u.uid)}
                    >
                      <UserAvatar
                        src={u.photoURL}
                        name={u.nama}
                        size="md"
                        showBadge={!!u.displayBadge}
                        badge={u.displayBadge}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-[#4a3f35] truncate">{u.nama}</p>
                          {levelInfo && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-[#a67c52] text-white font-bold rounded-full">
                              Lv.{levelInfo.level}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#7d6b56]">@{u.username}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendRequest(u.uid)}
                      className="px-3 py-1.5 bg-[#a67c52] hover:bg-[#8d6e4c] text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors active:scale-95"
                    >
                      <UserPlus size={13} />
                      <span>Tambah</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
