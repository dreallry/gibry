import { ref, get, set, push, update, onValue, query, orderByChild, limitToLast, serverTimestamp } from 'firebase/database';
import { db, auth } from './firebase';
import type { AppNotification } from './types/misc';
export async function addNotification(
  userId: string,
  data: Omit<AppNotification, "id" | "userId" | "read" | "createdAt"> & { fromUserId?: string; message?: string }
): Promise<void> {
  const newRef = push(ref(db, `notifikasi/${userId}`));
  const currentUid = auth.currentUser?.uid || userId;
  const fromUserId = data.fromUserId || currentUid;
  const msgText = (data.message || data.body || data.title || "Notifikasi baru").slice(0, 300);

  await set(newRef, {
    ...data,
    message: msgText,
    title: data.title || "Notifikasi",
    body: data.body || msgText,
    fromUserId,
    userId,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const notifRef = query(ref(db, `notifikasi/${userId}`), orderByChild('createdAt'), limitToLast(50));
  const snap = await get(notifRef);
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .map(([id, v]: [string, any]) => ({ id, ...v } as AppNotification))
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
    .slice(0, 50);
}

export function onNotificationsChanged(userId: string, callback: (notifications: AppNotification[]) => void): () => void {
  const notifRef = query(ref(db, `notifikasi/${userId}`), orderByChild('createdAt'), limitToLast(50));
  const unsubscribe = onValue(notifRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const all = snapshot.val();
    const notifications = Object.entries(all)
      .map(([id, v]: [string, any]) => ({ id, ...v } as AppNotification))
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
      .slice(0, 50);
    callback(notifications);
  });
  return () => unsubscribe();
}

export async function markNotificationAsRead(userIdOrNotificationId: string, maybeNotificationId?: string): Promise<void> {
  if (maybeNotificationId) {
    await update(ref(db, `notifikasi/${userIdOrNotificationId}/${maybeNotificationId}`), { read: true });
  } else {
    const currentUid = auth.currentUser?.uid;
    if (currentUid) {
      await update(ref(db, `notifikasi/${currentUid}/${userIdOrNotificationId}`), { read: true });
    }
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const notifRef = ref(db, `notifikasi/${userId}`);
  const snap = await get(notifRef);
  if (!snap.exists()) return;
  const all = snap.val();
  const updates: Record<string, any> = {};
  for (const [key, val] of Object.entries(all)) {
    if (!(val as any).read) {
      updates[`notifikasi/${userId}/${key}/read`] = true;
    }
  }
  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }
}
