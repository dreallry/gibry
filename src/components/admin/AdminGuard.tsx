import { Navigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Loader2 } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { canAccessAdmin } = useAdmin();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-background)" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--color-background)" }}>
        <div className="card text-center max-w-md w-full p-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(181,74,53,0.1)" }}>
            <Shield size={32} style={{ color: "var(--color-destructive)" }} />
          </div>
          <h1 className="text-xl font-bold mb-2">Akses Ditolak</h1>
          <p className="text-sm mb-4" style={{ color: "var(--color-muted-foreground)" }}>
            Anda tidak memiliki izin untuk mengakses halaman admin. Hubungi pustakawan jika Anda membutuhkan akses.
          </p>
          <a href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white" style={{ background: "var(--color-primary)" }}>
            Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
