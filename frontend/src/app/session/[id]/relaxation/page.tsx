// ============================================================
// Relaxation Phase — 5-minute box breathing protocol
// Pattern: Inhale → Hold → Exhale → Hold (configurable durations)
// ============================================================

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import BoxBreathingCircle from "@/components/relaxation/BoxBreathingCircle";
import CountdownTimer from "@/components/ui/CountdownTimer";
import SkipConfirmModal from "@/components/ui/SkipConfirmModal";
import Header from "@/components/layout/Header";
import ProgressBar from "@/components/ui/ProgressBar";
import PhaseIndicator from "@/components/layout/PhaseIndicator";
import { useCountdown } from "@/hooks/useCountdown";
import { useBoxBreathing } from "@/hooks/useBoxBreathing";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { useEventLogger } from "@/hooks/useEventLogger";
import { useDevControls } from "@/hooks/useDevControls";
import { playTransitionBeep, stopAllAudio } from "@/lib/audio";
import { DEFAULT_SESSION_CONFIG } from "@/lib/types";

const RELAXATION_DURATION_MS = DEFAULT_SESSION_CONFIG.relaxation_duration_ms;
const COUNTDOWN_DURATION_MS = 5_000;

export default function RelaxationPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [phase, setPhase] = useState<"countdown" | "relaxation">("countdown");
  const hasStartedRef = useRef(false);
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const devControls = useDevControls();

  const { logEvent } = useEventLogger(sessionId);
  useHeartbeat(sessionId);

  // Called when box breathing completes (current step finishes after global timer)
  const handleBreathingComplete = useCallback(() => {
    void logEvent("PHASE_TRANSITION", {
      from_phase: "RELAXATION",
      to_phase: "STRESS",
    });
    playTransitionBeep();
    router.push(`/session/${sessionId}/stress`);
  }, [logEvent, router, sessionId]);

  // Box breathing hook
  const breathing = useBoxBreathing(
    sessionId,
    DEFAULT_SESSION_CONFIG.breathing_config,
    RELAXATION_DURATION_MS,
    DEFAULT_SESSION_CONFIG.audio_enabled,
    handleBreathingComplete
  );

  // Global timer — when it expires, signal box breathing to finish current step
  const handleGlobalTimerExpired = useCallback(() => {
    breathing.signalEnd();
  }, [breathing]);

  const countdownTimer = useCountdown(() => {
    setPhase("relaxation");
    void logEvent("PHASE_TRANSITION", {
      from_phase: "COUNTDOWN",
      to_phase: "RELAXATION",
    });
    playTransitionBeep();
  });

  const globalTimer = useCountdown(handleGlobalTimerExpired);

  // Start box breathing when relaxation phase begins
  useEffect(() => {
    if (phase === "relaxation" && !hasStartedRef.current) {
      hasStartedRef.current = true;
      breathing.start();
      globalTimer.start(RELAXATION_DURATION_MS);
    }
  }, [phase, breathing, globalTimer]);

  // Initial mount — start countdown
  useEffect(() => {
    countdownTimer.start(COUNTDOWN_DURATION_MS);
    void logEvent("PHASE_TRANSITION", {
      from_phase: "DEVICE_CHECK",
      to_phase: "COUNTDOWN",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Skip handlers ----
  const handleSkipClick = useCallback(() => {
    void logEvent("SKIP_CLICKED", { phase: "RELAXATION" });
    setSkipModalOpen(true);
  }, [logEvent]);

  const handleSkipCancel = useCallback(() => {
    void logEvent("SKIP_CANCELLED", { phase: "RELAXATION" });
    setSkipModalOpen(false);
  }, [logEvent]);

  const handleSkipConfirm = useCallback(() => {
    setSkipModalOpen(false);
    void logEvent("SKIP_CONFIRMED", { phase: "RELAXATION" });
    // Stop all timers, breathing, and audio
    globalTimer.reset();
    stopAllAudio();
    void logEvent("PHASE_TRANSITION", {
      from_phase: "RELAXATION",
      to_phase: "STRESS",
      end_reason: "manual_skip",
    });
    router.push(`/session/${sessionId}/stress`);
  }, [logEvent, globalTimer, router, sessionId]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header>
        <PhaseIndicator phase={phase === "countdown" ? "COUNTDOWN" : "RELAXATION"} />
      </Header>

      <div className="px-6 pt-6">
        <ProgressBar currentPhase={phase === "countdown" ? "COUNTDOWN" : "RELAXATION"} />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        {phase === "countdown" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <h2 className="text-2xl font-bold text-white">Get Ready</h2>
            <p className="text-slate-400">Box breathing begins in…</p>
            <CountdownTimer
              remainingMs={countdownTimer.remainingMs}
              totalMs={COUNTDOWN_DURATION_MS}
              size="lg"
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Step label above circle */}
            <h2 className="text-xl font-semibold text-teal-300">
              Box Breathing
            </h2>

            {/* Animated breathing circle */}
            <BoxBreathingCircle
              currentStep={breathing.currentStep}
              stepLabel={breathing.stepLabel}
              stepRemainingMs={breathing.stepRemainingMs}
              stepTotalMs={breathing.stepTotalMs}
            />

            {/* Global countdown */}
            <CountdownTimer
              remainingMs={globalTimer.remainingMs}
              totalMs={RELAXATION_DURATION_MS}
              label="Time Remaining"
              size="md"
            />

            {/* Cycle counter + Mute toggle */}
            <div className="flex items-center justify-between w-full max-w-sm">
              <p className="text-sm text-slate-400">
                Cycle {breathing.cycleNr} of ~{breathing.totalCycles}
              </p>

              <button
                onClick={breathing.toggleAudio}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-sm text-slate-300 hover:bg-slate-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                aria-label={breathing.audioEnabled ? "Mute audio" : "Unmute audio"}
                type="button"
              >
                {breathing.audioEnabled ? (
                  <>
                    <span aria-hidden="true">🔊</span> Sound On
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">🔇</span> Muted
                  </>
                )}
              </button>
            </div>

            <p className="text-sm text-slate-500 max-w-md text-center">
              Follow the breathing pattern. Inhale, hold, exhale, hold.
              The next phase will begin automatically.
            </p>

            {/* Dev Controls: Skip button */}
            {devControls && (
              <button
                onClick={handleSkipClick}
                className="mt-2 px-4 py-2 rounded-lg text-sm font-medium text-amber-300 bg-amber-900/30 border border-amber-700/40 hover:bg-amber-800/40 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                id="skip-phase-btn"
              >
                ⏩ Skip Phase (Dev)
              </button>
            )}
          </motion.div>
        )}
      </main>

      {/* Skip confirmation modal */}
      <SkipConfirmModal
        open={skipModalOpen}
        onConfirm={handleSkipConfirm}
        onCancel={handleSkipCancel}
        phaseName="Relaxation"
      />
    </div>
  );
}
