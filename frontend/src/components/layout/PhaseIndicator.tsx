// ============================================================
// PhaseIndicator — Shows current phase name + icon (i18n)
// ============================================================

"use client";

import { motion } from "framer-motion";
import type { Phase } from "@/lib/types";
import { useT } from "@/i18n/provider";

interface PhaseIndicatorProps {
  phase: Phase;
}

const phaseConfig: Record<Phase, { i18nKey: string; emoji: string; color: string }> = {
  INTRO: { i18nKey: "phases.intro", emoji: "📋", color: "text-slate-300" },
  DEVICE_CHECK: { i18nKey: "phases.deviceCheck", emoji: "⌚", color: "text-blue-400" },
  COUNTDOWN: { i18nKey: "phases.countdown", emoji: "⏳", color: "text-amber-400" },
  RELAXATION: { i18nKey: "phases.relaxation", emoji: "🌊", color: "text-teal-400" },
  ROUTINE: { i18nKey: "phases.routine", emoji: "📝", color: "text-violet-400" },
  STRESS: { i18nKey: "phases.stress", emoji: "🧮", color: "text-red-400" },
  COMPLETE: { i18nKey: "phases.complete", emoji: "✅", color: "text-emerald-400" },
};

export default function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  const t = useT();
  const config = phaseConfig[phase];

  return (
    <motion.div
      key={phase}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2"
    >
      <span className="text-lg">{config.emoji}</span>
      <span className={`text-sm font-semibold ${config.color}`}>
        {t(config.i18nKey)}
      </span>
    </motion.div>
  );
}
