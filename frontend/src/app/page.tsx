// ============================================================
// Root Page — Redirects to /session/new
// ============================================================

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/provider";

export default function HomePage() {
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    router.replace("/session/new");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-slate-400">{t("common.loading")}</div>
    </div>
  );
}
