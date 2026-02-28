// ============================================================
// CountdownTimer — Animated countdown display
// ============================================================

"use client";

import { motion } from "framer-motion";
import { formatCountdown } from "@/lib/time";

interface CountdownTimerProps {
  remainingMs: number;
  totalMs: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

const fontSizes = {
  sm: "text-2xl",
  md: "text-5xl",
  lg: "text-7xl",
};

export default function CountdownTimer({
  remainingMs,
  totalMs,
  label,
  size = "md",
}: CountdownTimerProps) {
  const progress = totalMs > 0 ? Math.max(0, remainingMs / totalMs) : 0;
  const isWarning = remainingMs > 0 && remainingMs <= 30_000; // Last 30 seconds
  const isCritical = remainingMs > 0 && remainingMs <= 10_000; // Last 10 seconds

  return (
    <div className="flex flex-col items-center gap-3">
      {label && (
        <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </p>
      )}

      <motion.div
        className={`
          ${fontSizes[size]} font-mono font-bold tabular-nums
          ${isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-white"}
        `}
        animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
        transition={isCritical ? { repeat: Infinity, duration: 1 } : {}}
      >
        {formatCountdown(remainingMs)}
      </motion.div>

      {/* Progress bar */}
      <div className="w-full max-w-xs h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            isCritical
              ? "bg-red-500"
              : isWarning
                ? "bg-amber-500"
                : "bg-indigo-500"
          }`}
          style={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </div>
  );
}
