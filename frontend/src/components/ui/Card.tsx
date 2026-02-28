// ============================================================
// Card — Glassmorphism card container
// ============================================================

import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`
        bg-slate-900/60 backdrop-blur-xl border border-slate-800/50
        rounded-2xl p-8 shadow-2xl shadow-black/20
        ${className}
      `}
    >
      {children}
    </div>
  );
}
