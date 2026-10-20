import { ref, get, set, push, update, remove, serverTimestamp, onValue, limitToLast, query, orderByChild } from "firebase/database";
import { db } from "./firebase";
import type { Message } from "./types/social";
import { getFriends } from './friends';

// Helper: Chat room ID derived from sorted UIDs
export function getChatRoomId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

// Send message
export async function sendMessage(senderId: string, senderName: string, receiverId: string, text: string): Promise<void> {
  if (!text || !text.trim()) throw new Error("Pesan tidak boleh kosong");
  if (text.length > 500) throw new Error("Pesan maksimal 500 karakter");

  const chatRoomId = getChatRoomId(senderId, receiverId);
  const newRef = push(ref(db, `pesan/${chatRoomId}`));
  await set(newRef, {
    senderId,
    senderName,
    receiverId,
    text: text.trim(),
    read: false,
    createdAt: serverTimestamp(),
  });
}

// Soft delete message (pengirim menandai pesan dihapus)
export async function softDeleteMessage(userId1: string, userId2: string, messageId: string, currentUserId: string): Promise<void> {
  const chatRoomId = getChatRoomId(userId1, userId2);
  const msgRef = ref(db, `pesan/${chatRoomId}/${messageId}`);
  const snap = await get(msgRef);
  if (!snap.exists()) return;
  if (snap.val().senderId !== currentUserId) {
    throw new Error("Hanya pengirim yang dapat menghapus pesan");
  }
  await update(msgRef, {
    text: "Pesan ini telah dihapus",
    deleted: true,
    deletedAt: serverTimestamp(),
  });
}

// Get messages between two users
export async function getMessages(userId1: string, userId2: string): Promise<Message[]> {
  const chatRoomId = getChatRoomId(userId1, userId2);
  const snap = await get(ref(db, `pesan/${chatRoomId}`));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .map(([id, v]: [string, any]) => ({ id, ...v } as Message))
    .sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
}

// Get unread message count
export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const friends = await getFriends(userId);
    let count = 0;
    await Promise.all(
      friends.map(async (f) => {
        const friendId = f.fromUserId === userId ? f.toUserId : f.fromUserId;
        const chatRoomId = getChatRoomId(userId, friendId);
        const snap = await get(ref(db, `pesan/${chatRoomId}`));
        if (snap.exists()) {
          const msgs = Object.values(snap.val()) as any[];
          count += msgs.filter((m) => m.receiverId === userId && !m.read).length;
        }
      })
    );
    return count;
  } catch {
    return 0;
  }
}

// Mark messages as read
export async function markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
  const chatRoomId = getChatRoomId(senderId, receiverId);
  const snap = await get(ref(db, `pesan/${chatRoomId}`));
  if (!snap.exists()) return;
  const all = snap.val();
  const updates: Record<string, any> = {};
  for (const [key, val] of Object.entries(all)) {
    const msg = val as any;
    if (msg.senderId === senderId && !msg.read) {
      updates[`pesan/${chatRoomId}/${key}/read`] = true;
    }
  }
  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }
}

// ===== Realtime Features =====

// Realtime chat listener - listens to specific chatRoomId only
export function onMessagesChanged(userId1: string, userId2: string, callback: (messages: Message[]) => void): () => void {
  const room = query(ref(db, `pesan/${getChatRoomId(userId1, userId2)}`), orderByChild('createdAt'), limitToLast(100));
  return onValue(room, snapshot => callback(Object.entries(snapshot.val() || {})
    .map(([id, value]) => ({ id, ...(value as any) } as Message))
    .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))));
}

// Typing indicator
export async function setTypingStatus(userId: string, chatPartnerId: string, isTyping: boolean): Promise<void> {
  const typingRef = ref(db, `typing/${userId}/${chatPartnerId}`);
  if (isTyping) {
    await set(typingRef, true);
    // Auto-remove after 5 seconds
    setTimeout(async () => {
      try { await remove(typingRef); } catch { }
    }, 5000);
  } else {
    await remove(typingRef);
  }
}

export function onTypingChanged(userId: string, chatPartnerId: string, callback: (isTyping: boolean) => void): () => void {
  const typingRef = ref(db, `typing/${chatPartnerId}/${userId}`);
  const unsubscribe = onValue(typingRef, (snapshot) => {
    callback(snapshot.exists() && snapshot.val() === true);
  });
  return () => unsubscribe();
}
