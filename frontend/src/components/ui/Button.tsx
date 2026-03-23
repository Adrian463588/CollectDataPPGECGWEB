// ============================================================
// Button — Reusable button component with variants
// ============================================================

"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

// We pick only the native button attrs we actually need, then spread safe MotionProps
interface ButtonProps {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  loading?: boolean;
  // Explicit native props (avoids Framer Motion / React event handler type conflict)
  id?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  form?: string;
}

const variants = {
  primary:
    "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25",
  secondary:
    "bg-slate-700 hover:bg-slate-600 text-slate-100 shadow-lg shadow-slate-700/25",
  danger:
    "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25",
  ghost:
    "bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700",
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  loading = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  // Use HTMLMotionProps directly to avoid ButtonHTMLAttributes ↔ MotionProps type conflict
  const motionProps: HTMLMotionProps<"button"> = {
    whileHover: { scale: disabled ? 1 : 1.02 },
    whileTap: { scale: disabled ? 1 : 0.98 },
    className: `
      inline-flex items-center justify-center rounded-xl font-semibold
      transition-colors duration-200 focus:outline-none focus:ring-2
      focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900
      disabled:opacity-50 disabled:cursor-not-allowed
      ${variants[variant]} ${sizes[size]} ${className}
    `,
    disabled: disabled || loading,
    "aria-busy": loading,
    "aria-disabled": disabled || loading,
    ...props,
  };

  return (
    <motion.button {...motionProps}>
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </motion.button>
  );
}
