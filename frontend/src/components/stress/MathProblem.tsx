// ============================================================
// MathProblem — Displays a mental arithmetic problem
// ============================================================

"use client";

import { motion, AnimatePresence } from "framer-motion";

interface MathProblemProps {
  problemText: string;
  questionNumber: number;
  totalQuestions?: number;
  feedback?: "correct" | "incorrect" | "timeout" | null;
}

export default function MathProblem({
  problemText,
  questionNumber,
  totalQuestions,
  feedback,
}: MathProblemProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Question number */}
      <p className="text-sm font-medium text-slate-400">
        Question {questionNumber}
        {totalQuestions ? ` / ${totalQuestions}` : ""}
      </p>

      {/* Problem display */}
      <motion.div
        key={problemText}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-slate-800/80 rounded-2xl px-12 py-8 border border-slate-700/50"
      >
        <span className="text-5xl font-mono font-bold text-white tracking-wider">
          {problemText}
        </span>
      </motion.div>

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
            {feedback === "correct"
              ? "✓ Correct"
              : feedback === "incorrect"
                ? "✗ Incorrect"
                : "⏱ Time's up"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
