import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BookOpen, Calendar, CheckCircle2, CreditCard, History, Loader2 } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { MidtransPaymentModal } from "@/components/ui/MidtransPaymentModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { getUserBorrowHistory, type Borrow } from "@/lib/firestore";

const statusLabel: Record<Borrow["status"], string> = {
  "Menunggu Pengambilan": "Menunggu Pengambilan",
  Dipinjam: "Dipinjam",
  Dikembalikan: "Dikembalikan",
  Terlambat: "Terlambat",
  Kadaluarsa: "Kadaluarsa",
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFine, setSelectedFine] = useState<Borrow | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try { setBorrows(await getUserBorrowHistory(user.uid)); }
    catch (error) { const message = error instanceof Error ? error.message : "Riwayat transaksi belum dapat dimuat."; setLoadError(message); toast("error", message); }
    finally { setLoading(false); }
  }, [toast, user]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const unpaidFines = borrows.filter((borrow) => (borrow.denda || 0) > 0 && borrow.dendaStatus !== "lunas" && borrow.dendaStatus !== "waived");
  const activeLoans = borrows.filter((borrow) => ["Menunggu Pengambilan", "Dipinjam", "Terlambat"].includes(borrow.status));

  return (
    <PageTransition>
      <div className="tile">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2"><History size={24} style={{ color: "var(--color-primary)" }} /><h1 className="text-display-lg">Transaksi</h1></div>
            <p style={{ color: "var(--color-muted-foreground)" }}>Riwayat peminjaman dan pembayaran denda akunmu.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <div className="card p-4"><BookOpen size={18} className="mb-2" style={{ color: "var(--color-primary)" }} /><p className="text-xl font-bold">{borrows.length}</p><p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Total pinjaman</p></div>
            <div className="card p-4"><Calendar size={18} className="mb-2" style={{ color: "var(--color-primary)" }} /><p className="text-xl font-bold">{activeLoans.length}</p><p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Masih aktif</p></div>
            <div className="card p-4"><AlertTriangle size={18} className="mb-2 text-amber-600" /><p className="text-xl font-bold">Rp {unpaidFines.reduce((sum, borrow) => sum + (borrow.denda || 0), 0).toLocaleString("id-ID")}</p><p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Denda tertunda</p></div>
          </div>

          {loading ? <div className="py-16 text-center"><Loader2 className="mx-auto animate-spin" /></div> : loadError ? (
            <div className="card py-16 text-center"><AlertTriangle size={36} className="mx-auto mb-3 text-amber-600" /><p className="text-sm">{loadError}</p><button onClick={loadHistory} className="mt-4 min-h-[44px] px-4 rounded-full text-xs font-bold text-white" style={{ background: "var(--color-primary)" }}>Coba lagi</button></div>
          ) : borrows.length === 0 ? (
            <div className="card py-16 text-center"><BookOpen size={36} className="mx-auto mb-3" style={{ color: "var(--color-border)" }} /><p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Belum ada riwayat peminjaman.</p></div>
          ) : (
            <div className="space-y-3">
              {borrows.map((borrow) => {
                const unpaid = (borrow.denda || 0) > 0 && borrow.dendaStatus !== "lunas" && borrow.dendaStatus !== "waived";
                return <div key={borrow.id} className="card p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                  <div className="w-14 h-18 rounded-lg overflow-hidden shrink-0" style={{ background: "var(--color-muted)" }}>
                    {borrow.bookCover ? <img src={borrow.bookCover} alt="" className="w-full h-full object-cover" /> : <BookOpen className="m-4" size={22} style={{ color: "var(--color-border)" }} />}
                  </div>
                  <div className="flex-1 min-w-0"><p className="font-bold truncate">{borrow.bookTitle || "Buku"}</p><p className="text-xs mt-1" style={{ color: "var(--color-muted-foreground)" }}>{borrow.tanggalPinjam} → {borrow.tanggalKembali || borrow.batasKembali}</p><span className="inline-flex items-center gap-1 mt-2 text-[11px] px-2 py-1 rounded-full" style={{ background: "var(--color-muted)", color: "var(--color-muted-foreground)" }}>{statusLabel[borrow.status]}</span></div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end"><p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>{borrow.paymentMethod || "Gratis"}</p>{unpaid ? <button onClick={() => setSelectedFine(borrow)} className="px-3 min-h-[44px] rounded-full text-xs font-bold text-white flex items-center gap-1.5" style={{ background: "var(--color-primary)" }}><CreditCard size={13} /> Bayar Rp {borrow.denda.toLocaleString("id-ID")}</button> : borrow.dendaStatus === "lunas" && borrow.denda > 0 ? <span className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 size={13} /> Denda lunas</span> : null}</div>
                </div>;
              })}
            </div>
          )}
        </div>
        <MidtransPaymentModal isOpen={!!selectedFine} borrow={selectedFine} onClose={() => setSelectedFine(null)} onSuccess={() => { setSelectedFine(null); loadHistory(); }} />
      </div>
    </PageTransition>
  );
}
