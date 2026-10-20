import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getReadingGoal, setReadingGoal, type ReadingGoal } from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import { Target, Edit2, Check, X } from "lucide-react";
import { motion } from "framer-motion";

export function ReadingGoalWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(4);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  useEffect(() => {
    if (user) {
      getReadingGoal(user.uid, currentMonth).then((g) => {
        setGoal(g);
        if (g) setTarget(g.target);
        setLoading(false);
      });
    }
  }, [user, currentMonth]);

  async function handleSave() {
    if (!user) return;
    try {
      await setReadingGoal(user.uid, currentMonth, target);
      const updated = await getReadingGoal(user.uid, currentMonth);
      setGoal(updated);
      setEditing(false);
      toast("success", "Target membaca diperbarui!");
    } catch (err) {
      toast("error", "Gagal menyimpan target");
    }
  }

  if (loading) return null;

  const current = goal?.current || 0;
  const targetNum = goal?.target || target;
  const progress = Math.min(100, Math.round((current / targetNum) * 100));
  const completed = current >= targetNum;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-tagline flex items-center gap-2">
          <Target size={18} style={{ color: "var(--color-primary)" }} /> Target Bulanan
        </h3>
        {!editing && (
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--color-muted-foreground)" }}>
            <Edit2 size={14} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={30}
            value={target}
            onChange={(e) => setTarget(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
            className="w-20 h-9 text-center rounded-lg text-sm font-bold border outline-none"
            style={{ background: "var(--color-muted)", borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
          />
          <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>buku/bulan</span>
          <button onClick={handleSave} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--color-primary)", color: "white" }}>
            <Check size={14} />
          </button>
          <button onClick={() => { setEditing(false); setTarget(goal?.target || 4); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--color-muted)" }}>
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-2xl font-bold" style={{ color: completed ? "var(--color-primary)" : "var(--color-foreground)" }}>
              {current}
            </span>
            <span className="text-sm mb-0.5" style={{ color: "var(--color-muted-foreground)" }}>/ {targetNum} buku</span>
          </div>

          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--color-muted)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: completed ? "var(--color-primary)" : "var(--color-accent)" }}
            />
          </div>

          <p className="text-[10px] mt-2" style={{ color: "var(--color-muted-foreground)" }}>
            {completed
              ? "Selamat! Target bulanan tercapai!"
              : `${targetNum - current} buku lagi untuk mencapai target`}
          </p>
        </>
      )}
    </div>
  );
}
