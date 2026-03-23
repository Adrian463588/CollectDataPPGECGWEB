// ============================================================
// Export Page — Admin CSV export with preview + pagination
// 5 columns: participant_code, phase, start_timestamp, end_timestamp, date
// i18n: all strings via useT()
// URL param: /export?participant=CODE
// ============================================================

"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useT } from "@/i18n/provider";


type ExportStatus = "idle" | "loading" | "success" | "error";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8081";

interface PhaseRow {
  participant_code: string;
  phase: string;
  start_timestamp: string;
  end_timestamp: string;
  date: string;
}

interface PreviewData {
  participants: string[];
  data: Record<string, PhaseRow[]>;
}

function formatWIBFilename(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const d = String(wib.getUTCDate()).padStart(2, "0");
  const h = String(wib.getUTCHours()).padStart(2, "0");
  const min = String(wib.getUTCMinutes()).padStart(2, "0");
  return `participants_${y}-${m}-${d}_${h}-${min}_WIB.csv`;
}

function ExportContent() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [downloadStatus, setDownloadStatus] = useState<ExportStatus>("idle");
  const [lastExport, setLastExport] = useState<string | null>(null);

  // Preview state
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  // Download reset timer
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived: URL-param participant selection
  const participants = preview?.participants ?? [];
  const paramCode = searchParams.get("participant");
  const currentCode =
    participants.includes(paramCode ?? "") ? (paramCode ?? "") : (participants[0] ?? "");
  const currentIndex = participants.indexOf(currentCode);
  const currentRows = preview?.data[currentCode] ?? [];
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= participants.length - 1;

  // Sync URL when participant list loads for first time
  useEffect(() => {
    if (participants.length > 0 && !paramCode) {
      router.replace(`/export?participant=${encodeURIComponent(participants[0])}`);
    }
  }, [participants, paramCode, router]);

  // Auth handler
  const handleAuth = useCallback(async () => {
    if (!adminKey.trim()) return;
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/sessions`, {
        headers: { "X-Admin-Key": adminKey.trim() },
      });
      if (res.ok) {
        setAuthenticated(true);
      } else {
        setAuthError(t("export.invalidKey"));
      }
    } catch {
      setAuthError(t("export.serverError"));
    }
  }, [adminKey, t]);

  // Load preview on auth
  useEffect(() => {
    if (!authenticated) return;
    setPreviewLoading(true);
    setPreviewError("");
    fetch(`${API_BASE}/api/admin/export/preview`, {
      headers: { "X-Admin-Key": adminKey.trim() },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: PreviewData) => {
        setPreview(data);
      })
      .catch(() => {
        setPreviewError(t("export.previewError"));
      })
      .finally(() => setPreviewLoading(false));
  }, [authenticated, adminKey, t]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // Download CSV
  const handleDownload = useCallback(async () => {
    setDownloadStatus("loading");
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    try {
      const res = await fetch(`${API_BASE}/api/admin/export/participants.csv`, {
        headers: { "X-Admin-Key": adminKey.trim() },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = formatWIBFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadStatus("success");
      setLastExport(new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta" }) + " WIB");
      // Reset button back to idle after 3 seconds
      resetTimerRef.current = setTimeout(() => setDownloadStatus("idle"), 3000);
    } catch {
      setDownloadStatus("error");
      resetTimerRef.current = setTimeout(() => setDownloadStatus("idle"), 3000);
    }
  }, [adminKey]);

  // Pagination handlers — update URL param
  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      const prev = participants[currentIndex - 1];
      router.replace(`/export?participant=${encodeURIComponent(prev)}`);
    }
  }, [currentIndex, participants, router]);

  const goToNext = useCallback(() => {
    if (currentIndex < participants.length - 1) {
      const next = participants[currentIndex + 1];
      router.replace(`/export?participant=${encodeURIComponent(next)}`);
    }
  }, [currentIndex, participants, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl"
        >
          {!authenticated ? (
            /* ---- Auth Gate ---- */
            <Card>
              <h2 className="text-2xl font-bold text-white mb-2">{t("export.title")}</h2>
              <p className="text-sm text-slate-400 mb-6">
                {t("export.subtitle")}
              </p>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder={t("export.adminKeyPlaceholder")}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                id="admin-key-input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAuth();
                }}
              />
              {authError && (
                <p className="text-sm text-red-400 mb-4" role="alert">{authError}</p>
              )}
              <Button
                onClick={handleAuth}
                disabled={!adminKey.trim()}
                id="auth-btn"
                className="w-full"
              >
                {t("common.authenticate")}
              </Button>
            </Card>
          ) : (
            /* ---- Export Dashboard ---- */
            <Card>
              <h2 className="text-2xl font-bold text-white mb-2">
                {t("export.dashboardTitle")}
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                {t("export.dashboardSubtitle")}
              </p>

              {/* Preview Section */}
              {previewLoading && (
                <div className="text-center py-8 text-slate-400">
                  <span className="animate-spin inline-block mr-2">⏳</span>
                  {t("export.previewLoading")}
                </div>
              )}

              {previewError && (
                <p className="text-sm text-red-400 mb-4" role="alert">{previewError}</p>
              )}

              {preview && participants.length > 0 && (
                <div className="mb-6">
                  {/* Participant Pagination Header */}
                  <div className="flex items-center justify-between mb-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={goToPrev}
                      disabled={isFirst}
                      id="prev-participant-btn"
                      aria-label="Previous participant"
                    >
                      {t("common.previous")}
                    </Button>

                    <div className="text-center">
                      <p className="text-lg font-bold text-white font-mono">{currentCode}</p>
                      <p className="text-xs text-slate-500">
                        {t("export.participant")} {currentIndex + 1} {t("export.of")} {participants.length}
                      </p>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={goToNext}
                      disabled={isLast}
                      id="next-participant-btn"
                      aria-label="Next participant"
                    >
                      {t("common.next")}
                    </Button>
                  </div>

                  {/* Preview Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                    <table className="w-full text-sm" id="preview-table">
                      <thead>
                        <tr className="bg-slate-800/80">
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {t("export.columns.code")}
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {t("export.columns.phase")}
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {t("export.columns.startTime")}
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {t("export.columns.endTime")}
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {t("export.columns.date")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentRows.length > 0 ? (
                          currentRows.map((row, i) => (
                            <tr
                              key={i}
                              className="border-t border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="px-3 py-2.5 text-white font-mono text-xs">
                                {row.participant_code}
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    row.phase === "Relax"
                                      ? "bg-teal-500/20 text-teal-300"
                                      : row.phase === "Routine"
                                        ? "bg-violet-500/20 text-violet-300"
                                        : "bg-red-500/20 text-red-300"
                                  }`}
                                >
                                  {row.phase}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-emerald-300 font-mono text-xs">
                                {row.start_timestamp}
                              </td>
                              <td className="px-3 py-2.5 text-amber-300 font-mono text-xs">
                                {row.end_timestamp || "—"}
                              </td>
                              <td className="px-3 py-2.5 text-slate-300 font-mono text-xs">
                                {row.date}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-slate-500 text-sm">
                              {t("export.noPhaseData")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {preview && participants.length === 0 && (
                <div className="text-center py-8 text-slate-500 mb-6">
                  {t("export.noData")}
                </div>
              )}

              {/* Download Button */}
              <Button
                onClick={handleDownload}
                loading={downloadStatus === "loading"}
                disabled={downloadStatus === "loading"}
                id="download-csv-btn"
                className="w-full text-lg font-bold py-4"
                size="lg"
              >
                {downloadStatus === "loading"
                  ? t("export.downloading")
                  : downloadStatus === "success"
                    ? t("export.downloaded")
                    : downloadStatus === "error"
                      ? t("export.downloadError")
                      : t("export.downloadCsv")}
              </Button>

              {lastExport && (
                <p className="text-xs text-slate-500 mt-3 text-center">
                  {t("export.lastExport")}: {lastExport}
                </p>
              )}

              <div className="mt-6 pt-4 border-t border-slate-700/50">
                <p className="text-xs text-slate-600 text-center">
                  {t("export.csvNote")}
                </p>
              </div>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
}

// Suspense boundary required by Next.js App Router for useSearchParams
export default function ExportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-slate-400">Loading…</div>
        </div>
      }
    >
      <ExportContent />
    </Suspense>
  );
}
