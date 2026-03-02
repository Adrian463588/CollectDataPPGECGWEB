// ============================================================
// Export Page — Admin CSV export with preview + pagination
// Shows a per-participant preview table matching the CSV output.
// ============================================================

"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";

type ExportStatus = "idle" | "loading" | "success" | "error";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8081";

interface PhaseRow {
  participant_code: string;
  phase: string;
  start_ts_ms: number;
  end_ts_ms: number | null;
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

export default function ExportPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [downloadStatus, setDownloadStatus] = useState<ExportStatus>("idle");
  const [lastExport, setLastExport] = useState<string | null>(null);

  // Preview state
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0);

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
        setAuthError("Invalid admin key. Please try again.");
      }
    } catch {
      setAuthError("Cannot reach the backend. Is the server running?");
    }
  }, [adminKey]);

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
        setCurrentParticipantIndex(0);
      })
      .catch(() => {
        setPreviewError("Failed to load preview data.");
      })
      .finally(() => setPreviewLoading(false));
  }, [authenticated, adminKey]);

  // Download CSV
  const handleDownload = useCallback(async () => {
    setDownloadStatus("loading");
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
    } catch {
      setDownloadStatus("error");
    }
  }, [adminKey]);

  // Pagination
  const participants = preview?.participants ?? [];
  const currentCode = participants[currentParticipantIndex] ?? "";
  const currentRows = preview?.data[currentCode] ?? [];
  const isFirst = currentParticipantIndex === 0;
  const isLast = currentParticipantIndex >= participants.length - 1;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          {!authenticated ? (
            /* ---- Auth Gate ---- */
            <Card>
              <h2 className="text-2xl font-bold text-white mb-2">Data Export</h2>
              <p className="text-sm text-slate-400 mb-6">
                Enter the admin key to access CSV exports.
              </p>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Admin Key"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                id="admin-key-input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAuth();
                }}
              />
              {authError && (
                <p className="text-sm text-red-400 mb-4">{authError}</p>
              )}
              <button
                onClick={handleAuth}
                disabled={!adminKey.trim()}
                className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                id="auth-btn"
              >
                Authenticate
              </button>
            </Card>
          ) : (
            /* ---- Export Dashboard ---- */
            <Card>
              <h2 className="text-2xl font-bold text-white mb-2">
                📊 Phase Timeline Export
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Export participant phase timestamps as CSV.
                Columns: <code className="text-indigo-300">participant_code</code>,{" "}
                <code className="text-indigo-300">phase</code>,{" "}
                <code className="text-indigo-300">start_ts_ms</code>,{" "}
                <code className="text-indigo-300">end_ts_ms</code>
              </p>

              {/* Preview Section */}
              {previewLoading && (
                <div className="text-center py-8 text-slate-400">
                  <span className="animate-spin inline-block mr-2">⏳</span>
                  Loading preview…
                </div>
              )}

              {previewError && (
                <p className="text-sm text-red-400 mb-4">{previewError}</p>
              )}

              {preview && participants.length > 0 && (
                <div className="mb-6">
                  {/* Participant Pagination Header */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setCurrentParticipantIndex((i) => Math.max(0, i - 1))}
                      disabled={isFirst}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      id="prev-participant-btn"
                      aria-label="Previous participant"
                    >
                      ← Previous
                    </button>

                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{currentCode}</p>
                      <p className="text-xs text-slate-500">
                        Participant {currentParticipantIndex + 1} of {participants.length}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setCurrentParticipantIndex((i) =>
                          Math.min(participants.length - 1, i + 1)
                        )
                      }
                      disabled={isLast}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      id="next-participant-btn"
                      aria-label="Next participant"
                    >
                      Next →
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                    <table className="w-full text-sm" id="preview-table">
                      <thead>
                        <tr className="bg-slate-800/80">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Participant Code
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Phase
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Start (ms)
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            End (ms)
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
                              <td className="px-4 py-2.5 text-white font-mono text-xs">
                                {row.participant_code}
                              </td>
                              <td className="px-4 py-2.5">
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
                              <td className="px-4 py-2.5 text-slate-300 font-mono text-xs">
                                {row.start_ts_ms}
                              </td>
                              <td className="px-4 py-2.5 text-slate-300 font-mono text-xs">
                                {row.end_ts_ms ?? "—"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-slate-500 text-sm">
                              No phase data for this participant.
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
                  No participant data found. Complete a session to see data here.
                </div>
              )}

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={downloadStatus === "loading"}
                className="w-full py-3 px-6 rounded-xl font-bold text-lg text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                id="download-csv-btn"
              >
                {downloadStatus === "loading"
                  ? "Downloading…"
                  : downloadStatus === "success"
                    ? "✓ Downloaded — Download Again?"
                    : downloadStatus === "error"
                      ? "✗ Error — Retry"
                      : "⬇ Download CSV"}
              </button>

              {lastExport && (
                <p className="text-xs text-slate-500 mt-3 text-center">
                  Last export: {lastExport}
                </p>
              )}

              <div className="mt-6 pt-4 border-t border-slate-700/50">
                <p className="text-xs text-slate-600 text-center">
                  CSV format: participant_code, phase (Relax / Routine / Task), start_ts_ms, end_ts_ms (epoch ms, WIB context).
                  All data is pseudonymous — no PII is exported.
                </p>
              </div>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
}
