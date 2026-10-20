import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminViewProvider } from "@/contexts/AdminViewContext";
import { ToastProvider } from "@/components/Toast";
import App from "./App";

export default function Application() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminViewProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AdminViewProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
