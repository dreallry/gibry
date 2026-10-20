import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: { bg: "var(--color-destructive)", hover: "opacity-90", icon: "rgba(181,74,53,0.1)" },
    warning: { bg: "#d97706", hover: "opacity-90", icon: "rgba(217,119,6,0.1)" },
    info: { bg: "var(--color-primary)", hover: "opacity-90", icon: "rgba(166,124,82,0.1)" },
  };

  const style = variantStyles[variant];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="rounded-2xl max-w-sm w-full p-6 shadow-2xl"
            style={{ background: "var(--color-card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: style.icon }}>
              <AlertTriangle size={24} style={{ color: variant === "danger" ? "var(--color-destructive)" : variant === "warning" ? "#d97706" : "var(--color-primary)" }} />
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold mb-2">{title}</h3>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>{message}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{ background: "var(--color-muted)", color: "var(--color-foreground)" }}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-full text-sm font-medium text-white transition-all"
                style={{ background: style.bg }}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
