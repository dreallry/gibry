import { postApi } from './api';
import { ref, get, set, push, update, remove, serverTimestamp } from "firebase/database";
import { db } from "./firebase";
import type { UserProfile } from "./types/user";
import type { Announcement, BookSuggestion } from "./types/misc";
import type { ContentReport, InvitationCode, InvitationCodeLookup } from "./types/moderation";
import { auth } from "./firebase";
import { getUserProfile } from './profiles';

// ===== Admin Functions =====

export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await get(ref(db, "anggota"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all).map(([uid, v]: [string, any]) => ({
    uid,
    ...(v as any),
  })) as UserProfile[];
}

export async function truncateUsers(keepAdmins: boolean = true): Promise<number> {
  const result = await postApi<{ deletedCount: number }>('reset-members', { keepAdmins });
  return result.deletedCount;
}

export async function updateUserRole(uid: string, role: "admin" | "librarian" | "viewer" | "user"): Promise<void> {
  await postApi('manage-user', { action: 'role', userId: uid, role });
}

export async function banUser(userId: string, reason: string, bannedBy: string): Promise<void> {
  await postApi('manage-user', { action: 'ban', userId, reason });
}

export async function unbanUser(userId: string): Promise<void> {
  await postApi('manage-user', { action: 'unban', userId });
}

