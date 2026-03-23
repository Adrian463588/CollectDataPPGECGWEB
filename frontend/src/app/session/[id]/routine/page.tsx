// ============================================================
// Routine Page — Inter-phase gap for researcher notes (i18n)
// Researcher can record notes before stress induction begins.
// ============================================================

"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import SkipConfirmModal from "@/components/ui/SkipConfirmModal";
import ProgressBar from "@/components/ui/ProgressBar";
import PhaseIndicator from "@/components/layout/PhaseIndicator";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { useEventLogger } from "@/hooks/useEventLogger";
import { useDevControls } from "@/hooks/useDevControls";
import { playTransitionBeep } from "@/lib/audio";
import { useT } from "@/i18n/provider";

const MAX_NOTE_LENGTH = 2000;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api";

export default function RoutinePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const t = useT();

  const [noteContent, setNoteContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedNotes, setSavedNotes] = useState<{ id: string; charLength: number; time: string }[]>([]);
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const hasLoggedStart = useRef(false);

  const { logEvent } = useEventLogger(sessionId);
  useHeartbeat(sessionId);
  const devControls = useDevControls();

  // Log ROUTINE_STARTED once
  if (!hasLoggedStart.current) {
    hasLoggedStart.current = true;
    void logEvent("ROUTINE_STARTED", { phase: "ROUTINE" });
  }

  // Save note to backend
  const handleSaveNote = useCallback(async () => {
    if (!noteContent.trim() || noteContent.length > MAX_NOTE_LENGTH) return;

    setSaveStatus("saving");
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent.trim(),
          client_time_ms: Date.now(),
          idempotency_key: crypto.randomUUID(),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setSaveStatus("saved");
      setSavedNotes((prev) => [
        ...prev,
        {
          id: data.id,
          charLength: data.char_length,
          time: new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta" }),
        },
      ]);
      setNoteContent("");

      void logEvent("ROUTINE_NOTE_SAVED", {
        note_id: data.id,
        char_length: data.char_length,
      });
    } catch {
      setSaveStatus("error");
    }
  }, [noteContent, sessionId, logEvent]);

  // Continue to stress
  const handleContinue = useCallback(() => {
    void logEvent("ROUTINE_COMPLETED", { phase: "ROUTINE" });
    void logEvent("PHASE_TRANSITION", {
      from_phase: "ROUTINE",
      to_phase: "STRESS",
    });
    playTransitionBeep();
    router.push(`/session/${sessionId}/stress`);
  }, [logEvent, router, sessionId]);

  // Skip handlers
  const handleSkipClick = useCallback(() => {
    void logEvent("SKIP_CLICKED", { phase: "ROUTINE" });
    setSkipModalOpen(true);
  }, [logEvent]);

  const handleSkipCancel = useCallback(() => {
    void logEvent("SKIP_CANCELLED", { phase: "ROUTINE" });
    setSkipModalOpen(false);
  }, [logEvent]);

  const handleSkipConfirm = useCallback(() => {
    setSkipModalOpen(false);
    void logEvent("SKIP_CONFIRMED", { phase: "ROUTINE" });
    void logEvent("PHASE_TRANSITION", {
      from_phase: "ROUTINE",
      to_phase: "STRESS",
      end_reason: "manual_skip",
    });
    router.push(`/session/${sessionId}/stress`);
  }, [logEvent, router, sessionId]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-6 pt-4 flex items-center justify-between">
        <PhaseIndicator phase="ROUTINE" />
      </div>

      <div className="px-6 pt-2">
        <ProgressBar currentPhase="ROUTINE" />
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <Card>
            <h2 className="text-2xl font-bold text-white mb-2">
              📝 {t("routine.title")}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {t("routine.subtitle")}{" "}
              <strong className="text-white">{t("routine.subtitleAction")}</strong>
            </p>

            {/* Notes textarea */}
            <textarea
              value={noteContent}
              onChange={(e) => {
                if (e.target.value.length <= MAX_NOTE_LENGTH) {
                  setNoteContent(e.target.value);
                  setSaveStatus("idle");
                }
              }}
              placeholder={t("routine.placeholder")}
              className="w-full h-32 bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
              id="routine-note-input"
            />
            <p className="text-xs text-slate-600 text-right mt-1">
              {noteContent.length}/{MAX_NOTE_LENGTH}
            </p>

            {/* Save button */}
            <button
              onClick={handleSaveNote}
              disabled={!noteContent.trim() || saveStatus === "saving"}
              className="w-full mt-3 py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
              id="save-note-btn"
            >
              {saveStatus === "saving"
                ? t("routine.saving")
                : saveStatus === "saved"
                  ? t("routine.saved")
                  : saveStatus === "error"
                    ? t("routine.saveError")
                    : t("routine.saveNote")}
            </button>

            {/* Saved notes summary */}
            {savedNotes.length > 0 && (
              <div className="mt-4 space-y-1">
                <p className="text-xs font-semibold text-slate-400">
                  {t("routine.savedNotes")} ({savedNotes.length}):
                </p>
                {savedNotes.map((note) => (
                  <p key={note.id} className="text-xs text-slate-500">
                    • {note.charLength} {t("routine.noteInfo")} {note.time} WIB
                  </p>
                ))}
              </div>
            )}

            {/* Continue button */}
            <button
              onClick={handleContinue}
              className="w-full mt-6 py-3 px-6 rounded-xl font-bold text-lg text-white bg-indigo-600 hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              id="routine-continue-btn"
            >
              {t("routine.continueBtn")}
            </button>

            {/* Dev Controls: Skip button */}
            {devControls && (
              <button
                onClick={handleSkipClick}
                className="w-full mt-2 px-4 py-2 rounded-lg text-sm font-medium text-amber-300 bg-amber-900/30 border border-amber-700/40 hover:bg-amber-800/40 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                id="skip-phase-btn"
              >
                {t("skip.button")}
              </button>
            )}
          </Card>
        </motion.div>
      </main>

      <SkipConfirmModal
        open={skipModalOpen}
        onConfirm={handleSkipConfirm}
        onCancel={handleSkipCancel}
        phaseName={t("phases.routine")}
      />
    </div>
  );
}
