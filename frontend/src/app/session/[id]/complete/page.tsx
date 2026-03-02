// ============================================================
// Complete Page — Session completion summary (i18n)
// ============================================================

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import PhaseIndicator from "@/components/layout/PhaseIndicator";
import { getSessionState } from "@/lib/api-client";
import { stopAllAudio } from "@/lib/audio";
import type { SessionState } from "@/lib/types";
import { useT } from "@/i18n/provider";

export default function CompletePage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const t = useT();

  useEffect(() => {
    stopAllAudio();

    async function load() {
      try {
        const state = await getSessionState(sessionId);
        setSessionState(state);
      } catch {
        // Non-critical — show generic completion
      }
    }
    void load();
  }, [sessionId]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-6 pt-4 flex items-center justify-between">
        <PhaseIndicator phase="COMPLETE" />
      </div>

      <div className="px-6 pt-2">
        <ProgressBar currentPhase="COMPLETE" />
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          <Card className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="text-6xl mb-4"
            >
              🎉
            </motion.div>

            <h2 className="text-3xl font-bold text-white mb-3">
              {t("complete.title")}
            </h2>
            <p className="text-slate-400 mb-8">
              {t("complete.subtitle")}
            </p>

            {sessionState && (
              <div className="bg-slate-800/50 rounded-xl p-6 mb-8 text-left space-y-3">
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider mb-3">
                  {t("complete.summary")}
                </h3>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{t("complete.sessionId")}</span>
                  <span className="text-white font-mono text-xs">
                    {sessionId.slice(0, 8)}…
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{t("complete.status")}</span>
                  <span className="text-emerald-400 font-medium">
                    {sessionState.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{t("complete.elapsed")}</span>
                  <span className="text-white font-mono">
                    {sessionState.elapsed_ms
                      ? `${Math.round(sessionState.elapsed_ms / 1000)}s`
                      : "—"}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                {t("complete.removeDevices")}
              </p>
              <Button
                variant="secondary"
                onClick={() => window.location.assign("/session/new")}
                className="w-full"
                id="new-session-btn"
              >
                {t("complete.newSession")}
              </Button>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
