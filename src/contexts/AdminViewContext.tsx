import React, { createContext, useContext, useState } from "react";

interface AdminViewContextType {
  adminViewMode: "admin" | "student";
  setAdminViewMode: (mode: "admin" | "student") => void;
  toggleViewMode: () => void;
}

const AdminViewContext = createContext<AdminViewContextType>({
  adminViewMode: "admin",
  setAdminViewMode: () => {},
  toggleViewMode: () => {},
});

export const AdminViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminViewMode, setAdminViewModeState] = useState<"admin" | "student">(() => {
    const saved = localStorage.getItem("gibry_admin_view_mode");
    return saved === "student" ? "student" : "admin";
  });

  const setAdminViewMode = (mode: "admin" | "student") => {
    setAdminViewModeState(mode);
    localStorage.setItem("gibry_admin_view_mode", mode);
  };

  const toggleViewMode = () => {
    const next = adminViewMode === "admin" ? "student" : "admin";
    setAdminViewMode(next);
  };

  return (
    <AdminViewContext.Provider value={{ adminViewMode, setAdminViewMode, toggleViewMode }}>
      {children}
    </AdminViewContext.Provider>
  );
};

export const useAdminView = () => useContext(AdminViewContext);
