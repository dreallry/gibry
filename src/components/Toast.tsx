import { createContext, useContext, useCallback, type ReactNode } from "react";
import { toast as sonnerToast, Toaster } from "sonner";

export { sonnerToast as toast };

type ToastType = "success" | "error" | "info" | "warning";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  description?: string;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextType {
  toast: {
    (type: ToastType, message: string, options?: ToastOptions): void;
    (message: string, options?: ToastOptions): void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useCallback(
    (
      typeOrMessage: ToastType | string,
      messageOrOptions?: string | ToastOptions,
      maybeOptions?: ToastOptions
    ) => {
      // Case 1: toast("success" | "error" | "info" | "warning", "Message", options)
      if (
        (typeOrMessage === "success" ||
          typeOrMessage === "error" ||
          typeOrMessage === "info" ||
          typeOrMessage === "warning") &&
        typeof messageOrOptions === "string"
      ) {
        const type = typeOrMessage;
        const msg = messageOrOptions;
        const opts = maybeOptions || {};

        if (type === "success") {
          sonnerToast.success(msg, {
            description: opts.description,
            action: opts.action,
            duration: opts.duration || 4000,
          });
        } else if (type === "error") {
          sonnerToast.error(msg, {
            description: opts.description,
            action: opts.action,
            duration: opts.duration || 5000,
          });
        } else if (type === "warning") {
          sonnerToast.warning(msg, {
            description: opts.description,
            action: opts.action,
            duration: opts.duration || 4000,
          });
        } else {
          sonnerToast.info(msg, {
            description: opts.description,
            action: opts.action,
            duration: opts.duration || 4000,
          });
        }
        return;
      }

      // Case 2: toast("Message", { description, action }) -> standard sonner template
      const msg = String(typeOrMessage);
      const opts = (typeof messageOrOptions === "object" ? messageOrOptions : {}) as ToastOptions;

      sonnerToast(msg, {
        description: opts.description,
        action: opts.action,
        duration: opts.duration || 4000,
      });
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast: toast as any }}>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          className:
            "rounded-2xl border border-[#dbd0ba] shadow-xl text-sm font-sans bg-[#fffcf8] text-[#4a3f35]",
          descriptionClassName: "text-xs text-[#7d6b56]",
        }}
      />
    </ToastContext.Provider>
  );
}
