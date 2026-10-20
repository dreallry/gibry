import { ref, get, set, push, update, remove, runTransaction, serverTimestamp, query, orderByChild, equalTo } from "firebase/database";
import { db } from "./firebase";
import type { Discussion } from "./types/reading";
import type { CommunityPost, CommunityReply } from "./types/social";
import { getUserProfile } from './profiles';

// ===== Community Posts & Public Quotes (Reddit/Threads/Goodreads Feed) =====

export async function getCommunityPosts(
  filter: "all" | "quotes" | "asks" | "saved" = "all",
  currentUserId?: string
): Promise<CommunityPost[]> {

  const [snap, replies] = await Promise.all([get(ref(db, "komunitas_post")), get(ref(db, "komunitas_balasan"))]);
  if (!snap.exists()) return [];

  const all = snap.val();
  const posts: CommunityPost[] = Object.entries(all).map(([id, val]) => ({
    id,
    ...(val as any),
    repliesCount: Object.keys(replies.val()?.[id] || {}).length,
    likesCount: Object.values((val as any).likedBy || {}).filter(Boolean).length,
    savedCount: Object.values((val as any).savedBy || {}).filter(Boolean).length,
  }));

  // Sort newest first
  posts.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

  if (filter === "quotes") {
    return posts.filter((p) => p.type === "quote");
  }
  if (filter === "asks") {
    return posts.filter((p) => p.type === "ask");
  }
  if (filter === "saved" && currentUserId) {
    return posts.filter((p) => p.savedBy && p.savedBy[currentUserId]);
  }

  return posts;
}

export async function createCommunityPost(
  postData: Omit<CommunityPost, "id" | "createdAt" | "likesCount" | "savedCount" | "repliesCount">
): Promise<string> {
  const newRef = push(ref(db, "komunitas_post"));

  // Clean undefined properties so Firebase RTDB doesn't error out
  const cleanedData: Record<string, any> = {};
  for (const [key, val] of Object.entries(postData)) {
    if (val !== undefined) {
      cleanedData[key] = val;
    }
  }

  const newPost = {
    ...cleanedData,
    likesCount: 0,
    savedCount: 0,
    repliesCount: 0,
    createdAt: Date.now(),
  };
  await set(newRef, newPost);
  return newRef.key!;
}

export async function toggleLikeCommunityPost(postId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  const liked = await runTransaction(ref(db, `komunitas_post/${postId}/likedBy/${userId}`), value => value ? null : true);
  const all = await get(ref(db, `komunitas_post/${postId}/likedBy`));
  return { liked: liked.snapshot.val() === true, count: Object.values(all.val() || {}).filter(Boolean).length };
}

export async function toggleSaveCommunityPost(postId: string, userId: string): Promise<{ saved: boolean; count: number }> {
  const saved = await runTransaction(ref(db, `komunitas_post/${postId}/savedBy/${userId}`), value => value ? null : true);
  const isSaved = saved.snapshot.val() === true;
  await update(ref(db, `user_saved_quotes/${userId}`), { [postId]: isSaved ? true : null });
  const all = await get(ref(db, `komunitas_post/${postId}/savedBy`));
  return { saved: isSaved, count: Object.values(all.val() || {}).filter(Boolean).length };
}

export async function getCommunityReplies(postId: string): Promise<CommunityReply[]> {
  const snap = await get(ref(db, `komunitas_balasan/${postId}`));
  if (!snap.exists()) return [];

  const all = snap.val();
  return Object.entries(all)
    .map(([id, val]) => ({ id, ...(val as any) } as CommunityReply))
    .sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
}

export async function addCommunityReply(
  postId: string,
  replyData: Omit<CommunityReply, "id" | "createdAt">
): Promise<string> {
  const newRef = push(ref(db, `komunitas_balasan/${postId}`));

  const cleanedData: Record<string, any> = {};
  for (const [key, val] of Object.entries(replyData)) {
    if (val !== undefined) {
      cleanedData[key] = val;
    }
  }

  const reply = {
    ...cleanedData,
    createdAt: Date.now(),
  };
  await set(newRef, reply);

  return newRef.key!;
}

