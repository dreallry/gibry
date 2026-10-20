import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { 
  Eye, EyeOff, Loader2, Mail, Lock, User, Key, AlertCircle, 
  CheckCircle2, Circle, MailCheck, ArrowRight, ArrowLeft, Shield, BookOpen
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const { user, login, loginWithGoogle, loginWithApple, register, resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Jika user sudah masuk, langsung arahkan ke beranda
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [showPw, setShowPw] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Error states
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [forgotError, setForgotError] = useState("");

  const [resetSent, setResetSent] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [showInviteInput, setShowInviteInput] = useState(false);

  // Forgot password field
  const [forgotEmail, setForgotEmail] = useState("");

  // Realtime password requirement checks
  const hasMinLength = regPassword.length >= 6;
  const hasUppercase = /[A-Z]/.test(regPassword);
  const hasLowercase = /[a-z]/.test(regPassword);
  const hasNumber = /[0-9]/.test(regPassword);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  function getFirebaseErrorMessage(err: any): string {
    const code = err.code || "";
    if (err.message && err.message.includes("PERMISSION_DENIED")) {
      return "Izin akses database ditolak atau sinkronisasi akun tertunda. Silakan coba kembali dalam beberapa detik.";
    }
    const messages: Record<string, string> = {
      "auth/user-not-found": "Email tidak terdaftar. Silakan daftar terlebih dahulu.",
      "auth/wrong-password": "Password yang dimasukkan salah.",
      "auth/invalid-email": "Format email tidak valid.",
      "auth/user-disabled": "Akun ini telah dinonaktifkan.",
      "auth/too-many-requests": "Terlalu banyak percobaan. Silakan tunggu beberapa menit.",
      "auth/network-request-failed": "Gagal terhubung ke server. Periksa koneksi internet Anda.",
      "auth/invalid-credential": "Email atau password salah.",
      "auth/email-already-in-use": "Email sudah digunakan oleh akun lain. Silakan gunakan email lain atau masuk.",
      "auth/weak-password": "Password terlalu lemah. Gunakan minimal 6 karakter dengan kombinasi huruf besar, huruf kecil, dan angka.",
      "auth/operation-not-allowed": "Metode login ini belum diaktifkan.",
      "auth/popup-closed-by-user": "",
      "auth/account-exists-with-different-credential": "Email sudah terdaftar dengan metode login yang berbeda.",
      "auth/email-not-verified": "Email Anda belum diverifikasi. Silakan periksa inbox/spam email Anda dan klik link verifikasi sebelum masuk.",
    };
    return messages[code] || err.message || "Terjadi kesalahan. Silakan coba lagi.";
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      await login(email, password);
      toast("success", "Berhasil masuk!");
      navigate("/");
    } catch (err: any) {
      setLoginError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      toast("success", "Berhasil masuk dengan Google!");
      navigate("/");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setLoginError(getFirebaseErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoginError("");
    setLoading(true);
    try {
      await loginWithApple();
      toast("success", "Berhasil masuk dengan Apple!");
      navigate("/");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setLoginError(getFirebaseErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");

    if (username.length < 3) {
      setRegisterError("Username minimal 3 karakter.");
      return;
    }

    if (!isPasswordValid) {
      setRegisterError("Password harus memenuhi seluruh kriteria (min 6 karakter, huruf besar, huruf kecil, dan angka).");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(regEmail)) {
      setRegisterError("Format email tidak valid.");
      return;
    }

    setLoading(true);
    try {
      await register(regEmail, regPassword, {
        nama,
        username,
        invitationCode: invitationCode.trim() ? invitationCode.trim().toUpperCase() : undefined,
      });
      setRegisterSuccess(true);
      toast("success", "Akun berhasil dibuat! Silakan verifikasi email Anda.");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setEmail(regEmail);
        setRegisterError("Email ini sudah pernah terdaftar di Firebase. Silakan gunakan tab 'Masuk'.");
      } else {
        setRegisterError(getFirebaseErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail) { setForgotError("Email harus diisi"); return; }

    setLoading(true);
    try {
      await resetPassword(forgotEmail);
      setResetSent(true);
      toast("success", "Email reset password telah dikirim!");
    } catch (err: any) {
      setForgotError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-[100dvh] bg-[#F5EFE3] flex flex-col justify-start sm:justify-between px-3.5 py-4 sm:p-8 select-none relative overflow-x-hidden overflow-y-auto">
        {/* Subtle Background Archival Grid / Corners */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-10 left-10 text-[11px] font-mono text-[#797D6E] rotate-90 origin-left hidden md:block">
            • PLATFORM PERPUSTAKAAN DIGITAL GLOBAL •
          </div>
          <div className="absolute bottom-10 right-10 text-[11px] font-mono text-[#797D6E] -rotate-90 origin-right hidden md:block">
            • GIBRY LITERASI & KOMUNITAS BACA •
          </div>
        </div>

        {/* TOP BAR: Clean Back Link & Brand Mark */}
        <header className="w-full max-w-xl mx-auto flex items-center justify-between z-10 pt-1 pb-4 sm:pt-2 sm:pb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#797D6E] hover:text-[#304D42] bg-[#FAF7F0] border border-[#DEDDD0] px-3.5 py-2.5 sm:py-2 rounded-xl transition-all hover:shadow-2xs active:scale-95 min-h-[42px] touch-manipulation"
          >
            <ArrowLeft size={14} />
            <span>Beranda</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#304D42] text-[#FFF9EF] flex items-center justify-center font-bold text-sm shadow-xs">
              <BookOpen size={16} />
            </div>
            <div className="leading-none text-left">
              <span className="font-editorial text-base text-[#304D42] font-bold block">Gibry</span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#797D6E] block mt-0.5">Perpustakaan</span>
            </div>
          </div>
        </header>

        {/* MAIN FOCUSED CARD */}
        <main className="w-full max-w-lg mx-auto z-10 my-auto py-2 sm:py-4">
          <div className="bg-[#FFF9EF] border border-[#DEDDD0] rounded-2xl sm:rounded-3xl p-4.5 sm:p-8 md:p-9 shadow-[0_12px_40px_rgba(48,77,66,0.08)] relative overflow-hidden">
            {/* Tactile Archival Corner Marks */}
            <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 text-[10px] font-mono text-[#DEDDD0] select-none pointer-events-none">┌</div>
            <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 text-[10px] font-mono text-[#DEDDD0] select-none pointer-events-none">┐</div>
            <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 text-[10px] font-mono text-[#DEDDD0] select-none pointer-events-none">└</div>
            <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 text-[10px] font-mono text-[#DEDDD0] select-none pointer-events-none">┘</div>

            {/* PLAYFUL SPRING TAB SWITCHER (Only when not in forgot or success mode) */}
            {mode !== "forgot" && !registerSuccess && (
              <div className="p-1 rounded-2xl bg-[#E8EBDF] border border-[#DEDDD0] flex items-center mb-5 sm:mb-6 relative">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setLoginError(""); setRegisterError(""); }}
                  className={`relative z-10 flex-1 min-h-[42px] sm:min-h-[40px] py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation active:scale-[0.99] ${
                    mode === "login" ? "text-[#304D42]" : "text-[#797D6E] hover:text-[#304D42]"
                  }`}
                >
                  {mode === "login" && (
                    <motion.div
                      layoutId="authTabIndicator"
                      className="absolute inset-0 bg-[#FFF9EF] rounded-xl shadow-xs border border-[#DEDDD0]/60"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">Masuk ke Akun</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMode("register"); setLoginError(""); setRegisterError(""); }}
                  className={`relative z-10 flex-1 min-h-[42px] sm:min-h-[40px] py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation active:scale-[0.99] ${
                    mode === "register" ? "text-[#304D42]" : "text-[#797D6E] hover:text-[#304D42]"
                  }`}
                >
                  {mode === "register" && (
                    <motion.div
                      layoutId="authTabIndicator"
                      className="absolute inset-0 bg-[#FFF9EF] rounded-xl shadow-xs border border-[#DEDDD0]/60"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">Daftar Anggota</span>
                </button>
              </div>
            )}

            {/* ANIMATED MODE CONTENT */}
            <AnimatePresence mode="wait">
              {mode === "forgot" ? (
                /* ==================== FORGOT PASSWORD FORM ==================== */
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 sm:space-y-5"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-editorial text-[#304D42]">Atur Ulang Password</h2>
                    <p className="text-xs text-[#797D6E] font-space mt-1 leading-relaxed">
                      Masukkan alamat email akun Anda. Kami akan mengirimkan tautan untuk membuat password baru.
                    </p>
                  </div>

                  {forgotError && (
                    <div className="p-3.5 rounded-2xl flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                      <AlertCircle size={15} className="text-rose-600 flex-shrink-0" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  {resetSent ? (
                    <div className="text-center py-5 sm:py-6 space-y-3 bg-[#FAF7F0] border border-[#DEDDD0] rounded-2xl p-4">
                      <Mail size={36} className="mx-auto text-[#AD6549]" />
                      <h4 className="text-sm font-bold text-[#304D42]">Email Instruksi Terkirim!</h4>
                      <p className="text-xs text-[#797D6E] font-space max-w-xs mx-auto leading-relaxed">
                        Silakan periksa kotak masuk atau spam email Anda untuk instruksi pengaturan ulang password.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setMode("login"); setResetSent(false); }}
                        className="mt-2 min-h-[42px] px-5 py-2.5 bg-[#304D42] text-[#FFF9EF] rounded-xl text-xs font-bold hover:bg-[#233B32] active:scale-95 transition-all touch-manipulation"
                      >
                        Kembali ke Form Masuk
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#304D42] mb-1.5 font-space">
                          Email Terdaftar
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#797D6E]" size={16} />
                          <input
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="w-full h-11 sm:h-12 pl-11 pr-4 rounded-2xl text-base sm:text-xs font-space bg-[#FAF7F0] border border-[#DEDDD0] focus:border-[#304D42] outline-none text-[#304D42] transition-all touch-manipulation placeholder:text-[#797D6E]/60"
                            placeholder="nama@contoh.com"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-[#304D42] hover:bg-[#233B32] active:scale-[0.98] text-[#FFF9EF] rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 touch-manipulation"
                      >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : "Kirim Tautan Reset"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode("login")}
                        className="w-full min-h-[42px] py-2 text-xs font-bold text-center block text-[#AD6549] hover:underline cursor-pointer touch-manipulation"
                      >
                        Batal, kembali ke login
                      </button>
                    </form>
                  )}
                </motion.div>
              ) : registerSuccess ? (
                /* ==================== REGISTER SUCCESS VERIFICATION ==================== */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-3 sm:py-4 text-center space-y-4"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
                    <MailCheck size={30} />
                  </div>

                  <div>
                    <h3 className="text-xl font-editorial text-[#304D42]">Pendaftaran Berhasil!</h3>
                    <p className="text-xs text-[#797D6E] font-space mt-1 leading-relaxed max-w-sm mx-auto">
                      Tautan verifikasi email telah dikirimkan ke <strong className="text-[#304D42]">{regEmail}</strong>.
                    </p>
                  </div>

                  <div className="bg-[#FAF7F0] border border-[#DEDDD0] p-3.5 sm:p-4 rounded-2xl text-left text-xs space-y-2">
                    <p className="font-bold text-[#304D42] flex items-center gap-1.5">
                      <Shield size={14} className="text-[#AD6549]" /> Langkah Konfirmasi Akun:
                    </p>
                    <ol className="list-decimal list-inside text-[#797D6E] font-space space-y-1 text-[11px] leading-relaxed">
                      <li>Buka aplikasi atau kotak masuk email Anda.</li>
                      <li>Periksa folder <strong>Inbox</strong> atau <strong>Spam</strong>.</li>
                      <li>Klik tautan konfirmasi dari <strong>Gibry DigiPus</strong>.</li>
                      <li>Kembali ke sini dan masuk menggunakan akun baru Anda.</li>
                    </ol>
                  </div>

                  <button
                    onClick={() => {
                      setRegisterSuccess(false);
                      setEmail(regEmail);
                      setMode("login");
                    }}
                    className="w-full min-h-[46px] py-3 bg-[#304D42] hover:bg-[#233B32] active:scale-[0.98] text-[#FFF9EF] rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                  >
                    <span>Saya Sudah Verifikasi, Masuk Sekarang</span>
                    <ArrowRight size={14} />
                  </button>
                </motion.div>
              ) : mode === "login" ? (
                /* ==================== LOGIN FORM ==================== */
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4 sm:space-y-5"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-editorial text-[#304D42]">Selamat Datang Kembali</h2>
                    <p className="text-xs text-[#797D6E] font-space mt-1 leading-relaxed">
                      Buka rak buku digital dan lanjutkan bacaanmu hari ini.
                    </p>
                  </div>

                  {loginError && (
                    <div className="p-3.5 rounded-2xl flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium leading-relaxed">
                      <AlertCircle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  {/* Social Login Buttons */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="h-11 rounded-2xl border border-[#DEDDD0] bg-[#FAF7F0] hover:bg-[#F2ECDF] active:scale-[0.98] font-medium text-xs text-[#304D42] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 touch-manipulation"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAppleLogin}
                      disabled={loading}
                      className="h-11 rounded-2xl bg-[#203830] hover:bg-[#152520] active:scale-[0.98] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 touch-manipulation"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      <span>Apple</span>
                    </button>
                  </div>

                  <div className="relative my-1.5 sm:my-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#DEDDD0]" />
                    </div>
                    <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-widest text-[#797D6E]">
                      <span className="px-3 bg-[#FFF9EF]">atau gunakan email</span>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#304D42] mb-1 font-space">
                        Alamat Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#797D6E]" size={15} />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-11 pl-11 pr-4 rounded-2xl text-base sm:text-xs font-space bg-[#FAF7F0] border border-[#DEDDD0] focus:border-[#304D42] outline-none text-[#304D42] transition-all placeholder:text-[#797D6E]/60 touch-manipulation"
                          placeholder="nama@contoh.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-[#304D42] font-space">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => { setMode("forgot"); setForgotError(""); }}
                          className="text-[11px] font-bold text-[#AD6549] hover:underline cursor-pointer py-1 touch-manipulation"
                        >
                          Lupa password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#797D6E]" size={15} />
                        <input
                          type={showPw ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-11 pl-11 pr-11 rounded-2xl text-base sm:text-xs font-space bg-[#FAF7F0] border border-[#DEDDD0] focus:border-[#304D42] outline-none text-[#304D42] transition-all placeholder:text-[#797D6E]/60 touch-manipulation"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[#797D6E] hover:text-[#304D42] active:text-[#304D42] cursor-pointer touch-manipulation"
                          aria-label={showPw ? "Sembunyikan password" : "Lihat password"}
                        >
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-[#304D42] hover:bg-[#233B32] text-[#FFF9EF] rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 mt-2 touch-manipulation"
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : (
                        <>
                          <span>Masuk ke Perpustakaan</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </form>

                  <p className="text-center text-xs text-[#797D6E] font-space pt-1.5">
                    Belum punya kartu anggota?{" "}
                    <button
                      type="button"
                      onClick={() => { setMode("register"); setLoginError(""); setRegisterError(""); }}
                      className="font-bold text-[#AD6549] hover:underline cursor-pointer py-1 touch-manipulation"
                    >
                      Daftar akun di sini
                    </button>
                  </p>
                </motion.div>
              ) : (
                /* ==================== REGISTER FORM ==================== */
                <motion.div
                  key="register"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3.5"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-editorial text-[#304D42]">Daftar Akun Baru</h2>
                    <p className="text-xs text-[#797D6E] font-space mt-1 leading-relaxed">
                      Buka akses ke ribuan koleksi buku digital, diskusi, dan komunitas pembaca.
                    </p>
                  </div>

                  {registerError && (
                    <div className="p-3.5 rounded-2xl flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium leading-relaxed">
                      <AlertCircle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
                      <span>{registerError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#304D42] mb-1 font-space">
                          Nama Lengkap
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#797D6E]" size={14} />
                          <input
                            type="text"
                            value={nama}
                            onChange={(e) => setNama(e.target.value)}
                            className="w-full h-11 sm:h-10 pl-9 pr-3 rounded-xl text-base sm:text-xs font-space bg-[#FAF7F0] border border-[#DEDDD0] focus:border-[#304D42] outline-none text-[#304D42] transition-all touch-manipulation placeholder:text-[#797D6E]/60"
                            placeholder="Nama lengkap kamu"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#304D42] mb-1 font-space">
                          Username
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#797D6E]" size={14} />
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full h-11 sm:h-10 pl-9 pr-3 rounded-xl text-base sm:text-xs font-space bg-[#FAF7F0] border border-[#DEDDD0] focus:border-[#304D42] outline-none text-[#304D42] transition-all touch-manipulation placeholder:text-[#797D6E]/60"
                            placeholder="Username unik"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#304D42] mb-1 font-space">
                        Alamat Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#797D6E]" size={14} />
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full h-11 sm:h-10 pl-9 pr-3 rounded-xl text-base sm:text-xs font-space bg-[#FAF7F0] border border-[#DEDDD0] focus:border-[#304D42] outline-none text-[#304D42] transition-all touch-manipulation placeholder:text-[#797D6E]/60"
                          placeholder="nama@email.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#304D42] mb-1 font-space">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#797D6E]" size={14} />
                        <input
                          type={showRegPw ? "text" : "password"}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full h-11 sm:h-10 pl-9 pr-11 rounded-xl text-base sm:text-xs font-space bg-[#FAF7F0] border border-[#DEDDD0] focus:border-[#304D42] outline-none text-[#304D42] transition-all touch-manipulation placeholder:text-[#797D6E]/60"
                          placeholder="Kombinasi huruf & angka"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPw(!showRegPw)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[#797D6E] hover:text-[#304D42] active:text-[#304D42] cursor-pointer touch-manipulation"
                          aria-label={showRegPw ? "Sembunyikan password" : "Lihat password"}
                        >
                          {showRegPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>

                      {/* Password Requirements Realtime Checklist */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-2 p-2.5 rounded-xl bg-[#FAF7F0] border border-[#DEDDD0] text-[10.5px] sm:text-[11px] font-space">
                        <div className={`flex items-center gap-1.5 transition-colors leading-tight ${hasMinLength ? "text-emerald-700 font-bold" : "text-[#797D6E]/70"}`}>
                          <span className="shrink-0">{hasMinLength ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Circle size={13} />}</span>
                          <span className="truncate">Min. 6 Karakter</span>
                        </div>
                        <div className={`flex items-center gap-1.5 transition-colors leading-tight ${hasUppercase ? "text-emerald-700 font-bold" : "text-[#797D6E]/70"}`}>
                          <span className="shrink-0">{hasUppercase ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Circle size={13} />}</span>
                          <span className="truncate">Huruf Besar (A-Z)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 transition-colors leading-tight ${hasLowercase ? "text-emerald-700 font-bold" : "text-[#797D6E]/70"}`}>
                          <span className="shrink-0">{hasLowercase ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Circle size={13} />}</span>
                          <span className="truncate">Huruf Kecil (a-z)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 transition-colors leading-tight ${hasNumber ? "text-emerald-700 font-bold" : "text-[#797D6E]/70"}`}>
                          <span className="shrink-0">{hasNumber ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Circle size={13} />}</span>
                          <span className="truncate">Angka (0-9)</span>
                        </div>
                      </div>
                    </div>

                    {/* Optional Institution / Referral Code */}
                    <div className="pt-0.5">
                      {!showInviteInput ? (
                        <button
                          type="button"
                          onClick={() => setShowInviteInput(true)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-space text-[#797D6E] hover:text-[#304D42] cursor-pointer py-1 touch-manipulation transition-colors"
                        >
                          <Key size={12} className="text-[#AD6549]" />
                          <span>Punya kode rujukan atau institusi? (Opsional)</span>
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.18 }}
                          className="space-y-1.5 p-2.5 rounded-xl bg-[#FAF7F0] border border-[#DEDDD0]"
                        >
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-[#304D42] font-space">
                              Kode Rujukan / Institusi <span className="font-normal text-[#797D6E]">(Opsional)</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => { setShowInviteInput(false); setInvitationCode(""); }}
                              className="text-[10px] text-[#797D6E] hover:text-[#304D42] cursor-pointer underline"
                            >
                              Batal
                            </button>
                          </div>
                          <div className="relative">
                            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#797D6E]" size={14} />
                            <input
                              type="text"
                              value={invitationCode}
                              onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                              className="w-full h-10 pl-9 pr-3 rounded-lg text-xs font-mono uppercase tracking-wider bg-white border border-[#DEDDD0] focus:border-[#304D42] outline-none text-[#304D42] transition-all placeholder:text-[#797D6E]/50 touch-manipulation"
                              placeholder="KODE RUJUKAN (JIKA ADA)"
                            />
                          </div>
                          <p className="text-[10px] text-[#797D6E] font-space pl-0.5">
                            Masukkan jika Anda terafiliasi dengan sekolah, universitas, atau klub buku rekanan.
                          </p>
                        </motion.div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !isPasswordValid}
                      className="w-full h-12 bg-[#AD6549] hover:bg-[#8E523A] text-[#FFF9EF] rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 mt-2 touch-manipulation"
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : (
                        <>
                          <span>Daftar Akun Anggota</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </form>

                  <p className="text-center text-xs text-[#797D6E] font-space pt-1.5">
                    Sudah memiliki akun anggota?{" "}
                    <button
                      type="button"
                      onClick={() => { setMode("login"); setLoginError(""); setRegisterError(""); }}
                      className="font-bold text-[#304D42] hover:underline cursor-pointer py-1 touch-manipulation"
                    >
                      Masuk di sini
                    </button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

      </div>
    </PageTransition>
  );
}
