import { ref, get, set, push, update, serverTimestamp, onValue, query, orderByChild, equalTo } from "firebase/database";
import { db } from "./firebase";
import type { BookClub, ClubMember, ClubMessage, DetailedClubMember } from "./types/club";
import { getUserProfile } from './profiles';

export interface ReadingClub {
  id: string;
  name: string;
  description: string;
  bookTitle: string;
  bookCover?: string;
  memberCount: number;
  createdBy: string;
  createdAt?: number;
}

// ===== Book Clubs =====
export async function createBookClub(name: string, description: string, createdBy: string, bookId?: string): Promise<string> {
  const newRef = push(ref(db, "book_clubs"));
  await update(ref(db), { [`book_clubs/${newRef.key}`]: {
    name,
    description,
    bookId: bookId || null,
    createdBy,
    memberCount: 1,
    createdAt: serverTimestamp(),
  }, [`club_members/${newRef.key}:${createdBy}`]: {
    userId: createdBy,
    clubId: newRef.key,
    role: "admin",
    joinedAt: serverTimestamp(),
  } });

  return newRef.key!;
}

export async function joinBookClub(clubId: string, userId: string): Promise<void> {
  const membersSnap = await get(query(ref(db, "club_members"), orderByChild("clubId"), equalTo(clubId)));
  if (membersSnap.exists()) {
    for (const val of Object.values(membersSnap.val())) {
      if ((val as any).userId === userId && (val as any).clubId === clubId) return;
    }
  }

  await set(ref(db, `club_members/${clubId}:${userId}`), {
    userId,
    clubId,
    role: "member",
    joinedAt: serverTimestamp(),
  });

}

export async function leaveBookClub(clubId: string, userId: string): Promise<void> {
  const membersSnap = await get(query(ref(db, "club_members"), orderByChild("clubId"), equalTo(clubId)));
  if (!membersSnap.exists()) return;

  const updates: Record<string, null> = {};
  for (const [key, val] of Object.entries(membersSnap.val())) {
    if ((val as any).userId === userId && (val as any).clubId === clubId) {
      updates[`club_members/${key}`] = null;
    }
  }
  if (Object.keys(updates).length) await update(ref(db), updates);
}

function clubsWithMembers(clubs: Record<string, BookClub>, members: Record<string, ClubMember>): BookClub[] {
  const usersByClub = new Map<string, Set<string>>();
  for (const { clubId, userId } of Object.values(members)) {
    const users = usersByClub.get(clubId) || new Set<string>();
    users.add(userId);
    usersByClub.set(clubId, users);
  }
  return Object.entries(clubs).map(([id, club]) => ({ ...club, id,
    memberCount: usersByClub.get(id)?.size || 0 }));
}

export async function getBookClubs(userId?: string): Promise<BookClub[]> {
  const [clubs, members] = await Promise.all([get(ref(db, 'book_clubs')), get(ref(db, 'club_members'))]);
  const memberships: Record<string, ClubMember> = members.val() || {};
  const result = clubsWithMembers(clubs.val() || {}, memberships);
  const ownClubs = new Set(Object.values(memberships).filter(member => member.userId === userId).map(member => member.clubId));
  return userId ? result.filter(club => ownClubs.has(club.id)) : result;
}

export function onBookClubsChanged(callback: (clubs: BookClub[]) => void): () => void {
  let clubs: Record<string, BookClub> = {}, members: Record<string, ClubMember> = {};
  let clubsLoaded = false, membersLoaded = false;
  const emit = () => { if (clubsLoaded && membersLoaded) callback(clubsWithMembers(clubs, members)); };
  const offClubs = onValue(ref(db, 'book_clubs'), snap => { clubs = snap.val() || {}; clubsLoaded = true; emit(); });
  const offMembers = onValue(ref(db, 'club_members'), snap => { members = snap.val() || {}; membersLoaded = true; emit(); });
  return () => { offClubs(); offMembers(); };
}

export async function getClubMessages(clubId: string): Promise<ClubMessage[]> {
  const snap = await get(query(ref(db, "club_messages"), orderByChild("clubId"), equalTo(clubId)));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => (v as any).clubId === clubId)
    .map(([id, v]: [string, any]) => ({ id, ...v } as ClubMessage))
    .sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
}

export async function sendClubMessage(clubId: string, userId: string, userName: string, userPhoto: string | undefined, text: string): Promise<void> {
  const newRef = push(ref(db, "club_messages"));
  await set(newRef, {
    clubId,
    userId,
    userName,
    userPhoto: userPhoto || "",
    text,
    createdAt: serverTimestamp(),
  });
}

export function onClubMessagesChanged(clubId: string, callback: (messages: ClubMessage[]) => void): () => void {
  const messages = query(ref(db, 'club_messages'), orderByChild('clubId'), equalTo(clubId));
  return onValue(messages, snapshot => callback(Object.entries(snapshot.val() || {})
    .map(([id, value]) => ({ id, ...(value as any) } as ClubMessage))
    .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))));
}

