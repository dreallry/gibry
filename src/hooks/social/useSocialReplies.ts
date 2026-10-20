import { getErrorMessage } from "@/lib/errors";
import { useState, useCallback } from "react";
import { getCommunityReplies, addCommunityReply, getBooks, deleteCommunityReply, type CommunityReply, type Book } from "@/lib/firestore";
import { checkContent } from "@/lib/wordFilter";
import { checkRateLimit, recordRateLimitAction } from "@/lib/rateLimiter";
import type { useSocialFeed } from './useSocialFeed';
import type { useAuth } from "@/contexts/AuthContext";
import type { useToast } from "@/components/Toast";

export function useSocialReplies({ user, profile, toast, setPosts }: {
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof useAuth>["profile"];
  toast: ReturnType<typeof useToast>["toast"];
  setPosts: ReturnType<typeof useSocialFeed>["setPosts"];
}) {
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);

  // Post Replies State
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const [repliesData, setRepliesData] = useState<Record<string, CommunityReply[]>>({});

  const [replyInput, setReplyInput] = useState<Record<string, string>>({});

  const [replyLinkedBook, setReplyLinkedBook] = useState<Record<string, Book | null>>({});

  const [showBookPicker, setShowBookPicker] = useState<Record<string, boolean>>({});

  const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({});

  const loadBooks = useCallback(async () => {
    try {
      const books = await getBooks();
      setAvailableBooks(books);
    } catch (err) {
      console.error("Error loading books:", err);
    }
  }, []);

  async function toggleReplies(postId: string) {
    const isCurrentlyExpanded = !!expandedReplies[postId];
    setExpandedReplies((prev) => ({ ...prev, [postId]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded && !repliesData[postId]) {
      try {
        const reps = await getCommunityReplies(postId);
        setRepliesData((prev) => ({ ...prev, [postId]: reps }));
      } catch (err) {
        console.error("Error loading replies:", err);
      }
    }
  }

  async function handleAddReply(postId: string) {
    if (!user || !profile) return;
    const text = replyInput[postId]?.trim();
    if (!text) {
      toast("error", "Harap isi teks balasan.");
      return;
    }

    // Rate limit
    const rl = checkRateLimit(`community_reply_${user.uid}`, 10, 60000);
    if (!rl.allowed) {
      toast("error", `Terlalu cepat mengirim balasan. Tunggu ${rl.waitSeconds} detik.`);
      return;
    }

    // Word filter
    const wordCheck = checkContent(text);
    if (!wordCheck.clean) {
      toast("error", "Balasan Anda mengandung kata yang tidak pantas.");
      return;
    }
    recordRateLimitAction(`community_reply_${user.uid}`, 60000);

    setSubmittingReply((prev) => ({ ...prev, [postId]: true }));
    try {
      const linked = replyLinkedBook[postId];
      await addCommunityReply(postId, {
        postId,
        userId: user.uid,
        userName: profile.nama,
        userPhoto: profile.photoURL,
        userRole: profile.role || "user",
        text,
        linkedBook: linked
          ? {
            id: linked.id,
            judul: linked.judul,
            penulis: linked.penulis,
            cover: linked.coverUrl || linked.cover,
          }
          : undefined,
      });

      // Reload replies for this post
      const updatedReps = await getCommunityReplies(postId);
      setRepliesData((prev) => ({ ...prev, [postId]: updatedReps }));

      // Update post reply count in feed
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, repliesCount: (p.repliesCount || 0) + 1 } : p))
      );

      // Clear input
      setReplyInput((prev) => ({ ...prev, [postId]: "" }));
      setReplyLinkedBook((prev) => ({ ...prev, [postId]: null }));
      setShowBookPicker((prev) => ({ ...prev, [postId]: false }));
      toast("success", "Balasan rekomendasi berhasil dikirim!");
    } catch (err) {
      toast("error", "Gagal mengirim balasan: " + getErrorMessage(err));
    } finally {
      setSubmittingReply((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function handleDeleteReply(postId: string, replyId: string) {
    if (!user) return;
    try {
      await deleteCommunityReply(postId, replyId, user.uid);
      setRepliesData((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((r) => r.id !== replyId),
      }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, repliesCount: Math.max(0, (p.repliesCount || 0) - 1) } : p))
      );
      toast("info", "Balasan telah dihapus.");
    } catch (err) {
      toast("error", getErrorMessage(err, "Gagal menghapus balasan."));
    }
  }

  return {
    availableBooks,
    expandedReplies,
    repliesData,
    replyInput,
    setReplyInput,
    replyLinkedBook,
    setReplyLinkedBook,
    showBookPicker,
    setShowBookPicker,
    submittingReply,
    loadBooks,
    toggleReplies,
    handleAddReply,
    handleDeleteReply,
  };
}
