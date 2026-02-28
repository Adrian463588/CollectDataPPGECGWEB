// ============================================================
// PhaseIndicator — Shows current phase name + icon
// ============================================================

"use client";

import { motion } from "framer-motion";
import type { Phase } from "@/lib/types";

interface PhaseIndicatorProps {
  phase: Phase;
}

const phaseConfig: Record<Phase, { label: string; emoji: string; color: string }> = {
  INTRO: { label: "Introduction", emoji: "📋", color: "text-slate-300" },
  DEVICE_CHECK: { label: "Device Check", emoji: "⌚", color: "text-blue-400" },
  COUNTDOWN: { label: "Get Ready", emoji: "⏳", color: "text-amber-400" },
  RELAXATION: { label: "Relaxation", emoji: "🌊", color: "text-teal-400" },
  ROUTINE: { label: "Researcher Notes", emoji: "📝", color: "text-violet-400" },
  STRESS: { label: "Mental Arithmetic", emoji: "🧮", color: "text-red-400" },
  COMPLETE: { label: "Complete", emoji: "✅", color: "text-emerald-400" },
};

export default function PhaseIndicator({ phase }: PhaseIndicatorProps) {
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
        {config.label}
      </span>
    </motion.div>
  );
}