export async function isUserClubMember(clubId: string, userId: string): Promise<boolean> {
  const snap = await get(query(ref(db, "club_members"), orderByChild("clubId"), equalTo(clubId)));
  if (!snap.exists()) return false;
  for (const val of Object.values(snap.val())) {
    if ((val as any).userId === userId && (val as any).clubId === clubId) return true;
  }
  return false;
}

export async function getClubMemberDetails(clubId: string): Promise<DetailedClubMember[]> {
  const membersSnap = await get(query(ref(db, "club_members"), orderByChild("clubId"), equalTo(clubId)));
  if (!membersSnap.exists()) return [];

  const clubSnap = await get(ref(db, `book_clubs/${clubId}`));
  const creatorId = clubSnap.exists() ? clubSnap.val().createdBy : null;

  const rawMembers: { memberId: string; userId: string; role: "admin" | "member"; joinedAt?: number }[] = [];
  const seenUsers = new Set<string>();
  for (const [key, val] of Object.entries(membersSnap.val())) {
    const m = val as any;
    if (m.clubId === clubId && !seenUsers.has(m.userId)) {
      seenUsers.add(m.userId);
      rawMembers.push({
        memberId: key,
        userId: m.userId,
        role: m.role || "member",
        joinedAt: m.joinedAt,
      });
    }
  }

  const membersWithProfiles = await Promise.all(
    rawMembers.map(async (m) => {
      const p = await getUserProfile(m.userId);
      return {
        memberId: m.memberId,
        userId: m.userId,
        clubId,
        role: m.role,
        joinedAt: m.joinedAt,
        nama: p?.nama || "Anggota Klub",
        username: p?.username || "user",
        photoURL: p?.photoURL || "",
        totalPoints: p?.totalPoints || 0,
        displayBadge: p?.displayBadge,
        isCreator: m.userId === creatorId,
      } as DetailedClubMember;
    })
  );

  return membersWithProfiles.sort((a, b) => {
    if (a.isCreator) return -1;
    if (b.isCreator) return 1;
    if (a.role === "admin" && b.role !== "admin") return -1;
    if (a.role !== "admin" && b.role === "admin") return 1;
    return a.nama.localeCompare(b.nama);
  });
}

export async function getClubMemberRole(clubId: string, userId: string): Promise<"admin" | "member" | null> {
  const membersSnap = await get(query(ref(db, "club_members"), orderByChild("clubId"), equalTo(clubId)));
  if (!membersSnap.exists()) return null;
  for (const val of Object.values(membersSnap.val())) {
    const m = val as any;
    if (m.clubId === clubId && m.userId === userId) {
      return m.role || "member";
    }
  }
  return null;
}

export async function updateBookClub(
  clubId: string,
  data: Partial<{ name: string; description: string; bookId: string | null; bookTitle: string | null }>
): Promise<void> {
  await update(ref(db, `book_clubs/${clubId}`), data);
}

export async function deleteBookClub(clubId: string): Promise<void> {
  const [members, messages] = await Promise.all([
    get(query(ref(db, 'club_members'), orderByChild('clubId'), equalTo(clubId))),
    get(query(ref(db, 'club_messages'), orderByChild('clubId'), equalTo(clubId))),
  ]);
  const updates: Record<string, null> = { [`book_clubs/${clubId}`]: null };
  for (const id of Object.keys(members.val() || {})) updates[`club_members/${id}`] = null;
  for (const id of Object.keys(messages.val() || {})) updates[`club_messages/${id}`] = null;
  await update(ref(db), updates);
}

export async function updateClubMemberRole(clubId: string, userId: string, newRole: "admin" | "member"): Promise<void> {
  const membersSnap = await get(query(ref(db, "club_members"), orderByChild("clubId"), equalTo(clubId)));
  if (!membersSnap.exists()) return;
  const updates: Record<string, string> = {};
  for (const [key, val] of Object.entries(membersSnap.val())) {
    const m = val as any;
    if (m.clubId === clubId && m.userId === userId) {
      updates[`club_members/${key}/role`] = newRole;
    }
  }
  if (Object.keys(updates).length) await update(ref(db), updates);
}

export async function transferClubOwnership(clubId: string, newOwnerId: string): Promise<void> {
  const [club, memberships, newOwner] = await Promise.all([
    get(ref(db, `book_clubs/${clubId}`)),
    get(query(ref(db, 'club_members'), orderByChild('clubId'), equalTo(clubId))),
    getUserProfile(newOwnerId),
  ]);
  if (!club.exists()) throw new Error('Klub tidak ditemukan.');
  if (!newOwner || newOwner.banned || newOwner.status === 'deactivated') throw new Error('Anggota penerima kepemilikan tidak aktif.');
  const members = Object.entries(memberships.val() || {}) as [string, ClubMember][];
  const target = members.find(([, member]) => member.userId === newOwnerId);
  if (!target) throw new Error('Penerima kepemilikan harus menjadi anggota klub.');
  const updates: Record<string, string> = {
    [`book_clubs/${clubId}/createdBy`]: newOwnerId,
    [`club_members/${target[0]}/role`]: 'admin',
  };
  const previous = members.find(([, member]) => member.userId === club.val().createdBy);
  if (previous && previous[0] !== target[0]) updates[`club_members/${previous[0]}/role`] = 'member';
  await update(ref(db), updates);
}
