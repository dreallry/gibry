import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { updateUserProfile, getBlockedUsers, unblockUser } from "@/lib/firestore";
import { checkContent } from "@/lib/wordFilter";
import { uploadProfilePhoto } from "@/lib/storage";
import { postApi } from '@/lib/api';
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { 
  X, User, Shield, LockKeyhole, Eye, EyeOff, Mail, CheckCircle2, 
  Camera, Trash2, AlertTriangle, Power, Loader2, Settings, UserX
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "profile" | "account";
}

export function SettingsModal({ isOpen, onClose, defaultTab = "profile" }: SettingsModalProps) {
  const {
    user, profile, refreshProfile, changePassword,
    sendVerificationEmail, deactivateAccount, deleteAccount
  } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"profile" | "account">(defaultTab);

  React.useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Form states
  const [nama, setNama] = useState(profile?.nama || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [kelas, setKelas] = useState(profile?.kelas || "");
  const [minatBaca, setMinatBaca] = useState<string[]>(profile?.minatBaca || ["Fiksi", "Teknologi"]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  useEffect(() => {
    if (user?.uid && activeTab === "account") {
      setLoadingBlocked(true);
      getBlockedUsers(user.uid)
        .then((ids) => setBlockedUserIds(ids))
        .catch(() => {})
        .finally(() => setLoadingBlocked(false));
    }
  }, [user?.uid, activeTab]);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Danger zone state
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "deactivate" | "delete" | "removePhoto";
    title: string;
    message: string;
  } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [resettingStats, setResettingStats] = useState(false);

  async function handleResetStats() {
    if (!user) return;
    setResettingStats(true);
    try {
      await postApi('reset-progress', {});
      await refreshProfile();
      toast("success", "Statistik & Level berhasil direset ke Level 1 (0 XP)!");
    } catch (err: any) {
      toast("error", "Gagal mereset statistik.");
    } finally {
      setResettingStats(false);
    }
  }

  if (!isOpen || !user || !profile) return null;

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast("error", "Ukuran file maksimal 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCropImageSrc(event.target.result as string);
        setShowCropModal(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleCropConfirm(croppedDataUrl: string) {
    if (!user) return;
    setUploadingPhoto(true);
    try {
      const photoURL = await uploadProfilePhoto(user.uid, croppedDataUrl);
      await updateUserProfile(user.uid, { photoURL });
      await refreshProfile();
      toast("success", "Foto profil berhasil diperbarui!");
      setShowCropModal(false);
      setCropImageSrc(null);
    } catch (err: any) {
      console.error(err);
      toast("error", "Gagal memperbarui foto profil.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    if (!user) return;
    try {
      await updateUserProfile(user.uid, { photoURL: "" });
      await refreshProfile();
      toast("info", "Foto profil telah dihapus.");
    } catch (err: any) {
      toast("error", "Gagal menghapus foto profil.");
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);

    const nameCheck = checkContent(nama);
    const bioCheck = checkContent(bio);
    if (!nameCheck.clean || !bioCheck.clean) {
      toast("error", "Nama atau Bio mengandung kata yang tidak pantas.");
      setSavingProfile(false);
      return;
    }

    try {
      await updateUserProfile(user.uid, { nama: nama.trim(), email, bio: bio.trim(), kelas: kelas.trim(), minatBaca });
      await refreshProfile();
      toast("success", "Profil & biodata berhasil diperbarui!");
    } catch (err: any) {
      toast("error", err.message || "Gagal memperbarui profil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 8) {
      toast("error", "Password baru minimal 8 karakter.");
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast("error", "Password baru harus mengandung kombinasi huruf dan angka.");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast("success", "Password berhasil diubah!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      if (err.code === "auth/wrong-password") {
        toast("error", "Password lama salah.");
      } else {
        toast("error", err.message || "Gagal mengubah password.");
      }
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSendVerification() {
    try {
      await sendVerificationEmail();
      toast("success", "Email verifikasi telah dikirim! Silakan periksa inbox Anda.");
    } catch (err: any) {
      toast("error", err.message || "Gagal mengirim email verifikasi.");
    }
  }

  async function executeConfirmAction() {
    if (!confirmDialog) return;
    setActionLoading(true);
    try {
      if (confirmDialog.type === "deactivate") {
        await deactivateAccount();
        toast("info", "Akun Anda telah dinonaktifkan.");
        onClose();
      } else if (confirmDialog.type === "delete") {
        await deleteAccount(deletePassword || undefined);
        toast("info", "Akun Anda telah dihapus secara permanen.");
        onClose();
      } else if (confirmDialog.type === "removePhoto") {
        await handleRemovePhoto();
      }
    } catch (err: any) {
      toast("error", err.message || "Gagal memproses aksi.");
    } finally {
      setActionLoading(false);
      setConfirmDialog(null);
      setDeletePassword("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[#fffcf5] border border-[#dbd0ba] rounded-3xl max-w-xl w-full p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#dbd0ba] pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#ece5d8] border border-[#dbd0ba] flex items-center justify-center text-[#a67c52]">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif text-[#4a3f35]">Pengaturan Akun</h3>
              <p className="text-[11px] text-[#7d6b56]">Kelola profil, keamanan, dan akun Anda</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#ece5d8] hover:bg-[#dbd0ba] text-[#4a3f35] flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#ece5d8] border border-[#dbd0ba] rounded-xl mb-4">
          {[
            { id: "profile" as const, label: "Edit Profil", icon: User },
            { id: "account" as const, label: "Pengaturan Akun", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#fffcf5] text-[#4a3f35] border border-[#dbd0ba] shadow-2xs"
                    : "text-[#7d6b56] hover:text-[#4a3f35]"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">

          {/* ── TAB 1: EDIT PROFIL ── */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              {/* Photo Area */}
              <div className="bg-[#fbf8f0] border border-[#dbd0ba] rounded-2xl p-4 flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#dbd0ba] bg-[#a67c52] flex items-center justify-center text-white font-bold text-2xl">
                    {profile.photoURL ? (
                      <img src={profile.photoURL} alt={profile.nama} className="w-full h-full object-cover" />
                    ) : (
                      <span>{profile.nama?.charAt(0) || "U"}</span>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#fffcf5] border border-[#dbd0ba] text-[#a67c52] flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-transform"
                    title="Upload Foto"
                  >
                    {uploadingPhoto ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#4a3f35]">Foto Profil</p>
                  <p className="text-[10px] text-[#7d6b56] mt-0.5">Unggah foto format JPG atau PNG (Maks 5MB)</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="px-3 py-1 bg-[#a67c52] hover:bg-[#8d6e4c] text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Unggah Baru
                    </button>
                    {profile.photoURL && (
                      <button
                        onClick={() => setConfirmDialog({
                          type: "removePhoto",
                          title: "Hapus Foto Profil?",
                          message: "Apakah Anda yakin ingin menghapus foto profil Anda?"
                        })}
                        className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#4a3f35] mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#fffcf5] border border-[#dbd0ba] rounded-xl text-xs font-semibold text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4a3f35] mb-1">Kelas / Jurusan</label>
                  <input
                    type="text"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    placeholder="Contoh: XII RPL 1 / Guru / Umum"
                    className="w-full px-3.5 py-2.5 bg-[#fffcf5] border border-[#dbd0ba] rounded-xl text-xs font-semibold text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4a3f35] mb-1">Bio / Moto Baca</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    placeholder="Tuliskan bio singkat, moto hidup, atau selera bacaanmu..."
                    className="w-full px-3.5 py-2.5 bg-[#fffcf5] border border-[#dbd0ba] rounded-xl text-xs font-medium text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4a3f35] mb-1.5">Minat Baca (Pilih Genre Favorit)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Fiksi", "Non-Fiksi", "Teknologi", "Sains", "Sejarah", "Novel", "Self-Help", "Komputer", "Filosofi"].map((genre) => {
                      const isSelected = minatBaca.includes(genre);
                      return (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setMinatBaca(minatBaca.filter((g) => g !== genre));
                            } else {
                              setMinatBaca([...minatBaca, genre]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            isSelected
                              ? "bg-[#a67c52] text-white shadow-2xs"
                              : "bg-[#ece5d8] text-[#7d6b56] hover:bg-[#dbd0ba]"
                          }`}
                        >
                          {isSelected ? "✓ " : "+ "}{genre}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-2.5 bg-[#a67c52] hover:bg-[#8d6e4c] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {savingProfile ? <Loader2 size={14} className="animate-spin" /> : "Simpan Perubahan"}
                </button>
              </form>
            </div>
          )}

          {/* ── TAB 2: PENGATURAN AKUN ── */}
          {activeTab === "account" && (
            <div className="space-y-4">
              {/* Email Info */}
              <div className="bg-[#fbf8f0] border border-[#dbd0ba] rounded-2xl p-4">
                <p className="text-xs font-bold text-[#4a3f35] mb-1">Email Akun</p>
                <p className="text-[11px] text-[#7d6b56]">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  {user.emailVerified ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> Terverifikasi
                    </span>
                  ) : (
                    <button
                      onClick={handleSendVerification}
                      className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors"
                    >
                      Verifikasi Email
                    </button>
                  )}
                </div>
              </div>

              {/* Change Password */}
              <div className="bg-[#fffcf5] border border-[#dbd0ba] rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#4a3f35] flex items-center gap-2">
                  <LockKeyhole size={14} className="text-[#a67c52]" />
                  Ubah Password
                </h4>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#4a3f35] mb-1">Password Saat Ini</label>
                    <div className="relative">
                      <input type={showCurrentPw ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full pl-3.5 pr-10 py-2 bg-[#fffcf5] border border-[#dbd0ba] rounded-xl text-xs font-semibold text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30" placeholder="Masukkan password lama" required />
                      <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7d6b56]">
                        {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#4a3f35] mb-1">Password Baru</label>
                    <div className="relative">
                      <input type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-3.5 pr-10 py-2 bg-[#fffcf5] border border-[#dbd0ba] rounded-xl text-xs font-semibold text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/30" placeholder="Minimal 6 karakter" required />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7d6b56]">
                        {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={changingPassword || !currentPassword || !newPassword} className="w-full py-2 bg-[#a67c52] hover:bg-[#8d6e4c] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {changingPassword ? <Loader2 size={14} className="animate-spin" /> : "Perbarui Password"}
                  </button>
                </form>
              </div>

              {/* Blocked Users */}
              <div className="bg-[#fffcf5] border border-[#dbd0ba] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#4a3f35] flex items-center gap-2">
                    <UserX size={14} className="text-rose-600" />
                    Pengguna yang Diblokir ({blockedUserIds.length})
                  </h4>
                </div>
                <p className="text-[10px] text-[#7d6b56]">
                  Pengguna dalam daftar ini tidak dapat mengirimkan pesan pribadi kepada Anda.
                </p>
                {loadingBlocked ? (
                  <div className="py-2 text-center text-xs text-[#7d6b56]">Memuat...</div>
                ) : blockedUserIds.length === 0 ? (
                  <p className="text-[11px] text-[#7d6b56]/70 italic py-1">Belum ada pengguna yang diblokir.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                    {blockedUserIds.map((bId) => (
                      <div key={bId} className="flex items-center justify-between p-2 rounded-xl bg-[#ece5d8]/50 border border-[#dbd0ba] text-xs">
                        <span className="font-mono text-[10px] text-[#4a3f35] truncate max-w-[180px]">ID: {bId}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!user) return;
                            await unblockUser(user.uid, bId);
                            setBlockedUserIds((prev) => prev.filter((id) => id !== bId));
                            toast("info", "Blokir dibuka");
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white border border-[#dbd0ba] hover:bg-rose-50 text-rose-700 transition-colors"
                        >
                          Buka Blokir
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset Stats */}
              <div className="bg-[#fffcf5] border border-[#dbd0ba] rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#ece5d8] text-[#a67c52] flex items-center justify-center flex-shrink-0 mt-0.5"><User size={14} /></div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-[#4a3f35]">Reset Poin & Level</h4>
                    <p className="text-[10px] text-[#7d6b56] mt-0.5">Kembalikan akun ke Level 1 (0 XP).</p>
                    <button onClick={handleResetStats} disabled={resettingStats} className="mt-2 px-3 py-1.5 bg-[#a67c52] hover:bg-[#8d6e4c] text-white rounded-lg text-[10px] font-bold transition-colors inline-flex items-center gap-1 disabled:opacity-50">
                      {resettingStats ? <Loader2 size={11} className="animate-spin" /> : "Reset ke Level 1"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Deactivate Account */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5"><Power size={14} /></div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-amber-900">Nonaktifkan Akun</h4>
                    <p className="text-[10px] text-amber-800 mt-0.5">Sembunyikan profil sementara. Login kembali untuk mengaktifkan.</p>
                    <button onClick={() => setConfirmDialog({ type: "deactivate", title: "Nonaktifkan Akun?", message: "Anda akan dikeluarkan dari aplikasi." })} className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-colors inline-flex items-center gap-1">
                      <Power size={11} /> Nonaktifkan
                    </button>
                  </div>
                </div>
              </div>

              {/* Delete Account */}
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center flex-shrink-0 mt-0.5"><Trash2 size={14} /></div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-rose-900">Hapus Akun Permanen</h4>
                    <p className="text-[10px] text-rose-800 mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
                    <button onClick={() => setConfirmDialog({ type: "delete", title: "Hapus Akun Permanen?", message: "Seluruh data Anda akan dihapus." })} className="mt-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-colors inline-flex items-center gap-1">
                      <Trash2 size={11} /> Hapus Permanen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Confirmation Dialog for Danger Zone Actions */}
      <ConfirmDialog
        open={!!confirmDialog}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={executeConfirmAction}
        title={confirmDialog?.title || "Konfirmasi"}
        message={confirmDialog?.message || ""}
        confirmText={confirmDialog?.type === "delete" ? "Hapus Permanen" : confirmDialog?.type === "deactivate" ? "Ya, Nonaktifkan" : "Ya, Hapus"}
        cancelText="Batal"
        variant={confirmDialog?.type === "delete" ? "danger" : "warning"}
      />
    </div>
  );
}
