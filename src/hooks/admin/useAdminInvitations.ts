import { getErrorMessage } from "@/lib/errors";
import { useState } from "react";
import { getInvitationCodes, generateInvitationCode, toggleInvitationCodeActive } from "@/lib/firestore";
import type { useAdminData } from './useAdminData';
import type { useAuth } from "@/contexts/AuthContext";
import type { useToast } from "@/components/Toast";

export function useAdminInvitations({ user, setInvitationCodes, toast, invitationCodes }: {
  user: ReturnType<typeof useAuth>["user"];
  setInvitationCodes: ReturnType<typeof useAdminData>["setInvitationCodes"];
  toast: ReturnType<typeof useToast>["toast"];
  invitationCodes: ReturnType<typeof useAdminData>["invitationCodes"];
}) {
  const [showGenCodeModal, setShowGenCodeModal] = useState(false);

  const [codeClass, setCodeClass] = useState("X PPLG 1");

  const [codeBatchCount, setCodeBatchCount] = useState(1);

  const [generatingCodes, setGeneratingCodes] = useState(false);

  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Invitation codes handlers
  async function handleGenerateCodes() {
    if (!user) return;
    setGeneratingCodes(true);
    try {
      for (let i = 0; i < codeBatchCount; i++) {
        await generateInvitationCode(codeClass, user.uid, 30);
      }
      const updated = await getInvitationCodes();
      setInvitationCodes(updated);
      toast("success", `${codeBatchCount} kode undangan kelas ${codeClass} berhasil dibuat!`);
      setShowGenCodeModal(false);
    } catch (err) {
      toast("error", "Gagal membuat kode: " + getErrorMessage(err));
    } finally {
      setGeneratingCodes(false);
    }
  }

  function handleCopyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    toast("success", `Kode ${code} disalin ke clipboard!`);
    setTimeout(() => setCopiedCodeId(null), 2000);
  }

  function handleCopyAllUnusedCodes() {
    const unused = invitationCodes.filter((c) => !c.usedBy && c.isActive);
    if (unused.length === 0) {
      toast("info", "Tidak ada kode aktif yang belum terpakai.");
      return;
    }
    const text = unused.map((c) => `${c.code} (${c.kelas})`).join("\n");
    navigator.clipboard.writeText(text);
    toast("success", `${unused.length} kode disalin ke clipboard!`);
  }

  async function handleToggleCodeActive(codeId: string, currentActive: boolean) {
    try {
      await toggleInvitationCodeActive(codeId, !currentActive);
      setInvitationCodes((prev) =>
        prev.map((c) => (c.id === codeId ? { ...c, isActive: !currentActive } : c))
      );
      toast("info", !currentActive ? "Kode diaktifkan kembali." : "Kode dinonaktifkan.");
    } catch (err) {
      toast("error", "Gagal memperbarui status kode: " + getErrorMessage(err));
    }
  }

  return {
    showGenCodeModal,
    setShowGenCodeModal,
    codeClass,
    setCodeClass,
    codeBatchCount,
    setCodeBatchCount,
    generatingCodes,
    copiedCodeId,
    handleGenerateCodes,
    handleCopyCode,
    handleCopyAllUnusedCodes,
    handleToggleCodeActive,
  };
}
