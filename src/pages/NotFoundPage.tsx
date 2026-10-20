import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Search, ArrowLeft } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";

export default function NotFoundPage() {
  return (
    <PageTransition>
      <div className="tile">
        <div className="max-w-xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="text-[120px] font-bold tracking-tighter leading-none mb-4" style={{ color: "var(--color-border)" }}>404</div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Halaman Tidak Ditemukan</h1>
            <p className="text-sm mb-8" style={{ color: "var(--color-muted-foreground)" }}>Sepertinya halaman yang Anda cari sudah dipindahkan atau tidak tersedia.</p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/" className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-full text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: "var(--color-primary)" }}><Home size={16} /> Kembali ke Beranda</Link>
              <Link to="/books" className="inline-flex items-center gap-2 border px-6 py-3 rounded-full text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }}><Search size={16} /> Jelajahi Koleksi</Link>
            </div>
            <button onClick={() => window.history.back()} className="mt-6 text-sm transition-colors inline-flex items-center gap-1" style={{ color: "var(--color-muted-foreground)" }}><ArrowLeft size={14} /> Halaman Sebelumnya</button>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
