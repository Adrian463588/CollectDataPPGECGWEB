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

// Only `text` is kept for the stimulus word's ink color.
// Button styles are intentionally neutral — participants must NOT be able to
// match the answer button color to the stimulus ink color (that would bypass
// the Stroop cognitive-interference task).
export const STROOP_COLORS: Record<StroopColor, { text: string; label: string }> = {
  red:    { text: "text-red-400",    label: "Red" },
  green:  { text: "text-green-400",  label: "Green" },
  blue:   { text: "text-blue-400",   label: "Blue" },
  yellow: { text: "text-yellow-400", label: "Yellow" },
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
          {t(`colors.${problem.word}`)?.toUpperCase() || problem.word.toUpperCase()}
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

      {/* Color choice buttons — 2×2 grid
           All buttons use the SAME neutral monochrome style.
           Coloured styling is deliberately absent here: the ink colour
           must only appear on the stimulus word above, not on the options. */}
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
              aria-label={`Choose ${t(`colors.${color}`) || style.label}`}
              className="
                h-14 rounded-xl font-bold text-base transition-colors
                bg-slate-800 text-white border border-slate-600
                hover:bg-slate-700 hover:border-slate-500
                disabled:opacity-40 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-white/20
              "
            >
              {t(`colors.${color}`) || style.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
