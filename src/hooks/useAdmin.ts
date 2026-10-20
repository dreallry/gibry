import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useAdmin() {
  const { profile } = useAuth();

  const isSuperAdmin = useMemo(() => profile?.role === "admin", [profile]);
  const isLibrarian = useMemo(() => profile?.role === "librarian", [profile]);
  const isViewer = useMemo(() => profile?.role === "viewer", [profile]);

  // isAdmin tetap bernilai true untuk admin dan librarian demi kompatibilitas kode lama
  const isAdmin = useMemo(
    () => profile?.role === "admin" || profile?.role === "librarian",
    [profile]
  );

  const canAccessAdmin = useMemo(
    () =>
      profile?.role === "admin" ||
      profile?.role === "librarian" ||
      profile?.role === "viewer",
    [profile]
  );

  const canWrite = useMemo(
    () => profile?.role === "admin" || profile?.role === "librarian",
    [profile]
  );

  const canManageRoles = useMemo(() => profile?.role === "admin", [profile]);

  const isUser = useMemo(
    () => !profile?.role || profile?.role === "user",
    [profile]
  );

  return {
    isAdmin,
    isSuperAdmin,
    isLibrarian,
    isViewer,
    canAccessAdmin,
    canWrite,
    canManageRoles,
    isUser,
    role: profile?.role || "user",
  };
}

