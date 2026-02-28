// ============================================================
// Relaxation Phase — 5-minute relaxation with breathing animation
// ============================================================

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import BreathingCircle from "@/components/relaxation/BreathingCircle";
import CountdownTimer from "@/components/ui/CountdownTimer";
import Header from "@/components/layout/Header";
import ProgressBar from "@/components/ui/ProgressBar";
import PhaseIndicator from "@/components/layout/PhaseIndicator";
import { useCountdown } from "@/hooks/useCountdown";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { useEventLogger } from "@/hooks/useEventLogger";
import { playTransitionBeep } from "@/lib/audio";
import { DEFAULT_SESSION_CONFIG } from "@/lib/types";

const RELAXATION_DURATION_MS = DEFAULT_SESSION_CONFIG.relaxation_duration_ms;
const COUNTDOWN_DURATION_MS = 5_000; // 5-second pre-start countdown

export default function RelaxationPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [phase, setPhase] = useState<"countdown" | "relaxation">("countdown");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const { logEvent } = useEventLogger(sessionId);
  useHeartbeat(sessionId);

  const handleRelaxationComplete = useCallback(() => {
    void logEvent("PHASE_TRANSITION", {
      from_phase: "RELAXATION",
      to_phase: "STRESS",
    });
    playTransitionBeep();
    router.push(`/session/${sessionId}/stress`);
  }, [logEvent, router, sessionId]);

  const handleCountdownComplete = useCallback(() => {
    setPhase("relaxation");
    void logEvent("PHASE_TRANSITION", {
      from_phase: "COUNTDOWN",
      to_phase: "RELAXATION",
    });
    playTransitionBeep();
    relaxationTimer.start(RELAXATION_DURATION_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logEvent]);

  const countdownTimer = useCountdown(handleCountdownComplete);
  const relaxationTimer = useCountdown(handleRelaxationComplete);

  useEffect(() => {
    // Check reduced motion preference
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    // Start 5-second countdown
    countdownTimer.start(COUNTDOWN_DURATION_MS);

    void logEvent("PHASE_TRANSITION", {
      from_phase: "DEVICE_CHECK",
      to_phase: "COUNTDOWN",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <p className="text-slate-400">Relaxation phase begins in…</p>
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
            className="flex flex-col items-center gap-8"
          >
            <h2 className="text-xl font-semibold text-teal-300">
              Relax and breathe naturally
            </h2>

            <BreathingCircle animate={!prefersReducedMotion} />

            <CountdownTimer
              remainingMs={relaxationTimer.remainingMs}
              totalMs={RELAXATION_DURATION_MS}
              label="Time Remaining"
              size="md"
            />

            <p className="text-sm text-slate-500 max-w-md text-center">
              Focus on your breathing. Inhale slowly, hold, then exhale.
              The next phase will begin automatically.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
