// ============================================================
// NumericKeypad — On-screen number input for math responses
// Layout: fixed 288px container → 3-col CSS Grid → ~88px square keys.
// Max digits enforced to 6 to prevent overflow.
// ============================================================

"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

/** Maximum digits allowed in answer input.
 * Exported so keyboard handlers elsewhere can apply the same limit (DRY). */
export const MAX_DIGITS = 6;

// Keypad rows — extracted as a constant (DRY, easy to reconfigure)
const KEYPAD_ROWS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["C", "0", "⌫"],
] as const;

type Key = (typeof KEYPAD_ROWS)[number][number];

// Returns the Tailwind classes for each key variant (Single Responsibility)
function keyStyle(key: Key): string {
  if (key === "C")  return "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/30";
  if (key === "⌫") return "bg-red-600/20   text-red-400   hover:bg-red-600/30   border border-red-600/30";
  return "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700/50";
}

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onValidationError?: (reason: string) => void;
  disabled?: boolean;
}

export default function NumericKeypad({
  value,
  onChange,
  onSubmit,
  onValidationError,
  disabled = false,
}: NumericKeypadProps) {
  const [error, setError] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Cleanup error timer on unmount
  useEffect(() => {
    return () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); };
  }, []);

  const showError = (msg: string, reason: string) => {
    setError(msg);
    onValidationError?.(reason);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 2000);
  };

  const handleDigit = (digit: string) => {
    if (disabled) return;
    if (value.length >= MAX_DIGITS) {
      showError(`Max ${MAX_DIGITS} digits`, "too_many_digits");
      return;
    }
    onChange(value + digit);
  };

  const handleBackspace = () => { if (!disabled) { onChange(value.slice(0, -1)); setError(null); } };
  const handleClear     = () => { if (!disabled) { onChange("");                  setError(null); } };

  const handleKey = (key: Key) => {
    if (key === "C")  return handleClear();
    if (key === "⌫") return handleBackspace();
    handleDigit(key);
  };

  return (
    // ── Fixed-width shell ─────────────────────────────────────────────────
    // 288px  = 3 cols × ~88px  +  2 gaps × 12px  (gap-3 = 12px)
    // Fixes the "wide on big screens / squashed on small screens" problem.
    <div className="flex flex-col items-center gap-4">
      <div className="w-[288px] flex flex-col gap-3">

        {/* ── Answer display ──────────────────────────────────────────── */}
        <div>
          <div className="bg-slate-800/80 rounded-xl px-6 py-4 border border-slate-700/50 text-center">
            <span className="text-3xl font-mono font-bold text-white tabular-nums">
              {value || <span className="text-slate-600">—</span>}
            </span>
          </div>

          {/* Inline validation error */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-amber-400 text-center mt-1.5"
              role="alert"
            >
              {error}
            </motion.p>
          )}

          {/* Digit counter */}
          <p className="text-xs text-slate-600 text-center mt-1">
            {value.length} / {MAX_DIGITS} digits
          </p>
        </div>

        {/* ── Numpad grid (3 cols, consistent gap) ────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {KEYPAD_ROWS.flat().map((key) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                h-14 w-full rounded-xl font-bold text-xl transition-colors
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                disabled:opacity-40 disabled:cursor-not-allowed
                ${keyStyle(key)}
              `}
              disabled={disabled}
              onClick={() => handleKey(key)}
              aria-label={key === "C" ? "Clear" : key === "⌫" ? "Backspace" : `Digit ${key}`}
            >
              {key}
            </motion.button>
          ))}
        </div>

        {/* ── Submit button (same width as the numpad grid) ───────────── */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            w-full h-14 rounded-xl font-bold text-lg transition-colors
            bg-indigo-600 text-white hover:bg-indigo-700
            disabled:opacity-40 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-indigo-500
          `}
          onClick={onSubmit}
          disabled={disabled || !value}
          aria-label="Submit answer"
        >
          Submit
        </motion.button>

      </div>
    </div>
  );
}
