// ============================================================
// AppShell — Global layout wrapper with Header + Footer
// ============================================================

import type { ReactNode } from "react";
import Footer from "./Footer";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      <Footer />
    </div>
  );
}
