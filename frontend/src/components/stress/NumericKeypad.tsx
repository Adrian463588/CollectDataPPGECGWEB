// ============================================================
// NumericKeypad — On-screen number input for math responses
// Max digits enforced to prevent large number issues.
// ============================================================

"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

/** Maximum digits allowed in answer input (configurable) */
const MAX_DIGITS = 6;

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

  // Auto-clear error message
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
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
      showError(`Maximum ${MAX_DIGITS} digits`, "too_many_digits");
      return;
    }
    onChange(value + digit);
  };

  const handleBackspace = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    if (disabled) return;
    onChange("");
    setError(null);
  };

  const keys = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    ["C", "0", "⌫"],
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Input display */}
      <div className="w-full max-w-xs">
        <div className="bg-slate-800/80 rounded-xl px-6 py-4 border border-slate-700/50 text-center">
          <span className="text-3xl font-mono font-bold text-white tabular-nums">
            {value || <span className="text-slate-600">—</span>}
          </span>
        </div>
        {/* Inline error */}
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
          {value.length}/{MAX_DIGITS} digits
        </p>
      </div>

      {/* Keypad grid */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        {keys.flat().map((key) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              h-14 rounded-xl font-bold text-xl transition-colors
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              ${
                key === "C"
                  ? "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/30"
                  : key === "⌫"
                    ? "bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30"
                    : "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700/50"
              }
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
            disabled={disabled}
            onClick={() => {
              if (key === "C") handleClear();
              else if (key === "⌫") handleBackspace();
              else handleDigit(key);
            }}
            aria-label={
              key === "C" ? "Clear" : key === "⌫" ? "Backspace" : `Digit ${key}`
            }
          >
            {key}
          </motion.button>
        ))}
      </div>

      {/* Submit button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          w-full max-w-xs h-14 rounded-xl font-bold text-lg
          bg-indigo-600 text-white hover:bg-indigo-700
          disabled:opacity-40 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-indigo-500
          transition-colors
        `}
        onClick={onSubmit}
        disabled={disabled || !value}
        aria-label="Submit answer"
      >
        Submit
      </motion.button>
    </div>
  );
}
