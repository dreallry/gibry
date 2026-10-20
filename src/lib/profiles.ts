import { ref, get, update, serverTimestamp, onValue, onDisconnect } from "firebase/database";
import { db } from "./firebase";
import type { UserProfile } from "./types/user";
import { auth } from "./firebase";
import { getUserPoints } from './points';
import { postApi } from './api';

// ===== User Profile =====
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await get(ref(db, `${uid === auth.currentUser?.uid ? "anggota" : "public_profiles"}/${uid}`));
  if (!snap.exists()) return null;
  const profile = { email: "", ...(snap.val() as any), uid } as UserProfile;

  // Merge points from user_points (source of truth for totalPoints/level)
  try {
    const points = await getUserPoints(uid);
    profile.totalPoints = points.totalPoints;
    profile.level = points.level;
  } catch { }

  return profile;
}

export async function createUserProfile(
  uid: string,
  data: {
    nama: string;
    username: string;
    email: string;
    invitationCodeId?: string;
    kelas?: string;
    alamat?: string;
    noTelp?: string;
  }
): Promise<void> {
  const cleanUsername = data.username.toLowerCase().trim();

  const updates: Record<string, any> = {};
  updates[`anggota/${uid}`] = {
    totalPoints: 0,
    level: 1,
    likesCount: 0,
    kudosCount: 0,
    nama: data.nama.trim(),
    username: cleanUsername,
    email: data.email.trim(),
    kelas: data.kelas || "",
    role: "user",
    banned: false,
    ...(data.invitationCodeId ? { invitationCodeId: data.invitationCodeId } : {}),
    ...(data.alamat ? { alamat: data.alamat } : {}),
    ...(data.noTelp ? { noTelp: data.noTelp } : {}),
    createdAt: serverTimestamp(),
  };

  if (data.invitationCodeId) {
    updates[`invitation_codes/${data.invitationCodeId}/usedBy`] = uid;
    updates[`invitation_codes/${data.invitationCodeId}/usedAt`] = Date.now();
  }

  updates[`usernames/${cleanUsername}`] = uid;
  updates[`user_points/${uid}`] = { totalPoints: 0, level: 1 };

  await update(ref(db), updates);
  await postApi('sync-profile', {}).catch(() => console.warn('Profil publik akan disinkronkan saat login berikutnya.'));
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  if (uid !== auth.currentUser?.uid) throw new Error('Profil bukan milik akun yang sedang login.');
  await postApi('update-profile', { data });
}

// Search users
export async function searchUsers(query: string): Promise<UserProfile[]> {
  const snap = await get(ref(db, "public_profiles"));
  if (!snap.exists()) return [];
  const all = snap.val();
  const s = query.toLowerCase();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => {
      const user = v as any;
      const isRoleAdmin = user.role === "admin" || user.role === "librarian";
      const isNameAdmin = user.nama?.toLowerCase().includes("administrator");
      if (isRoleAdmin || isNameAdmin) return false;
      return user.nama?.toLowerCase().includes(s) || user.username?.toLowerCase().includes(s);
    })
    .map(([uid, v]: [string, any]) => ({ uid, ...(v as any) } as UserProfile))
    .slice(0, 20);
}

export function setUserOnlineStatus(userId: string): () => void {
  const userStatusRef = ref(db, `online/${userId}`);
  const connectedRef = ref(db, ".info/connected");
  let closed = false;

  const unsubscribe = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      void onDisconnect(userStatusRef).set({ online: false, lastSeen: serverTimestamp() })
        .then(() => {
          if (!closed) return update(userStatusRef, { online: true, lastSeen: serverTimestamp() });
        })
        .catch(() => console.warn('Status online belum dapat diperbarui.'));
    }
  });

  return () => {
    closed = true;
    unsubscribe();
    update(userStatusRef, { online: false, lastSeen: serverTimestamp() }).catch(() => { });
  };
}

export function onUserStatusChanged(userId: string, callback: (online: boolean) => void): () => void {
  const userStatusRef = ref(db, `online/${userId}`);
  const unsubscribe = onValue(userStatusRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val().online === true);
    } else {
      callback(false);
    }
  });
  return () => unsubscribe();
}

export function onUserProfileChanged(uid: string, callback: (profile: UserProfile | null) => void): () => void {
  let anggotaData: any = null;
  let pointsData: any = null;

  function emit() {
    if (!anggotaData) { callback(null); return; }
    const profile = { uid, ...(anggotaData as any) } as UserProfile;
    if (pointsData) {
      profile.totalPoints = pointsData.totalPoints || 0;
      profile.level = pointsData.level || 1;
    }
    callback(profile);
  }

  const anggotaUnsub = onValue(ref(db, `anggota/${uid}`), (snap) => {
    anggotaData = snap.exists() ? snap.val() : null;
    emit();
  }, (err) => { console.error("Profile listener error:", err); });

  const pointsUnsub = onValue(ref(db, `user_points/${uid}`), (snap) => {
    pointsData = snap.exists() ? snap.val() : null;
    emit();
  });

  return () => {
    anggotaUnsub();
    pointsUnsub();
  };
}
