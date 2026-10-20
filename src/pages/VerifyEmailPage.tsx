import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Loader2, AlertCircle, Home, RefreshCw } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const oobCode = searchParams.get("oobCode");
    const mode = searchParams.get("mode");

    if (mode === "verifyEmail" && oobCode) {
      applyActionCode(auth, oobCode)
        .then(async () => {
          setStatus("success");
          await refreshProfile();
        })
        .catch((err) => {
          setStatus("error");
          if (err.code === "auth/invalid-action-code") {
            setErrorMessage("Link verifikasi sudah tidak valid atau sudah digunakan.");
          } else if (err.code === "auth/expired-action-code") {
            setErrorMessage("Link verifikasi sudah kedaluwarsa. Silakan minta link baru.");
          } else {
            setErrorMessage("Terjadi kesalahan saat memverifikasi email. Silakan coba lagi.");
          }
        });
    } else {
      setStatus("error");
      setErrorMessage("Link verifikasi tidak valid.");
    }
  }, [searchParams, refreshProfile]);

  async function handleRefresh() {
    await refreshProfile();
    // Check if email is now verified
    const user = auth.currentUser;
    if (user?.emailVerified) {
      navigate("/profile");
    }
  }

  return (
    <PageTransition>
    <div className="tile">
      <div className="max-w-md mx-auto px-6 text-center">
        {status === "loading" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: "var(--color-primary)" }} />
            <h1 className="text-2xl font-bold mb-2">Memverifikasi Email</h1>
            <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Mohon tunggu sebentar...</p>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(34,197,94,0.1)" }}>
              <CheckCircle2 size={40} style={{ color: "#22c55e" }} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Email Terverifikasi!</h1>
            <p className="text-sm mb-8" style={{ color: "var(--color-muted-foreground)" }}>
              Email Anda berhasil diverifikasi. Sekarang Anda bisa menggunakan semua fitur Gibry.
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/profile" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-white transition-all hover:scale-[1.02]" style={{ background: "var(--color-primary)" }}>
                Lihat Profil
              </Link>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all hover:scale-[1.02]"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
              >
                <RefreshCw size={16} /> Periksa Status
              </button>
            </div>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(181,74,53,0.1)" }}>
              <AlertCircle size={40} style={{ color: "var(--color-destructive)" }} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Verifikasi Gagal</h1>
            <p className="text-sm mb-8" style={{ color: "var(--color-muted-foreground)" }}>{errorMessage}</p>
            <div className="flex flex-col gap-3">
              <Link to="/profile" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-white transition-all hover:scale-[1.02]" style={{ background: "var(--color-primary)" }}>
                Kembali ke Profil
              </Link>
              <Link to="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all hover:scale-[1.02]" style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}>
                <Home size={16} /> Kembali ke Beranda
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
    </PageTransition>
  );
}
