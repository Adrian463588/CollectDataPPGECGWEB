// ============================================================
// BreathingCircle — Calming breathing animation for relaxation phase
// ============================================================

"use client";

import { motion } from "framer-motion";

interface BreathingCircleProps {
  /** Enable/disable animation (for prefers-reduced-motion) */
  animate?: boolean;
}

export default function BreathingCircle({ animate = true }: BreathingCircleProps) {
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer glow ring */}
      <motion.div
        className="absolute w-full h-full rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20"
        animate={
          animate
            ? {
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.1, 0.3],
              }
            : {}
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Middle ring */}
      <motion.div
        className="absolute w-48 h-48 rounded-full bg-gradient-to-br from-teal-400/30 to-cyan-400/30 backdrop-blur-sm"
        animate={
          animate
            ? {
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.2, 0.5],
              }
            : {}
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.2,
        }}
      />

      {/* Core circle with breathing text */}
      <motion.div
        className="relative w-32 h-32 rounded-full bg-gradient-to-br from-teal-500/60 to-cyan-500/60 backdrop-blur-xl flex items-center justify-center border border-teal-400/30"
        animate={
          animate
            ? {
                scale: [1, 1.15, 1],
              }
            : {}
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.4,
        }}
      >
        <motion.span
          className="text-sm font-medium text-teal-100"
          animate={
            animate
              ? {
                  opacity: [1, 0.5, 0, 0.5, 1],
                }
              : {}
          }
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          <motion.span
            key="breathe"
            animate={
              animate
                ? {
                    opacity: [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
                  }
                : {}
            }
            transition={{
              duration: 8,
              repeat: Infinity,
              times: [0, 0.05, 0.23, 0.25, 0.27, 0.48, 0.5, 0.55, 0.73, 0.75],
            }}
          >
            Breathe
          </motion.span>
        </motion.span>
      </motion.div>
    </div>
  );
}
