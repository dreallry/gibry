import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile } from "@/lib/firestore";
import { BookOpen, Search, ClipboardCheck, Users, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  {
    icon: BookOpen,
    title: "Selamat Datang di Gibry!",
    description: "Platform perpustakaan digital modern. Temukan ribuan buku dan kelola aktivitas membaca Anda secara daring.",
    color: "#304D42",
  },
  {
    icon: Search,
    title: "Jelajahi Katalog",
    description: "Cari buku berdasarkan judul, penulis, atau genre. Pinjam buku digital atau booking buku fisik untuk diambil di perpustakaan.",
    color: "#AD6549",
  },
  {
    icon: ClipboardCheck,
    title: "Catat Kunjungan",
    description: "Presensi online saat berkunjung ke perpustakaan. Raih pencapaian dan naik level dengan aktif membaca!",
    color: "#304D42",
  },
  {
    icon: Users,
    title: "Terhubung dengan Teman",
    description: "Bergabung dengan komunitas, ikut Book Clubs, dan berbagi pengalaman membaca dengan sesama siswa.",
    color: "#AD6549",
  },
];

export function WelcomeModal() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  const isAuthPage = location.pathname === "/login" || location.pathname === "/verify-email";

  useEffect(() => {
    if (isAuthPage) {
      setShow(false);
      return;
    }
    // Check if user is new (no onboarding completed)
    if (user && profile && !profile.onboardingCompleted) {
      // Show modal after a short delay
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, profile, isAuthPage]);

  async function handleComplete() {
    if (user) {
      try {
        await updateUserProfile(user.uid, { onboardingCompleted: true });
        await refreshProfile();
      } catch (err) {
        console.error(err);
      }
    }
    setShow(false);
  }

  function handleNext() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  }

  if (!show) return null;

  const currentStep = steps[step];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="rounded-3xl max-w-md w-full p-8 shadow-2xl relative overflow-hidden"
            style={{ background: "var(--color-card)" }}
          >
            {/* Close button */}
            <button
              onClick={handleComplete}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "var(--color-muted)", color: "var(--color-muted-foreground)" }}
            >
              <X size={16} />
            </button>

            {/* Icon */}
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: `${currentStep.color}15`, color: currentStep.color }}
            >
              <currentStep.icon size={28} />
            </motion.div>

            {/* Content */}
            <motion.div
              key={`content-${step}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <h2 className="text-xl font-bold mb-3">{currentStep.title}</h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
                {currentStep.description}
              </p>
            </motion.div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    background: i === step ? "var(--color-primary)" : "var(--color-border)",
                    width: i === step ? "20px" : "8px",
                  }}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleComplete}
                className="flex-1 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{ color: "var(--color-muted-foreground)", background: "var(--color-muted)" }}
              >
                Lewati
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-2.5 rounded-full text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
                style={{ background: "var(--color-primary)" }}
              >
                {step < steps.length - 1 ? "Selanjutnya" : "Mulai"}
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
