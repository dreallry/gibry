import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { validateQRCode } from "@/lib/firestore";
import { PageTransition } from "@/components/PageTransition";
import { QrCode, CheckCircle2, AlertTriangle, Loader2, ArrowRight, BookOpen, Barcode } from "lucide-react";
import { ISBNScannerModal } from "@/components/book/ISBNScannerModal";

export default function ScanPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "no_token">("loading");
  const [message, setMessage] = useState("");
  const [showIsbnScanner, setShowIsbnScanner] = useState(false);

  useEffect(() => {
    const qr = searchParams.get("qr");
    if (!qr) {
      setStatus("no_token");
      setMessage("QR code tidak valid. Silakan scan QR code yang benar.");
      return;
    }

    validateQRCode(qr)
      .then((valid) => {
        if (valid) {
          setStatus("valid");
          // Store verification in sessionStorage
          sessionStorage.setItem("presensi_verified", "true");
          sessionStorage.setItem("presensi_verified_date", new Date().toISOString().slice(0, 10));

          // Redirect after short delay
          setTimeout(() => {
            navigate("/attendance", { replace: true });
          }, 1500);
        } else {
          setStatus("invalid");
          setMessage("QR code tidak dikenali. Silakan scan QR code terbaru di perpustakaan.");
        }
      })
      .catch(() => {
        setStatus("invalid");
        setMessage("Gagal memverifikasi QR code. Periksa koneksi internet Anda.");
      });
  }, [searchParams, navigate]);

  return (
    <PageTransition>
      <div className="tile">
        <div className="max-w-md mx-auto px-6 py-16">
          <div className="card p-8 text-center">
            {status === "loading" && (
              <>
                <Loader2 size={48} className="mx-auto mb-4 animate-spin" style={{ color: "var(--color-primary)" }} />
                <h2 className="text-lg font-bold mb-2">Memverifikasi Token...</h2>
                <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                  Mohon tunggu sebentar
                </p>
              </>
            )}

            {status === "valid" && (
              <>
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
                  <CheckCircle2 size={32} style={{ color: "#16a34a" }} />
                </div>
                <h2 className="text-lg font-bold mb-2" style={{ color: "#16a34a" }}>Verifikasi Berhasil!</h2>
                <p className="text-sm mb-4" style={{ color: "var(--color-muted-foreground)" }}>
                  Anda akan dialihkan ke halaman presensi...
                </p>
                <div className="flex items-center justify-center gap-2 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                  <BookOpen size={12} />
                  <span>Selamat berkunjung ke perpustakaan</span>
                </div>
              </>
            )}

            {(status === "invalid" || status === "no_token") && (
              <>
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(180,90,53,0.1)" }}>
                  <AlertTriangle size={32} style={{ color: "#b45a35" }} />
                </div>
                <h2 className="text-lg font-bold mb-2 text-[#4a3f35]">Pindai QR / Barcode</h2>
                <p className="text-xs mb-6 text-[#7d6b56]">
                  {status === "no_token"
                    ? "Buka tautan QR Code presensi yang terpasang di meja perpustakaan, atau cari buku menggunakan nomor ISBN di bawah."
                    : message}
                </p>
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => setShowIsbnScanner(true)}
                    className="h-10 px-6 rounded-full text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-sm bg-amber-700 hover:bg-amber-800"
                  >
                    <Barcode size={16} />
                    <span>Pindai / Cari Barcode ISBN Buku</span>
                  </button>

                  <button
                    onClick={() => navigate("/attendance", { replace: true })}
                    className="h-10 px-6 rounded-full text-xs font-medium inline-flex items-center justify-center gap-2 border border-[#dbd0ba] text-[#7d6b56] hover:bg-[#ede5d8]"
                  >
                    <span>Ke Halaman Presensi</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <ISBNScannerModal
          isOpen={showIsbnScanner}
          onClose={() => setShowIsbnScanner(false)}
        />
      </div>
    </PageTransition>
  );
}
