// ============================================================
// AppShell — Global layout wrapper with Header + Footer
// Renders Header globally so pages don't need to include it.
// ============================================================

"use client";

import type { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      <Footer />
    </div>
  );
}
