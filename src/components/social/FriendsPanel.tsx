import { Search, UserPlus, Check, X, MessageCircle, Users, UserMinus, Eye } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { calculateLevel } from "@/lib/firestore";
import { motion } from "framer-motion";
import type { useSocialFriends } from "@/hooks/social/useSocialFriends";
import type { useAuth } from "@/contexts/AuthContext";

type Props = Pick<ReturnType<typeof useSocialFriends>, "pendingRequests" | "handleRespond" | "friends" | "onlineStatuses"> &
  Pick<ReturnType<typeof useAuth>, "user"> &
{
  activeTab: "timeline" | "friends" | "find";
  openUserProfile: (userId: string) => void;
  setActiveTab: import("react").Dispatch<import("react").SetStateAction<"timeline" | "friends" | "find">>;
  navigate: import("react-router-dom").NavigateFunction;
  setUnfriendTarget: import("react").Dispatch<import("react").SetStateAction<{ id: string; name: string } | null>>;
};

export function FriendsPanel({
  activeTab,
  pendingRequests,
  openUserProfile,
  handleRespond,
  friends,
  setActiveTab,
  user,
  onlineStatuses,
  navigate,
  setUnfriendTarget,
}: Props) {
  return (
    <>
      {activeTab === "friends" && (
        <div className="space-y-5">
          {/* Pending Requests Banner */}
          {pendingRequests.length > 0 && (
            <div className="bg-[#fbf8f0] border border-[#dbd0ba] rounded-2xl p-4">
              <h3 className="text-xs font-bold text-[#4a3f35] mb-3 flex items-center gap-2">
                <UserPlus size={15} className="text-[#a67c52]" />
                <span>Permintaan Pertemanan ({pendingRequests.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="bg-[#fffcf5] border border-[#dbd0ba] rounded-xl p-3 flex items-center justify-between gap-3">
                    <div
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                      onClick={() => openUserProfile(req.fromUserId)}
                    >
                      <UserAvatar
                        src={req.fromUserPhoto}
                        name={req.fromUserName}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#4a3f35] truncate">{req.fromUserName}</p>
                        <p className="text-[10px] text-[#7d6b56]">Ingin berteman</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRespond(req.id, "accepted")}
                        className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition-colors"
                        title="Terima"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => handleRespond(req.id, "declined")}
                        className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-bold transition-colors"
                        title="Tolak"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends Grid */}
          <div>
            <h3 className="text-xs font-bold text-[#4a3f35] mb-3 flex items-center gap-2">
              <Users size={15} className="text-[#a67c52]" />
              <span>Daftar Sahabat Baca ({friends.length})</span>
            </h3>

            {friends.length === 0 ? (
              <div className="bg-[#fffcf5] border border-[#dbd0ba] rounded-2xl p-8 text-center space-y-2">
                <Users size={32} className="mx-auto text-[#a67c52] opacity-60" />
                <h3 className="text-sm font-bold text-[#4a3f35]">Belum Ada Sahabat Baca</h3>
                <p className="text-xs text-[#7d6b56] max-w-sm mx-auto">
                  Cari teman sekelas atau sesama pecinta buku untuk berbagi rekomendasi dan memantau linimasa bersama.
                </p>
                <button
                  onClick={() => setActiveTab("find")}
                  className="mt-2 px-4 py-2 bg-[#a67c52] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#8d6e4c] transition-colors"
                >
                  <Search size={14} /> Cari Teman Sekarang
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {friends.map((f) => {
                  const friendId = f.friendId || (f.fromUserId === user?.uid ? f.toUserId : f.fromUserId);
                  const friendName = f.friendName || (f.fromUserId === user?.uid ? f.toUserName : f.fromUserName) || "Teman";
                  const friendPhoto = f.friendPhoto || "";
                  const friendBadge = f.friendBadge ?? (f.fromUserId === user?.uid ? f.toDisplayBadge : f.fromDisplayBadge);
                  const friendPoints = f.friendPoints ?? (f.fromUserId === user?.uid ? f.toTotalPoints : f.fromTotalPoints);
                  const isOnline = onlineStatuses[friendId] || false;
                  const levelInfo = friendPoints ? calculateLevel(friendPoints) : null;

                  return (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#fffcf5] border border-[#dbd0ba] rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-[#a67c52]/40 transition-colors"
                    >
                      <div
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                        onClick={() => openUserProfile(friendId)}
                      >
                        <div className="relative flex-shrink-0">
                          <UserAvatar
                            src={friendPhoto}
                            name={friendName || "Teman"}
                            size="md"
                            showBadge={!!friendBadge}
                            badge={friendBadge}
                          />
                          {/* Online Dot Indicator */}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#fffcf5] ${isOnline ? "bg-emerald-500" : "bg-gray-300"
                              }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-[#4a3f35] truncate">{friendName || "Teman"}</p>
                            {levelInfo && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-[#a67c52] text-white font-bold rounded-full">
                                Lv.{levelInfo.level}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#7d6b56] mt-0.5">
                            {isOnline ? "Online" : "Offline"}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">

                        {/* Detail Profile Modal */}
                        <button
                          onClick={() => openUserProfile(friendId)}
                          className="p-1.5 bg-[#ece5d8] hover:bg-[#dbd0ba] text-[#4a3f35] rounded-lg text-xs font-bold transition-colors"
                          title="Lihat Detail Profil Lengkap"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Chat Button */}
                        <button
                          onClick={() => navigate(`/chat/${friendId}`)}
                          className="p-1.5 bg-[#a67c52] hover:bg-[#8d6e4c] text-white rounded-lg text-xs font-bold transition-colors"
                          title="Kirim Pesan"
                        >
                          <MessageCircle size={14} />
                        </button>

                        {/* Direct Unfriend Button */}
                        <button
                          onClick={() => setUnfriendTarget({ id: friendId, name: friendName || "Teman" })}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors"
                          title="Hapus Pertemanan"
                        >
                          <UserMinus size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
