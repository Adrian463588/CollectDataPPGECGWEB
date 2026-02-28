// ============================================================
// ProgressBar — Session phase progress indicator
// ============================================================

"use client";

import { motion } from "framer-motion";
import type { Phase } from "@/lib/types";
import { getAllPhases, getPhaseIndex } from "@/lib/phase-machine";

interface ProgressBarProps {
  currentPhase: Phase;
}

const phaseLabels: Record<Phase, string> = {
  INTRO: "Intro",
  DEVICE_CHECK: "Devices",
  COUNTDOWN: "Ready",
  RELAXATION: "Relax",
  STRESS: "Task",
  COMPLETE: "Done",
};

export default function ProgressBar({ currentPhase }: ProgressBarProps) {
  const phases = getAllPhases();
  const currentIndex = getPhaseIndex(currentPhase);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        {phases.map((phase, index) => (
          <div key={phase} className="flex items-center flex-1 last:flex-none">
            {/* Step circle */}
            <motion.div
              className={`
                relative w-8 h-8 rounded-full flex items-center justify-center
                text-xs font-bold transition-colors duration-300 z-10
                ${
                  index < currentIndex
                    ? "bg-indigo-600 text-white"
                    : index === currentIndex
                      ? "bg-indigo-500 text-white ring-4 ring-indigo-500/30"
                      : "bg-slate-800 text-slate-500"
                }
              `}
              animate={
                index === currentIndex
                  ? { scale: [1, 1.1, 1] }
                  : {}
              }
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {index < currentIndex ? "✓" : index + 1}
            </motion.div>

            {/* Label */}
            <span
              className={`
                absolute mt-12 text-[10px] font-medium tracking-wide
                ${index <= currentIndex ? "text-indigo-400" : "text-slate-600"}
              `}
              style={{ transform: "translateX(-25%)" }}
            >
              {phaseLabels[phase]}
            </span>

            {/* Connector line */}
            {index < phases.length - 1 && (
              <div className="flex-1 h-0.5 mx-1">
                <div
                  className={`h-full rounded transition-colors duration-300 ${
                    index < currentIndex ? "bg-indigo-600" : "bg-slate-800"
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
