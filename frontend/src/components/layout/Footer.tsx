// ============================================================
// Footer — Study footer with configurable text + i18n
// ============================================================

"use client";

import { useT } from "@/i18n/provider";

export default function Footer() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="w-full px-6 py-4 border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          © {year} {t("footer.copyright")}
        </span>
        <span className="text-slate-600">
          v2.0.0 · WIB (UTC+7)
        </span>
      </div>
    </footer>
  );
}
