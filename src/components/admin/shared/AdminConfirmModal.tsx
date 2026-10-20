import React, { useEffect, useState } from "react";
import { AlertTriangle, X, Check } from "lucide-react";

interface AdminConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "neutral";
  requireConfirmationText?: string;
  isLoading?: boolean;
}

export function AdminConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Konfirmasi Tindakan",
  cancelLabel = "Batalkan",
  variant = "danger",
  requireConfirmationText,
  isLoading = false,
}: AdminConfirmModalProps) {
  const [typedInput, setTypedInput] = useState("");
  const [isAgreementChecked, setIsAgreementChecked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTypedInput("");
      setIsAgreementChecked(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isRequirementSatisfied = requireConfirmationText
    ? typedInput.trim().toLowerCase() === requireConfirmationText.trim().toLowerCase()
    : isAgreementChecked;

  const buttonStyle =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white"
      : variant === "warning"
        ? "bg-amber-600 hover:bg-amber-700 text-white"
        : "bg-[#304D42] hover:bg-[#253d34] text-[#FFF9EF]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-white dark:bg-[#233B32] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#DEDDD0] dark:border-[#3A5B4F] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                variant === "danger"
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#304D42] dark:text-[#FFF9EF]">
                {title}
              </h3>
              <p className="text-xs text-[#797D6E] dark:text-[#BAC0B3]">
                Verifikasi tindakan berisiko tinggi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-[#797D6E] hover:text-[#304D42] dark:hover:text-[#FFF9EF] hover:bg-[#F2ECDF] dark:hover:bg-[#2C473D] transition-colors"
            aria-label="Tutup modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-[#304D42] dark:text-[#FFF9EF] leading-relaxed">
            {description}
          </p>

          {requireConfirmationText ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#797D6E] dark:text-[#BAC0B3]">
                Ketik teks <code className="px-1.5 py-0.5 rounded bg-[#F2ECDF] dark:bg-[#2C473D] text-[#304D42] dark:text-[#FFF9EF] font-mono">{requireConfirmationText}</code> untuk mengonfirmasi:
              </label>
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder={requireConfirmationText}
                className="w-full px-3 py-2 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#FFF9EF] dark:bg-[#1B2E27] text-xs text-[#304D42] dark:text-[#FFF9EF] focus:outline-none focus:ring-2 focus:ring-[#AD6549]"
                autoFocus
              />
            </div>
          ) : (
            <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAgreementChecked}
                onChange={(e) => setIsAgreementChecked(e.target.checked)}
                className="mt-0.5 rounded border-[#DEDDD0] text-[#AD6549] focus:ring-[#AD6549]"
              />
              <span className="text-xs text-[#797D6E] dark:text-[#BAC0B3]">
                Saya memahami konsekuensi dan menyetujui perubahan ini.
              </span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F2ECDF]/50 dark:bg-[#1B2E27]/50 border-t border-[#DEDDD0] dark:border-[#3A5B4F] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#797D6E] hover:text-[#304D42] dark:hover:text-[#FFF9EF] transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isRequirementSatisfied || isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${buttonStyle}`}
          >
            {isLoading ? (
              <span>Memproses...</span>
            ) : (
              <>
                <Check size={14} />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
