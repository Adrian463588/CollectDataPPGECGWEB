// ============================================================
// BoxBreathingCircle — Animated circle for box breathing protocol
// Expands on inhale, holds, contracts on exhale, holds.
// Displays step label + countdown seconds.
// Labels are resolved via i18n so they respect the active locale.
// ============================================================

"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { BreathingStep } from "@/lib/types";
import { useT } from "@/i18n/provider";

interface BoxBreathingCircleProps {
  /** Current breathing step */
  currentStep: BreathingStep;
  /** @deprecated Label is now derived from i18n — this prop is unused */
  stepLabel?: string;
  /** Remaining ms in current step */
  stepRemainingMs: number;
  /** Total ms for current step */
  stepTotalMs: number;
}

/** Maps each BreathingStep to its i18n key in the relaxation namespace */
const STEP_LABEL_KEYS: Record<BreathingStep, string> = {
  inhale: "relaxation.breatheIn",
  hold_after_inhale: "relaxation.hold",
  exhale: "relaxation.breatheOut",
  hold_after_exhale: "relaxation.hold",
};

const STEP_COLORS: Record<BreathingStep, { from: string; to: string; border: string }> = {
  inhale: {
    from: "from-teal-500/60",
    to: "to-cyan-400/60",
    border: "border-teal-300/40",
  },
  hold_after_inhale: {
    from: "from-teal-400/50",
    to: "to-emerald-400/50",
    border: "border-teal-200/30",
  },
  exhale: {
    from: "from-cyan-500/50",
    to: "to-teal-600/50",
    border: "border-cyan-400/30",
  },
  hold_after_exhale: {
    from: "from-teal-600/40",
    to: "to-slate-600/40",
    border: "border-teal-500/20",
  },
};

const STEP_SCALES: Record<BreathingStep, { from: number; to: number }> = {
  inhale: { from: 1.0, to: 1.3 },
  hold_after_inhale: { from: 1.3, to: 1.3 },
  exhale: { from: 1.3, to: 1.0 },
  hold_after_exhale: { from: 1.0, to: 1.0 },
};

export default function BoxBreathingCircle({
  currentStep,
  stepRemainingMs,
  stepTotalMs,
}: BoxBreathingCircleProps) {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();

  const translatedLabel = t(STEP_LABEL_KEYS[currentStep]);

  const secondsLeft = Math.ceil(stepRemainingMs / 1000);
  const progress = 1 - stepRemainingMs / stepTotalMs; // 0 → 1
  const colors = STEP_COLORS[currentStep];
  const scales = STEP_SCALES[currentStep];

  // Scale interpolation based on progress
  const currentScale = useMemo(() => {
    if (prefersReducedMotion) return 1;
    return scales.from + (scales.to - scales.from) * progress;
  }, [scales, progress, prefersReducedMotion]);

  // Outer ring opacity pulses gently
  const outerOpacity = useMemo(() => {
    if (currentStep === "inhale" || currentStep === "exhale") {
      return 0.15 + progress * 0.15;
    }
    return 0.2; // steady during holds
  }, [currentStep, progress]);

  return (
    <div className="relative flex items-center justify-center w-72 h-72">
      {/* Outer glow ring */}
      <motion.div
        className={`absolute w-full h-full rounded-full bg-gradient-to-br ${colors.from} ${colors.to}`}
        animate={{
          scale: prefersReducedMotion ? 1 : currentScale * 1.15,
          opacity: outerOpacity,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />

      {/* Middle ring */}
      <motion.div
        className={`absolute w-56 h-56 rounded-full bg-gradient-to-br ${colors.from} ${colors.to} backdrop-blur-sm`}
        animate={{
          scale: prefersReducedMotion ? 1 : currentScale * 1.05,
          opacity: prefersReducedMotion ? 0.6 : 0.3 + progress * 0.15,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />

      {/* Core circle */}
      <motion.div
        className={`relative w-40 h-40 rounded-full bg-gradient-to-br ${colors.from} ${colors.to} backdrop-blur-xl flex flex-col items-center justify-center border ${colors.border} gap-1`}
        animate={{
          scale: prefersReducedMotion ? 1 : currentScale,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Step label */}
        <motion.span
          key={currentStep}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-medium text-teal-100 uppercase tracking-wider"
        >
          {translatedLabel}
        </motion.span>

        {/* Step countdown seconds */}
        <motion.span
          key={`${currentStep}-${secondsLeft}`}
          initial={{ opacity: 0.5, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="text-3xl font-bold text-white font-mono"
        >
          {secondsLeft}
        </motion.span>
      </motion.div>
    </div>
  );
}
