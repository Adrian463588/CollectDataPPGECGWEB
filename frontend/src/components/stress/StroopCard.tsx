// ============================================================
// StroopCard — Stroop Color Word Test stimulus + response buttons
// Word = color name written in a DIFFERENT ink color.
// Participant must select the INK color (not the word meaning).
// ============================================================

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/i18n/provider";

// ---- Domain Types ----

export type StroopColor = "red" | "green" | "blue" | "yellow";

export interface StroopProblem {
  id: string;
  /** The word displayed (color name) */
  word: StroopColor;
  /** The actual ink/text color — always different from word */
  inkColor: StroopColor;
  /** The correct answer the participant must choose */
  correctAnswer: StroopColor;
}

// Tailwind color classes keyed by StroopColor
export const STROOP_COLORS: Record<StroopColor, { text: string; bg: string; border: string; label: string }> = {
  red:    { text: "text-red-400",    bg: "bg-red-500/20",    border: "border-red-500/40",    label: "Red" },
  green:  { text: "text-green-400",  bg: "bg-green-500/20",  border: "border-green-500/40",  label: "Green" },
  blue:   { text: "text-blue-400",   bg: "bg-blue-500/20",   border: "border-blue-500/40",   label: "Blue" },
  yellow: { text: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/40", label: "Yellow" },
};

export const ALL_STROOP_COLORS: StroopColor[] = ["red", "green", "blue", "yellow"];

// ---- Component ----

interface StroopCardProps {
  problem: StroopProblem;
  questionNumber: number;
  feedback: "correct" | "incorrect" | "timeout" | null;
  disabled: boolean;
  onAnswer: (color: StroopColor) => void;
}

export default function StroopCard({
  problem,
  questionNumber,
  feedback,
  disabled,
  onAnswer,
}: StroopCardProps) {
  const t = useT();
  const inkStyle = STROOP_COLORS[problem.inkColor];

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm">
      {/* Label */}
      <p className="text-sm font-medium text-slate-400">
        {t("stress.stroopInstruction")} — {t("common.question")} {questionNumber}
      </p>

      {/* Stroop stimulus card */}
      <motion.div
        key={problem.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="bg-slate-800/80 rounded-2xl px-12 py-8 border border-slate-700/50 w-full text-center"
      >
        <span className={`text-5xl font-bold uppercase tracking-widest ${inkStyle.text}`}>
          {problem.word.toUpperCase()}
        </span>
      </motion.div>

      {/* Instruction */}
      <p className="text-xs text-slate-500 text-center">
        {t("stress.pickInkColor")}
      </p>

      {/* Feedback overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`
              text-lg font-bold px-6 py-2 rounded-xl
              ${
                feedback === "correct"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : feedback === "incorrect"
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }
            `}
          >
            {feedback === "correct" ? "✓ Correct" : feedback === "incorrect" ? "✗ Incorrect" : "⏱ Time's up"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color choice buttons — 2×2 grid */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {ALL_STROOP_COLORS.map((color) => {
          const style = STROOP_COLORS[color];
          return (
            <motion.button
              key={color}
              whileHover={{ scale: disabled ? 1 : 1.04 }}
              whileTap={{ scale: disabled ? 1 : 0.96 }}
              onClick={() => !disabled && onAnswer(color)}
              disabled={disabled}
              aria-label={`Choose ${style.label}`}
              className={`
                h-14 rounded-xl font-bold text-base transition-colors
                ${style.bg} ${style.text} ${style.border} border
                disabled:opacity-40 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 ${style.border}
              `}
            >
              {style.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
