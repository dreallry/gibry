import { getErrorMessage } from "@/lib/errors";
import { useState } from "react";
import { generateQRCode } from "@/lib/firestore";
import type { useAdminData } from './useAdminData';
import type { useAuth } from "@/contexts/AuthContext";
import type { useToast } from "@/components/Toast";

export function useAdminPresensi({ user, setPresensiConfig, toast, presensiConfig }: {
  user: ReturnType<typeof useAuth>["user"];
  setPresensiConfig: ReturnType<typeof useAdminData>["setPresensiConfig"];
  toast: ReturnType<typeof useToast>["toast"];
  presensiConfig: ReturnType<typeof useAdminData>["presensiConfig"];
}) {
  const [generatingToken, setGeneratingToken] = useState(false);

  async function handleGenerateToken() {
    if (!user) return;
    setGeneratingToken(true);
    try {
      const newConfig = await generateQRCode(user.uid);
      setPresensiConfig(newConfig);
      toast("success", `QR Code baru dibuat: ${newConfig.qrCode}`);
    } catch (err) {
      toast("error", getErrorMessage(err, "Gagal membuat token"));
    } finally {
      setGeneratingToken(false);
    }
  }

  function handleDownloadQR() {
    const svgEl = document.getElementById("presensi-qr-svg")?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const link = document.createElement("a");
      link.download = `digipus-qr-${presensiConfig?.qrCode || "presensi"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }

  return {
    generatingToken,
    handleGenerateToken,
    handleDownloadQR,
  };
}
