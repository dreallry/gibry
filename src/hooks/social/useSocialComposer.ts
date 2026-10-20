import { getErrorMessage } from "@/lib/errors";
import { useState } from "react";
import { createCommunityPost } from "@/lib/firestore";
import { checkContent } from "@/lib/wordFilter";
import { checkRateLimit, recordRateLimitAction } from "@/lib/rateLimiter";
import { calculateLevel } from "@/lib/firestore";
import type { useSocialFeed } from './useSocialFeed';
import type { useAuth } from "@/contexts/AuthContext";
import type { useToast } from "@/components/Toast";

export function useSocialComposer({ user, profile, toast, loadCommunityPosts }: {
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof useAuth>["profile"];
  toast: ReturnType<typeof useToast>["toast"];
  loadCommunityPosts: ReturnType<typeof useSocialFeed>["loadCommunityPosts"];
}) {

  // Composer State
  const [composerType, setComposerType] = useState<"quote" | "ask">("quote");

  const [composerOpen, setComposerOpen] = useState(false);

  const [submittingPost, setSubmittingPost] = useState(false);

  const [quoteContent, setQuoteContent] = useState("");

  const [quoteBookTitle, setQuoteBookTitle] = useState("");

  const [quoteBookAuthor, setQuoteBookAuthor] = useState("");

  const [quotePageNumber, setQuotePageNumber] = useState<string>("");

  const [quoteReflection, setQuoteReflection] = useState("");

  const [askContent, setAskContent] = useState("");

  const [askTags, setAskTags] = useState("");

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;

    if (composerType === "quote" && !quoteContent.trim()) {
      toast("error", "Harap isi teks kutipan buku.");
      return;
    }
    if (composerType === "ask" && !askContent.trim()) {
      toast("error", "Harap isi pertanyaan rekomendasi buku.");
      return;
    }

    // Rate limit
    const rl = checkRateLimit(`community_post_${user.uid}`, 5, 60000);
    if (!rl.allowed) {
      toast("error", `Terlalu cepat membuat postingan. Tunggu ${rl.waitSeconds} detik.`);
      return;
    }

    // Word filter
    const checkText = composerType === "quote" ? `${quoteContent} ${quoteReflection}` : askContent;
    const wordCheck = checkContent(checkText);
    if (!wordCheck.clean) {
      toast("error", "Postingan Anda mengandung kata yang tidak pantas.");
      return;
    }
    recordRateLimitAction(`community_post_${user.uid}`, 60000);

    setSubmittingPost(true);
    try {
      const userLevel = profile.totalPoints ? calculateLevel(profile.totalPoints).level : 1;

      if (composerType === "quote") {
        await createCommunityPost({
          type: "quote",
          userId: user.uid,
          userName: profile.nama,
          userUsername: profile.username || "pembaca",
          userPhoto: profile.photoURL,
          userDisplayBadge: profile.displayBadge || null,
          userLevel,
          content: quoteContent.trim(),
          bookTitle: quoteBookTitle.trim() || undefined,
          bookAuthor: quoteBookAuthor.trim() || undefined,
          pageNumber: quotePageNumber ? parseInt(quotePageNumber) : undefined,
          reflection: quoteReflection.trim() || undefined,
        });
        toast("success", "Kutipan buku berhasil dibagikan ke linimasa!");
      } else {
        const parsedTags = askTags
          .split(",")
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean);

        await createCommunityPost({
          type: "ask",
          userId: user.uid,
          userName: profile.nama,
          userUsername: profile.username || "pembaca",
          userPhoto: profile.photoURL,
          userDisplayBadge: profile.displayBadge || null,
          userLevel,
          content: askContent.trim(),
          topicTags: parsedTags.length > 0 ? parsedTags : ["rekomendasi"],
        });
        toast("success", "Pertanyaan rekomendasi berhasil diajukan!");
      }

      // Reset form
      setQuoteContent("");
      setQuoteBookTitle("");
      setQuoteBookAuthor("");
      setQuotePageNumber("");
      setQuoteReflection("");
      setAskContent("");
      setAskTags("");
      setComposerOpen(false);

      // Refresh posts
      await loadCommunityPosts();
    } catch (err) {
      toast("error", "Gagal membagikan postingan: " + getErrorMessage(err));
    } finally {
      setSubmittingPost(false);
    }
  }

  return {
    composerType,
    setComposerType,
    composerOpen,
    setComposerOpen,
    submittingPost,
    quoteContent,
    setQuoteContent,
    quoteBookTitle,
    setQuoteBookTitle,
    quoteBookAuthor,
    setQuoteBookAuthor,
    quotePageNumber,
    setQuotePageNumber,
    quoteReflection,
    setQuoteReflection,
    askContent,
    setAskContent,
    askTags,
    setAskTags,
    handleCreatePost,
  };
}
