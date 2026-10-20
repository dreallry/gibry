import { getErrorMessage } from "@/lib/errors";
import { useState, useEffect, useCallback } from "react";
import {
  getCommunityPosts,
  toggleLikeCommunityPost,
  toggleSaveCommunityPost,
  deleteCommunityPost,
  type CommunityPost,
} from "@/lib/firestore";
import type { useAuth } from "@/contexts/AuthContext";
import type { useToast } from "@/components/Toast";

export function useSocialFeed({ user, toast }: {
  user: ReturnType<typeof useAuth>["user"];
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [timelineFilter, setTimelineFilter] = useState<"all" | "quotes" | "asks" | "saved">("all");

  // Community Posts & Catalog
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  const [postsLoading, setPostsLoading] = useState(true);

  // Load Community Posts whenever timelineFilter changes
  const loadCommunityPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const data = await getCommunityPosts(timelineFilter, user?.uid);
      setPosts(data);
    } catch (err) {
      console.error("Error loading community posts:", err);
    } finally {
      setPostsLoading(false);
    }
  }, [timelineFilter, user]);

  useEffect(() => {
    if (user) {
      loadCommunityPosts();
    }
  }, [user, loadCommunityPosts]);

  async function handleToggleLike(postId: string) {
    if (!user) return;
    try {
      const res = await toggleLikeCommunityPost(postId, user.uid);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const updatedLikedBy = { ...(p.likedBy || {}) };
          if (res.liked) {
            updatedLikedBy[user.uid] = true;
          } else {
            delete updatedLikedBy[user.uid];
          }
          return {
            ...p,
            likesCount: res.count,
            likedBy: updatedLikedBy,
          };
        })
      );
    } catch (err) {
      toast("error", getErrorMessage(err));
    }
  }

  async function handleToggleSave(postId: string) {
    if (!user) return;
    try {
      const res = await toggleSaveCommunityPost(postId, user.uid);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const updatedSavedBy = { ...(p.savedBy || {}) };
          if (res.saved) {
            updatedSavedBy[user.uid] = true;
          } else {
            delete updatedSavedBy[user.uid];
          }
          return {
            ...p,
            savedCount: res.count,
            savedBy: updatedSavedBy,
          };
        })
      );
      toast("success", res.saved ? "Kutipan disimpan ke koleksi!" : "Kutipan dihapus dari simpanan.");
    } catch (err) {
      toast("error", getErrorMessage(err));
    }
  }

  function handleCopyQuote(post: CommunityPost) {
    const text = `"${post.content}"\n— ${post.bookTitle || "Buku"}${post.pageNumber ? ` (Hal. ${post.pageNumber})` : ""}${post.bookAuthor ? ` karya ${post.bookAuthor}` : ""}\n[Dibagikan di Perpustakaan Gibry]`;
    navigator.clipboard.writeText(text);
    toast("success", "Kutipan disalin ke clipboard!");
  }

  async function handleDeletePost(postId: string) {
    if (!user) return;
    try {
      await deleteCommunityPost(postId, user.uid);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast("info", "Postingan telah dihapus.");
    } catch (err) {
      toast("error", getErrorMessage(err, "Gagal menghapus postingan."));
    }
  }

  return {
    timelineFilter,
    setTimelineFilter,
    posts,
    setPosts,
    postsLoading,
    loadCommunityPosts,
    handleToggleLike,
    handleToggleSave,
    handleCopyQuote,
    handleDeletePost,
  };
}
