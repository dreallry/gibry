import { getErrorMessage } from "@/lib/errors";
import { banUser, unbanUser, truncateUsers, updateUserRole, logAuditEvent, type UserProfile } from "@/lib/firestore";
import type { useAdminData } from './useAdminData';
import type { useAuth } from "@/contexts/AuthContext";
import type { useToast } from "@/components/Toast";

export function useAdminMembers({ user, profile, toast, loadData, setConfirmAction }: {
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof useAuth>["profile"];
  toast: ReturnType<typeof useToast>["toast"];
  loadData: ReturnType<typeof useAdminData>["loadData"];
  setConfirmAction: import("react").Dispatch<import("react").SetStateAction<import("./types").AdminConfirmAction | null>>;
}) {

  async function handleBanUser(userId: string, userName: string) {
    if (!user) return;
    try {
      await banUser(userId, "Diblokir oleh admin", user.uid);
      logAuditEvent("ban_user", user.uid, { targetUserId: userId, targetUserName: userName }, profile?.nama || user.email || "Admin");
      toast("success", `${userName} telah diblokir`);
      loadData();
    } catch (err) { toast("error", getErrorMessage(err)); }
    setConfirmAction(null);
  }

  async function handleUnbanUser(userId: string, userName: string) {
    try {
      await unbanUser(userId);
      if (user) {
        logAuditEvent("unban_user", user.uid, { targetUserId: userId, targetUserName: userName }, profile?.nama || user.email || "Admin");
      }
      toast("success", `${userName} telah diaktifkan kembali`);
      loadData();
    } catch (err) { toast("error", getErrorMessage(err)); }
    setConfirmAction(null);
  }

  async function handleTruncateUsers() {
    try {
      const deletedCount = await truncateUsers(true);
      if (user) {
        logAuditEvent("truncate_users", user.uid, { deletedCount }, profile?.nama || user.email || "Admin");
      }
      toast("success", `${deletedCount} akun uji coba diproses. Akun petugas dan akun dengan kewajiban aktif dipertahankan.`);
      loadData();
    } catch (err) {
      toast("error", getErrorMessage(err, "Gagal mengosongkan data user."));
    }
    setConfirmAction(null);
  }

  async function handleUpdateUserRole(
    userObj: UserProfile,
    newRole: "admin" | "librarian" | "viewer" | "user"
  ) {
    try {
      await updateUserRole(userObj.uid, newRole);
      if (user) {
        logAuditEvent("update_role", user.uid, { targetUserId: userObj.uid, targetUserName: userObj.nama, newRole }, profile?.nama || user.email || "Admin");
      }
      toast("success", `Role ${userObj.nama} berhasil diperbarui menjadi ${newRole}!`);
      loadData();
    } catch (err) {
      toast("error", "Gagal memperbarui peran akun: " + getErrorMessage(err));
    }
  }

  return {
    handleBanUser,
    handleUnbanUser,
    handleTruncateUsers,
    handleUpdateUserRole,
  };
}