export async function getUserCommunityPosts(userId: string): Promise<CommunityPost[]> {
  const snap = await get(ref(db, "komunitas_post"));
  if (!snap.exists()) return [];

  const all = snap.val();
  return Object.entries(all)
    .filter(([, val]: [string, any]) => val.userId === userId)
    .map(([id, val]) => ({ id, ...(val as any) } as CommunityPost))
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
}

// ===== Book Discussions =====

export async function postDiscussion(data: { bookId: string; userId: string; text: string; parentId?: string | null }): Promise<string> {
  if (!data.text || !data.text.trim()) throw new Error("Pesan diskusi tidak boleh kosong");
  if (data.text.length > 3000) throw new Error("Pesan diskusi maksimal 3000 karakter");

  const newRef = push(ref(db, "book_discussions"));
  const userProfile = await getUserProfile(data.userId);
  await set(newRef, {
    ...data,
    text: data.text.trim(),
    parentId: data.parentId || null,
    likes: 0,
    likedBy: [],
    userName: userProfile?.nama || "User",
    userPhoto: userProfile?.photoURL || "",
    createdAt: serverTimestamp(),
  });
  return newRef.key!;
}

export async function getBookDiscussions(bookId: string): Promise<Discussion[]> {
  const snap = await get(query(ref(db, "book_discussions"), orderByChild('bookId'), equalTo(bookId)));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => (v as any).bookId === bookId)
    .map(([id, v]: [string, any]) => {
      const likedBy = Array.isArray(v.likedBy) ? v.likedBy : Object.entries(v.likedBy || {}).filter(([, liked]) => liked === true).map(([uid]) => uid);
      return { ...v, id, likedBy, likes: likedBy.length } as Discussion;
    })
    .sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
}

export async function toggleDiscussionLike(discussionId: string, userId: string): Promise<void> {
  await runTransaction(ref(db, `book_discussions/${discussionId}/likedBy/${userId}`), liked => liked ? null : true);
}

export async function deleteDiscussion(discussionId: string, currentUserId?: string): Promise<void> {
  if (currentUserId) {
    const snap = await get(ref(db, `book_discussions/${discussionId}`));
    if (snap.exists() && snap.val().userId !== currentUserId) {
      const userProfile = await getUserProfile(currentUserId);
      if (userProfile?.role !== "admin") {
        throw new Error("Anda tidak memiliki izin untuk menghapus diskusi ini");
      }
    }
  }
  await remove(ref(db, `book_discussions/${discussionId}`));
}

// ===== Community Post Deletion =====
export async function deleteCommunityPost(postId: string, currentUserId: string): Promise<void> {
  const postRef = ref(db, `komunitas_post/${postId}`);
  const snap = await get(postRef);
  if (!snap.exists()) return;
  const post = snap.val();
  const profile = await getUserProfile(currentUserId);
  const isAdmin = profile?.role === "admin" || profile?.role === "librarian";
  if (post.userId !== currentUserId && !isAdmin) {
    throw new Error("Tidak memiliki izin untuk menghapus postingan ini");
  }
  await update(ref(db), { [`komunitas_post/${postId}`]: null, [`komunitas_balasan/${postId}`]: null });
}

export async function deleteCommunityReply(
  postId: string,
  replyId: string,
  currentUserId: string
): Promise<void> {
  const replyRef = ref(db, `komunitas_balasan/${postId}/${replyId}`);
  const snap = await get(replyRef);
  if (!snap.exists()) return;
  const reply = snap.val();
  const profile = await getUserProfile(currentUserId);
  const isAdmin = profile?.role === "admin" || profile?.role === "librarian";
  if (reply.userId !== currentUserId && !isAdmin) {
    throw new Error("Tidak memiliki izin untuk menghapus balasan ini");
  }
  await remove(replyRef);
}
