import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  type User,
  deleteUser,
  reload,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { postApi } from '@/lib/api';
import { createUserProfile, getUserProfile, updateUserProfile, lookupInvitationCode, setUserOnlineStatus, onUserProfileChanged, type UserProfile } from "@/lib/firestore";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  register: (
    email: string,
    password: string,
    data: { nama: string; username: string; invitationCode?: string; kelas?: string; alamat?: string; noTelp?: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deactivateAccount: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to get profile with retry
  async function getProfileWithRetry(uid: string, retries = 3, delay = 500): Promise<UserProfile | null> {
    for (let i = 0; i < retries; i++) {
      const p = await getUserProfile(uid);
      if (p) return p;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  }

  useEffect(() => {
    let unsubOnline: (() => void) | null = null;
    let unsubProfile: (() => void) | null = null;
    let generation = 0;

    const clearListeners = () => {
      unsubOnline?.();
      unsubProfile?.();
      unsubOnline = null;
      unsubProfile = null;
    };

    const unsub = onAuthStateChanged(auth, async (u) => {
      const currentGeneration = ++generation;
      clearListeners();
      setUser(u);
      setProfile(null);
      setLoading(true);
      try {
        if (!u) return;
        const p = await getProfileWithRetry(u.uid);
        if (generation !== currentGeneration) return;
        setProfile(p);
        if (u.emailVerified && p && !p.banned && p.status !== 'deactivated') {
          void postApi('sync-profile', {}).catch(() => console.warn('Sinkronisasi profil publik belum tersedia.'));
          unsubOnline = setUserOnlineStatus(u.uid);
        }
        unsubProfile = onUserProfileChanged(u.uid, (updatedProfile) => {
          if (generation === currentGeneration) setProfile(updatedProfile);
        });
      } catch (error) {
        console.error('Gagal memuat profil login:', error);
      } finally {
        if (generation === currentGeneration) setLoading(false);
      }
    });
    return () => {
      ++generation;
      unsub();
      clearListeners();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    try {
      await reload(cred.user);
    } catch (e) {
      console.warn("Gagal mereload status user auth:", e);
    }
    if (!cred.user.emailVerified) {
      await signOut(auth);
      setProfile(null);
      const err: any = new Error("Email belum diverifikasi.");
      err.code = "auth/email-not-verified";
      throw err;
    }
    // Check if user is banned safely
    try {
      const profileData = await getUserProfile(cred.user.uid);
      if (profileData?.banned) {
        await signOut(auth);
        setProfile(null);
        const err: any = new Error("Akun Anda telah diblokir. Silakan hubungi admin.");
        err.code = "auth/user-banned";
        throw err;
      }
    } catch (err: any) {
      if (err.code === "auth/user-banned") throw err;
      console.warn("Gagal membaca profil saat login:", err);
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    let existingProfile: UserProfile | null = null;
    try {
      existingProfile = await getUserProfile(result.user.uid);
    } catch (e) {
      console.warn("Gagal mengecek profil Google:", e);
    }

    if (!existingProfile) {
      const displayName = result.user.displayName || "User";
      const email = result.user.email || "";
      const cleanUsername = (displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "user") + "_" + Math.random().toString(36).substring(2, 6);
      try {
        await createUserProfile(result.user.uid, {
          nama: displayName,
          username: cleanUsername,
          email,
          alamat: "",
          noTelp: "",
        });
      } catch (e) {
        console.warn("Gagal membuat profil baru Google:", e);
      }
      const p = await getProfileWithRetry(result.user.uid);
      setProfile(p);
    } else {
      if (existingProfile.banned) {
        await signOut(auth);
        setProfile(null);
        const err: any = new Error(existingProfile.banReason ? `Akun Anda telah diblokir: ${existingProfile.banReason}` : "Akun Anda telah diblokir. Silakan hubungi admin.");
        err.code = "auth/user-banned";
        throw err;
      }
      if ((existingProfile as any).status === "deactivated") {
        try {
          await updateUserProfile(result.user.uid, { status: "active" } as any);
          existingProfile.status = "active";
        } catch (e) {
          console.warn("Gagal mengaktifkan kembali akun:", e);
        }
      }
      setProfile(existingProfile);
    }
  };

  const loginWithApple = async () => {
    const provider = new OAuthProvider("apple.com");
    const result = await signInWithPopup(auth, provider);
    let existingProfile: UserProfile | null = null;
    try {
      existingProfile = await getUserProfile(result.user.uid);
    } catch (e) {
      console.warn("Gagal mengecek profil Apple:", e);
    }
    if (!existingProfile) {
      const displayName = result.user.displayName || "User";
      const email = result.user.email || "";
      const cleanUsername = (displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "user") + "_" + Math.random().toString(36).substring(2, 6);
      await createUserProfile(result.user.uid, {
        nama: displayName,
        username: cleanUsername,
        email,
        alamat: "",
        noTelp: "",
      });
      const p = await getProfileWithRetry(result.user.uid);
      setProfile(p);
    } else {
      if (existingProfile.banned) {
        await signOut(auth);
        setProfile(null);
        const err: any = new Error(existingProfile.banReason ? `Akun Anda telah diblokir: ${existingProfile.banReason}` : "Akun Anda telah diblokir. Silakan hubungi admin.");
        err.code = "auth/user-banned";
        throw err;
      }
      if ((existingProfile as any).status === "deactivated") {
        await updateUserProfile(result.user.uid, { status: "active" } as any);
        existingProfile.status = "active";
      }
      setProfile(existingProfile);
    }
  };

  const register = async (
    email: string,
    password: string,
    data: { nama: string; username: string; invitationCode?: string; kelas?: string; alamat?: string; noTelp?: string }
  ) => {
    let invitationCodeId: string | undefined;
    let resolvedKelas = data.kelas || "";

    if (data.invitationCode && data.invitationCode.trim()) {
      const lookup = await lookupInvitationCode(data.invitationCode.trim().toUpperCase());
      if (!lookup || !lookup.isActive || lookup.expiresAt <= Date.now()) {
        throw new Error("Kode rujukan atau institusi tidak valid atau sudah kedaluwarsa.");
      }
      invitationCodeId = lookup.codeId;
      resolvedKelas = lookup.kelas || resolvedKelas;
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    try {
      await createUserProfile(cred.user.uid, {
        nama: data.nama,
        username: data.username,
        email,
        invitationCodeId,
        kelas: resolvedKelas,
        alamat: data.alamat,
        noTelp: data.noTelp,
      });
    } catch (err: any) {
      console.error("Gagal membuat profil di database:", err);
      try {
        await cred.user.delete();
      } catch {}
      throw new Error(err.message || "Gagal membuat profil pengguna. Pastikan username belum digunakan.");
    }

    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true,
      };
      await sendEmailVerification(cred.user, actionCodeSettings);
    } catch (err) {
      console.warn("sendEmailVerification dengan actionCodeSettings gagal, mencoba tanpa settings:", err);
      try {
        await sendEmailVerification(cred.user);
      } catch (fallbackErr) {
        console.error("sendEmailVerification fallback gagal:", fallbackErr);
      }
    }

    try {
      await signOut(auth);
    } catch (e) {
      console.error("SignOut setelah pendaftaran gagal:", e);
    }
    setProfile(null);
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const refreshProfile = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await reload(currentUser);
        await currentUser.getIdToken(true);
      } catch (e) {
        console.warn("Gagal mereload status auth user:", e);
      }
      const p = await getUserProfile(currentUser.uid);
      setProfile(p);
      setUser(currentUser);
    }
  };

  const sendVerificationEmail = async () => {
    if (user && !user.emailVerified) {
      const actionCodeSettings = {
        url: `${window.location.origin}/profile`,
        handleCodeInApp: true,
      };
      await sendEmailVerification(user, actionCodeSettings);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) throw new Error("User not authenticated");

    // Re-authenticate first
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);
  };

  const deactivateAccount = async () => {
    if (!user) return;
    await updateUserProfile(user.uid, { status: "deactivated" } as any);
    await logout();
  };

  const deleteAccount = async (password?: string) => {
    if (!user) return;
    if (user.email && password) {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
    }
    if (!password) {
      const providerId = user.providerData[0]?.providerId;
      if (providerId === 'google.com') await reauthenticateWithPopup(user, new GoogleAuthProvider());
      else if (providerId === 'apple.com') await reauthenticateWithPopup(user, new OAuthProvider('apple.com'));
      else throw new Error('Masukkan password untuk menghapus akun.');
    }
    await user.getIdToken(true);
    const result = await postApi<{ pending: boolean }>('delete-account', {});
    await logout();
    if (result.pending) throw new Error('Akun telah dinonaktifkan; pembersihan data sedang diproses dan akan dicoba ulang oleh server.');
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      login,
      loginWithGoogle,
      loginWithApple,
      register,
      logout,
      refreshProfile,
      sendVerificationEmail,
      resetPassword,
      changePassword,
      deactivateAccount,
      deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
