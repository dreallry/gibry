import { getErrorMessage } from "@/lib/errors";
import { useState } from "react";
import {
  processContentReport,
  updateBookSuggestionStatus,
  deleteBookSuggestion,
  logAuditEvent,
  type ContentReport,
  type BookSuggestion,
} from "@/lib/firestore";
import type { useAdminData } from './useAdminData';
import type { useAuth } from "@/contexts/AuthContext";
import type { useToast } from "@/components/Toast";

export function useAdminModeration({ user, profile, toast, setReports, loadCoreData, setSuggestions }: {
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof useAuth>["profile"];
  toast: ReturnType<typeof useToast>["toast"];
  setReports: ReturnType<typeof useAdminData>["setReports"];
  loadCoreData: ReturnType<typeof useAdminData>["loadCoreData"];
  setSuggestions: ReturnType<typeof useAdminData>["setSuggestions"];
}) {
  const [reportFilter, setReportFilter] = useState<"pending" | "all">("pending");

  const [processingReportId, setProcessingReportId] = useState<string | null>(null);

  const [processingSuggestionId, setProcessingSuggestionId] = useState<string | null>(null);

  // Moderation handlers
  async function handleProcessReport(reportId: string, action: "warning" | "content_deleted" | "user_banned" | "none", notes?: string) {
    if (!user) return;
    setProcessingReportId(reportId);
    try {
      await processContentReport(reportId, action, user.uid, notes);
      logAuditEvent("process_report", user.uid, { reportId, actionTaken: action, notes }, profile?.nama || user.email || "Admin");
      toast("success", action === "none" ? "Laporan telah diabaikan." : "Laporan telah ditindaklanjuti.");
      const updatedStatus = action === "none" ? "dismissed" : "action_taken";
      setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: updatedStatus, actionTaken: action, reviewedBy: user.uid, reviewedAt: new Date().toISOString() } : r));
    } catch (err) {
      toast("error", "Gagal memproses laporan: " + getErrorMessage(err));
    } finally {
      setProcessingReportId(null);
    }
  }

  async function handleBanReportedUser(report: ContentReport) {
    if (!user) return;
    setProcessingReportId(report.id);
    try {
      await processContentReport(report.id, "user_banned", user.uid, `Pelanggaran konten: ${report.reason} (${report.description || "Dilaporkan oleh siswa"})`);
      logAuditEvent("ban_user", user.uid, { targetUserId: report.targetUserId, targetUserName: report.targetUserName, reason: report.reason }, profile?.nama || user.email || "Admin");
      toast("success", `Pengguna ${report.targetUserName} berhasil diblokir.`);
      setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, status: "action_taken", actionTaken: "user_banned", reviewedBy: user.uid, reviewedAt: new Date().toISOString() } : r));
      loadCoreData();
    } catch (err) {
      toast("error", "Gagal memblokir pengguna: " + getErrorMessage(err));
    } finally {
      setProcessingReportId(null);
    }
  }

  // Book suggestions handlers
  async function handleUpdateSuggestion(suggestionId: string, status: BookSuggestion["status"]) {
    if (!user) return;
    setProcessingSuggestionId(suggestionId);
    try {
      const note = (
        status === "accepted" ? "Disetujui untuk pengadaan buku perpus." :
          status === "acquired" ? "Buku telah tersedia di perpustakaan!" : "Belum dapat disetujui saat ini."
      );
      await updateBookSuggestionStatus(suggestionId, status, note);
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestionId ? { ...s, status, adminNote: note } : s))
      );
      toast("success", `Status usulan buku diperbarui menjadi: ${status}`);
    } catch (err) {
      toast("error", "Gagal memperbarui usulan: " + getErrorMessage(err));
    } finally {
      setProcessingSuggestionId(null);
    }
  }

  async function handleDeleteSuggestion(suggestionId: string) {
    if (!user) return;
    try {
      await deleteBookSuggestion(suggestionId, user.uid);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      toast("info", "Usulan buku telah dihapus.");
    } catch (err) {
      toast("error", "Gagal menghapus usulan: " + getErrorMessage(err));
    }
  }

  return {
    reportFilter,
    setReportFilter,
    processingReportId,
    processingSuggestionId,
    handleProcessReport,
    handleBanReportedUser,
    handleUpdateSuggestion,
    handleDeleteSuggestion,
  };
}