export async function createAnnouncement(data: { title: string; body: string; target?: string; createdBy: string }): Promise<void> {
  await postApi('announce', data);
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const snap = await get(ref(db, "announcements"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .map(([id, v]: [string, any]) => ({ id, ...v } as Announcement))
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await remove(ref(db, `announcements/${id}`));
}

// ===== Invitation Codes =====
export async function lookupInvitationCode(code: string): Promise<InvitationCodeLookup | null> {
  if (!code || !code.trim()) return null;
  const cleanCode = code.trim().toUpperCase();
  const snap = await get(ref(db, `invitation_code_lookup/${cleanCode}`));
  if (!snap.exists()) return null;
  return snap.val() as InvitationCodeLookup;
}

export async function generateInvitationCode(
  code: string,
  kelas: string,
  expiresDays: number = 30
): Promise<string> {
  const cleanCode = code.trim().toUpperCase();
  const codeId = push(ref(db, "invitation_codes")).key!;
  const expiresAt = Date.now() + expiresDays * 24 * 60 * 60 * 1000;
  const currentAdmin = auth.currentUser?.uid || "admin";

  const codeData: InvitationCode = {
    id: codeId,
    code: cleanCode,
    kelas: kelas.trim(),
    isActive: true,
    expiresAt,
    createdBy: currentAdmin,
    createdAt: new Date().toISOString(),
    usedBy: null,
  };

  const lookupData: InvitationCodeLookup = {
    codeId,
    kelas: kelas.trim(),
    isActive: true,
    expiresAt,
  };

  const updates: Record<string, any> = {};
  updates[`invitation_codes/${codeId}`] = codeData;
  updates[`invitation_code_lookup/${cleanCode}`] = lookupData;

  await update(ref(db), updates);
  return codeId;
}

export async function getInvitationCodes(): Promise<InvitationCode[]> {
  const snap = await get(ref(db, "invitation_codes"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all).map(([id, val]: [string, any]) => ({ id, ...val } as InvitationCode));
}

export async function toggleInvitationCodeActive(codeId: string, isActive: boolean): Promise<void> {
  const snap = await get(ref(db, `invitation_codes/${codeId}`));
  if (!snap.exists()) return;
  const code = snap.val() as InvitationCode;

  const updates: Record<string, any> = {};
  updates[`invitation_codes/${codeId}/isActive`] = isActive;
  updates[`invitation_code_lookup/${code.code}/isActive`] = isActive;

  await update(ref(db), updates);
}

// ===== Content Reports & Moderation =====
export async function submitContentReport(
  report: Omit<ContentReport, "id" | "createdAt">
): Promise<string> {
  const newRef = push(ref(db, "content_reports"));
  const reportData: ContentReport = {
    id: newRef.key!,
    ...report,
    createdAt: new Date().toISOString(),
  };
  await set(newRef, reportData);
  return newRef.key!;
}

export async function getContentReports(status?: string): Promise<ContentReport[]> {
  const snap = await get(ref(db, "content_reports"));
  if (!snap.exists()) return [];
  const all = snap.val();
  const list = Object.entries(all).map(([id, val]: [string, any]) => ({ id, ...val } as ContentReport));
  if (status) {
    return list.filter((r) => r.status === status);
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function processContentReport(
  reportId: string,
  action: ContentReport["actionTaken"],
  adminNote?: string,
  processedBy?: string
): Promise<void> {
  const reportSnap = await get(ref(db, `content_reports/${reportId}`));
  if (!reportSnap.exists()) throw new Error("Laporan tidak ditemukan");
  const report = reportSnap.val() as ContentReport;

  // If action is content_deleted, handle deletion based on targetType
  if (action === "content_deleted") {
    try {
      if (report.targetType === "community_post") {
        await remove(ref(db, `komunitas_post/${report.targetId}`));
      } else if (report.targetType === "community_reply") {
        await remove(ref(db, `komunitas_balasan/${report.targetId}`));
      } else if (report.targetType === "discussion") {
        await remove(ref(db, `book_discussions/${report.targetId}`));
      } else if (report.targetType === "review") {
        await remove(ref(db, `ulasan/${report.targetId}`));
      }
    } catch (delErr) {
      console.warn("[processContentReport] Content delete error:", delErr);
    }
  }

  // If action is user_banned, ban user
  if (action === "user_banned") {
    await banUser(report.targetUserId, adminNote || "Pelanggaran tata tertib sekolah", processedBy || "admin");
  }

  await update(ref(db, `content_reports/${reportId}`), {
    status: action === "none" ? "dismissed" : "action_taken",
    actionTaken: action,
    adminNote: adminNote || null,
    reviewedAt: new Date().toISOString(),
    reviewedBy: processedBy || auth.currentUser?.uid || "admin",
  });
}

// ===== User Blocking =====
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  await set(ref(db, `user_blocks/${blockerId}/${blockedId}`), {
    blockerId,
    blockedId,
    createdAt: new Date().toISOString(),
  });
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await remove(ref(db, `user_blocks/${blockerId}/${blockedId}`));
}

export async function getBlockedUsers(userId: string): Promise<string[]> {
  const snap = await get(ref(db, `user_blocks/${userId}`));
  if (!snap.exists()) return [];
  return Object.keys(snap.val());
}

export async function isUserBlocked(blockerId: string, targetId: string): Promise<boolean> {
  const snap = await get(ref(db, `user_blocks/${blockerId}/${targetId}`));
  return snap.exists();
}

// ===== Audit Logging =====
export interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  userName?: string;
  details?: Record<string, any>;
  timestamp: number;
}

export async function logAuditEvent(
  action: string,
  userId: string,
  details?: Record<string, any>,
  userName?: string
): Promise<void> {
  try {
    const newRef = push(ref(db, "audit_log"));
    await set(newRef, {
      action,
      userId,
      userName: userName || details?.userName || details?.adminName || "Admin",
      details: details || {},
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn("[logAuditEvent] Logging error:", err);
  }
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  try {
    const snap = await get(ref(db, "audit_log"));
    if (!snap.exists()) return [];
    const val = snap.val();
    return Object.entries(val)
      .map(([id, item]: [string, any]) => ({
        id,
        action: item.action || "unknown",
        userId: item.userId || "",
        userName: item.userName || item.details?.userName || item.details?.adminName || "Admin",
        details: item.details || {},
        timestamp: item.timestamp || Date.now(),
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    console.error("Gagal memuat log audit:", err);
    return [];
  }
}

// ===== Book Suggestions & Votes =====
export async function suggestBook(
  userId: string,
  userName: string,
  title: string,
  reason: string,
  author?: string
): Promise<string> {
  const newRef = push(ref(db, "book_suggestions"));
  const suggestion: BookSuggestion = {
    id: newRef.key!,
    userId,
    userName,
    title: title.trim().slice(0, 200),
    author: author ? author.trim().slice(0, 100) : undefined,
    reason: reason.trim().slice(0, 300),
    status: "open",
    createdAt: new Date().toISOString(),
  };
  await set(newRef, suggestion);
  return newRef.key!;
}

export async function getBookSuggestions(): Promise<(BookSuggestion & { voteCount: number; hasVoted?: boolean })[]> {
  const [sugSnap, votesSnap] = await Promise.all([
    get(ref(db, "book_suggestions")),
    get(ref(db, "book_suggestion_votes")),
  ]);

  if (!sugSnap.exists()) return [];
  const sugs = sugSnap.val();
  const votes = votesSnap.exists() ? votesSnap.val() : {};
  const currentUid = auth.currentUser?.uid;

  return Object.entries(sugs)
    .map(([id, val]: [string, any]) => {
      const sugVotes = votes[id] || {};
      const voteCount = Object.keys(sugVotes).length;
      const hasVoted = currentUid ? !!sugVotes[currentUid] : false;
      return {
        id,
        ...val,
        voteCount,
        hasVoted,
      };
    })
    .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
}

export async function toggleVoteBookSuggestion(suggestionId: string, userId: string): Promise<boolean> {
  const voteRef = ref(db, `book_suggestion_votes/${suggestionId}/${userId}`);
  const snap = await get(voteRef);
  const hasVoted = snap.exists();

  if (hasVoted) {
    await remove(voteRef);
    return false;
  } else {
    await set(voteRef, true);
    return true;
  }
}

export async function deleteBookSuggestion(suggestionId: string, userId: string): Promise<void> {
  const snap = await get(ref(db, `book_suggestions/${suggestionId}`));
  if (!snap.exists()) return;
  const sug = snap.val();
  const profile = await getUserProfile(userId);
  const isAdmin = profile?.role === "admin" || profile?.role === "librarian";

  if (sug.userId !== userId && !isAdmin) {
    throw new Error("Tidak memiliki izin untuk menghapus usulan ini");
  }

  await remove(ref(db, `book_suggestions/${suggestionId}`));
  await remove(ref(db, `book_suggestion_votes/${suggestionId}`)).catch(() => { });
}

export async function updateBookSuggestionStatus(
  suggestionId: string,
  status: BookSuggestion["status"],
  adminNote?: string
): Promise<void> {
  await update(ref(db, `book_suggestions/${suggestionId}`), {
    status,
    adminNote: adminNote || null,
  });
}
