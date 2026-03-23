// ============================================================
// ScoreDisplay — Running score tracker (i18n)
// ============================================================

"use client";

import { motion } from "framer-motion";
import { useT } from "@/i18n/provider";

interface ScoreDisplayProps {
  correct: number;
  total: number;
  visible?: boolean;
}

export default function ScoreDisplay({
  correct,
  total,
  visible = true,
}: ScoreDisplayProps) {
  const t = useT();

  if (!visible) return null;

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-5 py-3 border border-slate-700/40"
    >
      <div className="text-sm text-slate-400">{t("stress.score")}</div>
      <div className="text-xl font-bold font-mono text-white tabular-nums">
        {correct}
        <span className="text-slate-500 mx-1">/</span>
        {total}
      </div>
      <div className="text-sm text-slate-500">({percentage}%)</div>
    </motion.div>
  );
}
