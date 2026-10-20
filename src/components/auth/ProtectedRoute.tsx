import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-background)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
          <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.emailVerified || !profile || profile.banned || profile.status === 'deactivated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin) {
    const isAdmin = profile?.role === "admin" || profile?.role === "librarian";
    if (!isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-background)" }}>
          <div className="text-center p-8 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <p className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>Akses Ditolak</p>
            <p className="text-sm mt-2" style={{ color: "var(--color-muted-foreground)" }}>Anda tidak memiliki akses ke halaman ini.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
