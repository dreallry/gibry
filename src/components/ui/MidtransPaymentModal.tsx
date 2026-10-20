import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { type Borrow } from "@/lib/firestore";
import { createSnapTransaction, confirmPayment, loadMidtransSnap } from "@/lib/midtrans";

interface MidtransPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  borrow: Borrow | null;
  onSuccess: () => void;
}

declare global {
  interface Window {
    snap: any;
  }
}

export const MidtransPaymentModal: React.FC<MidtransPaymentModalProps> = ({
  isOpen,
  onClose,
  borrow,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [step, setStep] = useState<"pay" | "success">("pay");

  const title = borrow?.bookTitle || "Pembayaran denda";
  const amount = borrow?.denda || 0;

  useEffect(() => {
    if (isOpen && amount > 0) {
      setOrderId("");
      setStep("pay");
    }
  }, [isOpen, amount]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !amount) return null;

  const handleProcessPayment = async () => {
    setLoading(true);
    try {
      await loadMidtransSnap();
      if (!window.snap?.pay) throw new Error('Layanan pembayaran belum tersedia. Muat ulang halaman.');
      const result = await createSnapTransaction({ kind: 'fine', borrowId: borrow!.id });
      setOrderId(result.orderId);

      const verifyPayment = async () => {
        try {
          const confirmation = await confirmPayment(result.orderId);
          if (!confirmation.paid) {
            toast('info', 'Pembayaran masih menunggu konfirmasi.');
            return;
          }
          setStep('success');
          toast('success', 'Pembayaran telah diverifikasi!');
          onSuccess();
        } catch (error) {
          toast('error', error instanceof Error ? error.message : 'Verifikasi pembayaran belum berhasil.');
        } finally {
          setLoading(false);
        }
      };

      window.snap.pay(result.token, {
        onSuccess: verifyPayment,
        onPending: verifyPayment,
        onError: function (data: any) {
          console.error("[Midtrans] Payment error:", data);
          toast("error", "Pembayaran gagal. Silakan coba lagi.");
          setLoading(false);
        },
        onClose: function () {
          if (step !== "success") setLoading(false);
        },
      });
    } catch (err: any) {
      console.error("[Midtrans] Error:", err);
      toast("error", err.message || "Gagal memproses pembayaran");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#fffcf8] rounded-3xl shadow-2xl border border-[#dbd0ba] overflow-hidden text-[#4a3f35]">
        {/* Header */}
        <div className="bg-[#1b2533] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <ShieldCheck size={18} className="text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-none text-white">Midtrans Payment</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Transaksi Aman & Terenkripsi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup pembayaran"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "pay" && (
            <div className="space-y-5">
              {/* Order Info */}
              <div className="bg-[#f7f3ea] border border-[#dbd0ba] rounded-2xl p-4">
                <p className="text-xs text-[#7d6b56] font-medium">Detail Tagihan</p>
                <p className="font-bold text-sm text-[#4a3f35] line-clamp-1 mt-0.5">{title}</p>
                <div className="mt-2 pt-2 border-t border-[#dbd0ba] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#7d6b56]">Total Pembayaran</span>
                  <span className="text-lg font-black text-amber-700">Rp {amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="text-center space-y-3 py-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#4a3f35]">Pembayaran via Midtrans</p>
                  <p className="text-xs text-[#7d6b56] mt-1">
                    Pilih metode pembayaran di popup Midtrans (QRIS, VA, Kartu Kredit, E-Wallet)
                  </p>
                </div>
                <p className="text-[10px] text-[#7d6b56]">Order ID: {orderId}</p>
              </div>

              {/* Pay Button */}
              <button
                onClick={handleProcessPayment}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#a67c52] hover:bg-[#8d6e4c] text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                <span>{loading ? "Membuka Midtrans..." : "Bayar Sekarang"}</span>
              </button>
            </div>
          )}

          {step === "success" && (
            <div className="py-10 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center animate-bounce">
                <CheckCircle2 size={40} />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-emerald-900">Pembayaran Berhasil!</h4>
                <p className="text-sm text-[#4a3f35]">Denda telah terbayar. Terima kasih!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
