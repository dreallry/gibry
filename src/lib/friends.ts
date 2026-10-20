import { addNotification } from './notifications';
import { ref, get, set, push, update, serverTimestamp } from "firebase/database";
import { db } from "./firebase";
import type { FriendRequest, Friend, Activity } from "./types/social";

// Send friend request
export async function sendFriendRequest(fromUserId: string, fromUserName: string, fromUserPhoto: string | undefined, toUserId: string): Promise<void> {
  // Check if already friends or request pending
  const existing = await get(ref(db, "pertemanan"));
  if (existing.exists()) {
    for (const val of Object.values(existing.val())) {
      const req = val as any;
      if (
        (req.fromUserId === fromUserId && req.toUserId === toUserId) ||
        (req.fromUserId === toUserId && req.toUserId === fromUserId)
      ) {
        if (req.status === "accepted") throw new Error("Sudah berteman");
        if (req.status === "pending") throw new Error("Permintaan sudah dikirim");
      }
    }
  }

  const newRef = push(ref(db, "pertemanan"));
  await set(newRef, {
    fromUserId,
    fromUserName,
    fromUserPhoto: fromUserPhoto || "",
    toUserId,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  // Send notification to recipient
  await addNotification(toUserId, {
    type: "friend_request",
    title: "Permintaan Pertemanan",
    body: `${fromUserName} ingin berteman dengan Anda.`,
    link: "/social",
  });
}

// Accept/decline friend request
export async function respondFriendRequest(requestId: string, status: "accepted" | "declined"): Promise<void> {
  await update(ref(db, `pertemanan/${requestId}`), { status });
}

// Get friends list with real-time user profile information
export async function getFriends(userId: string): Promise<Friend[]> {
  const snap = await get(ref(db, "pertemanan"));
  if (!snap.exists()) return [];
  const all = snap.val();
  const friendsList = Object.entries(all)
    .filter(([, v]: [string, any]) => {
      const req = v as any;
      return req.status === "accepted" && (req.fromUserId === userId || req.toUserId === userId);
    })
    .map(([id, v]: [string, any]) => ({ id, ...v } as FriendRequest));

  // Fetch real-time user profiles from `anggota` node so names and photos are ALWAYS fresh
  const anggotaSnap = await get(ref(db, "public_profiles"));
  const anggotaMap: Record<string, any> = anggotaSnap.exists() ? anggotaSnap.val() : {};

  return friendsList.map((f: any) => {
    const isFromMe = f.fromUserId === userId;
    const friendId = isFromMe ? f.toUserId : f.fromUserId;
    const friendProfile = anggotaMap[friendId] || {};
    const myProfile = anggotaMap[userId] || {};

    const friendName = friendProfile.nama || (isFromMe ? f.toUserName : f.fromUserName) || "Teman";
    const friendPhoto = friendProfile.photoURL || (isFromMe ? f.toUserPhoto : f.fromUserPhoto) || "";
    const friendBadge = friendProfile.displayBadge || null;
    const friendPoints = friendProfile.totalPoints || 0;

    const myName = myProfile.nama || (isFromMe ? f.fromUserName : f.toUserName) || "Pengguna";
    const myPhoto = myProfile.photoURL || (isFromMe ? f.fromUserPhoto : f.toUserPhoto) || "";

    return {
      ...f,
      fromUserName: isFromMe ? myName : friendName,
      fromUserPhoto: isFromMe ? myPhoto : friendPhoto,
      fromDisplayBadge: isFromMe ? myProfile.displayBadge : friendBadge,
      fromTotalPoints: isFromMe ? myProfile.totalPoints : friendPoints,
      toUserName: isFromMe ? friendName : myName,
      toUserPhoto: isFromMe ? friendPhoto : myPhoto,
      toDisplayBadge: isFromMe ? friendBadge : myProfile.displayBadge,
      toTotalPoints: isFromMe ? friendPoints : myProfile.totalPoints,
      friendId,
      friendName,
      friendPhoto,
      friendBadge,
      friendPoints,
    };
  });
}

// Remove friend (Unfriend)
export async function removeFriend(userId: string, friendId: string): Promise<void> {
  const snap = await get(ref(db, "pertemanan"));
  if (!snap.exists()) return;
  const all = snap.val();
  const updates: Record<string, null> = {};
  for (const [id, v] of Object.entries(all)) {
    const req = v as any;
    if (
      (req.fromUserId === userId && req.toUserId === friendId) ||
      (req.fromUserId === friendId && req.toUserId === userId)
    ) {
      updates[`pertemanan/${id}`] = null;
    }
  }
  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }
}

// Send poke/wave gimmick
export async function sendPoke(fromUserId: string, fromUserName: string, toUserId: string): Promise<void> {
  await addNotification(toUserId, {
    type: "message",
    title: `👋 ${fromUserName} Mencolek Kamu!`,
    body: `${fromUserName} mengajakmu diskusi & baca buku bareng hari ini! ✨`,
    link: `/chat/${fromUserId}`,
  });
}

// Get pending friend requests with real-time profile info
export async function getPendingFriendRequests(userId: string): Promise<FriendRequest[]> {
  const snap = await get(ref(db, "pertemanan"));
  if (!snap.exists()) return [];
  const all = snap.val();
  const pending = Object.entries(all)
    .filter(([, v]: [string, any]) => {
      const req = v as any;
      return req.status === "pending" && req.toUserId === userId;
    })
    .map(([id, v]: [string, any]) => ({ id, ...v } as FriendRequest));

  const anggotaSnap = await get(ref(db, "public_profiles"));
  const anggotaMap: Record<string, any> = anggotaSnap.exists() ? anggotaSnap.val() : {};

  return pending.map((f: any) => {
    const senderProfile = anggotaMap[f.fromUserId] || {};
    return {
      ...f,
      fromUserName: senderProfile.nama || f.fromUserName || "Pengguna",
      fromUserPhoto: senderProfile.photoURL || f.fromUserPhoto || "",
    };
  });
}

// Add activity
export async function addActivity(userId: string, userName: string, userPhoto: string | undefined, type: Activity["type"], data: { bookTitle?: string; rating?: number; comment?: string }): Promise<void> {
  const newRef = push(ref(db, "aktivitas"));
  await set(newRef, {
    userId,
    userName,
    userPhoto: userPhoto || "",
    type,
    ...data,
    createdAt: serverTimestamp(),
  });
}

// Get friends' activities (feed)
export async function getFriendsFeed(userId: string): Promise<Activity[]> {
  const friends = await getFriends(userId);
  const friendIds = new Set<string>();
  friendIds.add(userId); // Include own activities
  friends.forEach(f => {
    friendIds.add(f.fromUserId);
    friendIds.add(f.toUserId);
  });

  const snap = await get(ref(db, "aktivitas"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => friendIds.has((v as any).userId))
    .map(([id, v]: [string, any]) => ({ id, ...v } as Activity))
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
    .slice(0, 50);
}
