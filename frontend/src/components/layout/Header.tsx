// ============================================================
// Header — Sticky app bar with navigation + language toggle
// Shows nav links only when NOT in an active experiment phase.
// ============================================================

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/i18n/provider";

interface HeaderProps {
  children?: ReactNode;
}

/** Paths where nav links should be hidden (active experiment phases) */
const HIDE_NAV_PATTERNS = [
  "/device-check",
  "/relaxation",
  "/routine",
  "/stress",
];

export default function Header({ children }: HeaderProps) {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLanguage();

  // Hide nav links during active experiment phases
  const showNav = !HIDE_NAV_PATTERNS.some((p) => pathname.includes(p));

  const isActive = (href: string) => {
    if (href === "/session/new") return pathname === "/session/new" || pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full px-6 py-3 flex items-center justify-between border-b border-slate-800/50 bg-slate-950/90 backdrop-blur-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
          <span className="text-white text-sm font-bold">E</span>
        </div>
        <h1 className="text-lg font-semibold text-white">{t("header.title")}</h1>
      </div>

      <div className="flex items-center gap-4">
        {showNav && (
          <nav className="flex items-center gap-1 mr-2" aria-label="Main navigation">
            <Link
              href="/session/new"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                isActive("/session/new")
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {t("session.newSession")}
            </Link>
            <Link
              href="/export"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                isActive("/export")
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {t("header.export")}
            </Link>
          </nav>
        )}

        {/* Language Toggle */}
        <button
          onClick={() => setLocale(locale === "en" ? "id" : "en")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          id="lang-toggle-btn"
          aria-label="Toggle language"
          title={locale === "en" ? "Ganti ke Bahasa Indonesia" : "Switch to English"}
        >
          <span className="text-sm">🌐</span>
          <span>{locale === "en" ? "EN" : "ID"}</span>
        </button>

        {children && <div className="flex items-center gap-4">{children}</div>}
      </div>
    </header>
  );
}
