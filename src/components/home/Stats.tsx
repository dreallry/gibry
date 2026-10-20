import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { getBookStats } from "@/lib/firestore";
import { BookOpen, BookCheck, Users } from "lucide-react";

interface StatItemProps {
  value: number;
  label: string;
  icon: React.ElementType;
}

function AnimatedCounter({ value, label, icon: Icon }: StatItemProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else { setCount(Math.floor(start)); }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="text-center"
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 stat-icon bg-[#DCE2CD]/15">
        <Icon size={22} className="text-[#DCE2CD]" />
      </div>
      <div className="text-[44px] font-bold font-editorial tracking-tight leading-none text-[#FFF9EF]">
        {count}
      </div>
      <div className="text-sm mt-2 font-space text-[#DCE2CD]/80">{label}</div>
    </motion.div>
  );
}

export default function Stats() {
  const [stats, setStats] = useState({ total: 0, available: 0, members: 0 });

  useEffect(() => {
    getBookStats().then(setStats).catch(() => {});
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#304D42] border-t border-[#304D42]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full blur-3xl bg-[#AD6549]/10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl bg-[#DCE2CD]/05" />
      </div>
      <div className="max-w-5xl mx-auto px-6 py-20 relative">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
          <AnimatedCounter value={stats.total} label="Total Buku" icon={BookOpen} />
          <AnimatedCounter value={stats.available} label="Buku Tersedia" icon={BookCheck} />
          <AnimatedCounter value={stats.members} label="Anggota Aktif" icon={Users} />
        </div>
      </div>
    </section>
  );
}
