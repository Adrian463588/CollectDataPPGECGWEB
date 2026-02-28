// ============================================================
// Export Page — Admin CSV export with auth gate
// ============================================================

"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Card from "@/components/ui/Card";

type ExportStatus = "idle" | "loading" | "success" | "error";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8081";

function formatWIBFilename(prefix: string): string {
  const now = new Date();
  // Format as WIB (UTC+7)
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const d = String(wib.getUTCDate()).padStart(2, "0");
  const h = String(wib.getUTCHours()).padStart(2, "0");
  const min = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${prefix}_${y}-${m}-${d}_${h}-${min}_WIB.csv`;
}

export default function ExportPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [sessionsStatus, setSessionsStatus] = useState<ExportStatus>("idle");
  const [eventsStatus, setEventsStatus] = useState<ExportStatus>("idle");
  const [lastExport, setLastExport] = useState<string | null>(null);

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

  const handleDownload = useCallback(
    async (endpoint: string, filenamePrefix: string, setStatus: (s: ExportStatus) => void) => {
      setStatus("loading");
      try {
        const res = await fetch(`${API_BASE}/api/admin/export/${endpoint}`, {
          headers: { "X-Admin-Key": adminKey.trim() },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = formatWIBFilename(filenamePrefix);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setStatus("success");
        setLastExport(new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta" }) + " WIB");
      } catch {
        setStatus("error");
      }
    },
    [adminKey]
  );

  const statusIcon = (status: ExportStatus) => {
    switch (status) {
      case "loading": return <span className="animate-spin">⏳</span>;
      case "success": return <span className="text-emerald-400">✓</span>;
      case "error": return <span className="text-red-400">✗</span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          {!authenticated ? (
            <Card>
              <h2 className="text-2xl font-bold text-white mb-2">
                Data Export
              </h2>
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
            <Card>
              <h2 className="text-2xl font-bold text-white mb-2">
                📊 Data Export
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Download all participant/session data as CSV files.
              </p>

              <div className="space-y-4">
                {/* Sessions CSV */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Sessions CSV</h3>
                      <p className="text-xs text-slate-500">
                        All sessions with IDs, status, phase timestamps
                      </p>
                    </div>
                    {statusIcon(sessionsStatus)}
                  </div>
                  <button
                    onClick={() => handleDownload("all/sessions.csv", "sessions", setSessionsStatus)}
                    disabled={sessionsStatus === "loading"}
                    className="w-full py-2 px-4 rounded-lg font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    id="download-sessions-btn"
                  >
                    {sessionsStatus === "loading" ? "Downloading…" : "Download Sessions CSV"}
                  </button>
                </div>

                {/* Events CSV */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Events CSV</h3>
                      <p className="text-xs text-slate-500">
                        All events: breathing steps, responses, transitions, heartbeats
                      </p>
                    </div>
                    {statusIcon(eventsStatus)}
                  </div>
                  <button
                    onClick={() => handleDownload("all/events.csv", "events", setEventsStatus)}
                    disabled={eventsStatus === "loading"}
                    className="w-full py-2 px-4 rounded-lg font-medium text-sm text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
                    id="download-events-btn"
                  >
                    {eventsStatus === "loading" ? "Downloading…" : "Download Events CSV"}
                  </button>
                </div>
              </div>

              {lastExport && (
                <p className="text-xs text-slate-500 mt-4 text-center">
                  Last export: {lastExport}
                </p>
              )}

              <div className="mt-6 pt-4 border-t border-slate-700/50">
                <p className="text-xs text-slate-600 text-center">
                  Files are named with WIB timestamps (e.g., sessions_2026-03-01_02-30_WIB.csv).
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
