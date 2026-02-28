// ============================================================
// Header — Session header with branding
// ============================================================

import type { ReactNode } from "react";

interface HeaderProps {
  children?: ReactNode;
}

export default function Header({ children }: HeaderProps) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Experiment Controller";

  return (
    <header className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
          <span className="text-white text-sm font-bold">E</span>
        </div>
        <h1 className="text-lg font-semibold text-white">{appName}</h1>
      </div>
      {children && <div className="flex items-center gap-4">{children}</div>}
    </header>
  );
}
