import { PostComposer } from "./PostComposer";
import { CommunityPostCard } from "./CommunityPostCard";

import { BookmarkCheck, Quote, HelpCircle, Plus, Sparkles } from "lucide-react";

import type { useSocialComposer } from "@/hooks/social/useSocialComposer";
import type { useAuth } from "@/contexts/AuthContext";
import type { useSocialFeed } from "@/hooks/social/useSocialFeed";
import type { useSocialReplies } from "@/hooks/social/useSocialReplies";

export type CommunityTimelineProps =
  ReturnType<typeof useSocialComposer> &
  ReturnType<typeof useSocialFeed> &
  ReturnType<typeof useSocialReplies> &
  Pick<ReturnType<typeof useAuth>, "profile" | "user"> & {
    activeTab: "timeline" | "friends" | "find";
    openUserProfile: (userId: string) => void;
    formatTimeAgo: (timestamp?: number) => string;
    navigate: import("react-router-dom").NavigateFunction;
  };

export function CommunityTimeline(props: CommunityTimelineProps) {
  const { activeTab, setComposerOpen, timelineFilter, setTimelineFilter, postsLoading, posts } = props;
  return (
    <>
      {activeTab === "timeline" && (
        <div className="space-y-5">
          {/* COMPOSER BOX ("Bagikan ke Komunitas") */}
          <PostComposer {...props} />

          {/* TIMELINE SUB-FILTER PILLS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { id: "all" as const, label: "Semua Post", icon: Sparkles },
              { id: "quotes" as const, label: "Kutipan Buku", icon: Quote },
              { id: "asks" as const, label: "Papan Tanya Rekomendasi", icon: HelpCircle },
              { id: "saved" as const, label: "Kutipan Tersimpan", icon: BookmarkCheck },
            ].map((f) => {
              const Icon = f.icon;
              const isSelected = timelineFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setTimelineFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${isSelected
                      ? "bg-[#4a3f35] text-white shadow-xs"
                      : "bg-[#fffcf5] text-[#7d6b56] border border-[#dbd0ba] hover:bg-[#fbf7ee]"
                    }`}
                >
                  <Icon size={13} className={isSelected ? "text-amber-200" : "text-[#a67c52]"} />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* FEED LIST */}
          {postsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-[#fffcf5] border border-[#dbd0ba] rounded-2xl p-5 animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#ece5d8]" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 bg-[#ece5d8] rounded w-1/4" />
                      <div className="h-3 bg-[#f5f1e6] rounded w-1/6" />
                    </div>
                  </div>
                  <div className="h-12 bg-[#ece5d8]/60 rounded-xl" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-[#fffcf5] border border-[#dbd0ba] rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#ece5d8] flex items-center justify-center mx-auto text-[#a67c52]">
                {timelineFilter === "saved" ? <BookmarkCheck size={24} /> : <Quote size={24} />}
              </div>
              <h3 className="text-sm font-bold text-[#4a3f35]">
                {timelineFilter === "saved" ? "Belum Ada Kutipan Tersimpan" : "Belum Ada Postingan"}
              </h3>
              <p className="text-xs text-[#7d6b56] max-w-sm mx-auto leading-relaxed">
                {timelineFilter === "saved"
                  ? "Kutipan favorit yang kamu tandai 'Simpan' akan terkumpul rapi di sini untuk dibaca kapan saja."
                  : "Jadilah yang pertama membagikan kutipan buku atau mengajukan pertanyaan rekomendasi!"}
              </p>
              {timelineFilter !== "saved" && (
                <button
                  onClick={() => setComposerOpen(true)}
                  className="px-4 py-2 bg-[#a67c52] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#8d6e4c] transition-colors"
                >
                  <Plus size={14} /> Buat Postingan Baru
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => <CommunityPostCard key={post.id} post={post} {...props} />)}
            </div>
          )}
        </div>
      )}
    </>
  );
}
