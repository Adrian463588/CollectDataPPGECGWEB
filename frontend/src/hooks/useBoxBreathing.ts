// ============================================================
// useBoxBreathing — Sub-state machine for box breathing protocol
// Manages: step cycling, step timer, cycle count, event logging,
//          audio cues, and graceful end on global timer expiry.
// ============================================================

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { BreathingStep, BreathingConfig } from "@/lib/types";
import { DEFAULT_BREATHING_CONFIG } from "@/lib/types";
import { useEventLogger } from "./useEventLogger";
import { playBreathingStepBeep } from "@/lib/audio";

const STEP_ORDER: BreathingStep[] = [
  "inhale",
  "hold_after_inhale",
  "exhale",
  "hold_after_exhale",
];

const STEP_LABELS: Record<BreathingStep, string> = {
  inhale: "Inhale",
  hold_after_inhale: "Hold",
  exhale: "Exhale",
  hold_after_exhale: "Hold",
};

interface BoxBreathingState {
  /** Current breathing step */
  currentStep: BreathingStep;
  /** Human-readable label for the current step */
  stepLabel: string;
  /** Milliseconds remaining in the current step */
  stepRemainingMs: number;
  /** Total duration of the current step in ms */
  stepTotalMs: number;
  /** Current cycle number (1-based) */
  cycleNr: number;
  /** Approximate total cycles for the relaxation period */
  totalCycles: number;
  /** Whether breathing is currently active */
  isActive: boolean;
  /** Whether audio is enabled */
  audioEnabled: boolean;
  /** Toggle audio on/off */
  toggleAudio: () => void;
  /** Start breathing */
  start: () => void;
  /** Signal that the global timer has expired (will finish current step then stop) */
  signalEnd: () => void;
}

export function useBoxBreathing(
  sessionId: string,
  config: BreathingConfig = DEFAULT_BREATHING_CONFIG,
  relaxationDurationMs: number = 300_000,
  initialAudioEnabled: boolean = true,
  onComplete: () => void = () => {},
): BoxBreathingState {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [cycleNr, setCycleNr] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(initialAudioEnabled);
  const [stepRemainingMs, setStepRemainingMs] = useState(0);

  const shouldEndRef = useRef(false);
  const stepStartTimeRef = useRef(0);
  const rafRef = useRef<number>(0);
  const isActiveRef = useRef(false);
  const audioEnabledRef = useRef(initialAudioEnabled);
  const currentStepIndexRef = useRef(0);
  const cycleNrRef = useRef(1);

  const { logEvent } = useEventLogger(sessionId);

  const currentStep = STEP_ORDER[currentStepIndex];
  const stepLabel = STEP_LABELS[currentStep];

  // Get duration for a given step
  const getStepDuration = useCallback(
    (step: BreathingStep): number => {
      switch (step) {
        case "inhale": return config.inhale_ms;
        case "hold_after_inhale": return config.hold_after_inhale_ms;
        case "exhale": return config.exhale_ms;
        case "hold_after_exhale": return config.hold_after_exhale_ms;
      }
    },
    [config]
  );

  const currentStepDuration = getStepDuration(currentStep);

  // Cycle duration
  const cycleDurationMs =
    config.inhale_ms + config.hold_after_inhale_ms +
    config.exhale_ms + config.hold_after_exhale_ms;
  const totalCycles = Math.ceil(relaxationDurationMs / cycleDurationMs);

  // Advance to next step
  const advanceStep = useCallback(() => {
    const oldStepIndex = currentStepIndexRef.current;
    const oldStep = STEP_ORDER[oldStepIndex];
    const oldCycle = cycleNrRef.current;

    // Log end of current step
    void logEvent("BREATHING_STEP_END", {
      step: oldStep,
      cycle_nr: oldCycle,
    });

    // Check if we should end after completing this step
    if (shouldEndRef.current) {
      setIsActive(false);
      isActiveRef.current = false;
      void logEvent("RELAXATION_END", {
        total_cycles: totalCycles,
        completed_cycles: oldCycle,
      });
      onComplete();
      return;
    }

    // Calculate next step
    const nextStepIndex = (oldStepIndex + 1) % 4;
    const newCycle = nextStepIndex === 0 ? oldCycle + 1 : oldCycle;
    const nextStep = STEP_ORDER[nextStepIndex];
    const nextDuration = getStepDuration(nextStep);

    // Update refs first (for the animation loop)
    currentStepIndexRef.current = nextStepIndex;
    cycleNrRef.current = newCycle;

    // Update state
    setCurrentStepIndex(nextStepIndex);
    setCycleNr(newCycle);
    setStepRemainingMs(nextDuration);
    stepStartTimeRef.current = performance.now();

    // Log start of new step
    void logEvent("BREATHING_STEP_START", {
      step: nextStep,
      step_duration_ms: nextDuration,
      cycle_nr: newCycle,
    });

    // Audio cue
    if (audioEnabledRef.current) {
      playBreathingStepBeep();
    }
  }, [logEvent, getStepDuration, totalCycles, onComplete]);

  // Animation loop
  const tick = useCallback(() => {
    if (!isActiveRef.current) return;

    const elapsed = performance.now() - stepStartTimeRef.current;
    const stepIndex = currentStepIndexRef.current;
    const step = STEP_ORDER[stepIndex];
    const duration = getStepDuration(step);
    const remaining = Math.max(0, duration - elapsed);

    setStepRemainingMs(remaining);

    if (remaining <= 0) {
      advanceStep();
    }

    if (isActiveRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [getStepDuration, advanceStep]);

  // Start breathing
  const start = useCallback(() => {
    if (isActiveRef.current) return;

    const firstStep = STEP_ORDER[0];
    const firstDuration = getStepDuration(firstStep);

    setIsActive(true);
    isActiveRef.current = true;
    setCurrentStepIndex(0);
    currentStepIndexRef.current = 0;
    setCycleNr(1);
    cycleNrRef.current = 1;
    setStepRemainingMs(firstDuration);
    stepStartTimeRef.current = performance.now();
    shouldEndRef.current = false;

    // Log events
    void logEvent("RELAXATION_START", {
      breathing_config: config,
    });
    void logEvent("BREATHING_STEP_START", {
      step: firstStep,
      step_duration_ms: firstDuration,
      cycle_nr: 1,
    });

    // Audio cue for first step
    if (audioEnabledRef.current) {
      playBreathingStepBeep();
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [config, getStepDuration, logEvent, tick]);

  // Signal end (waits for current step to complete)
  const signalEnd = useCallback(() => {
    shouldEndRef.current = true;
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const newValue = !audioEnabledRef.current;
    audioEnabledRef.current = newValue;
    setAudioEnabled(newValue);
    void logEvent("AUDIO_TOGGLE", { enabled: newValue });
  }, [logEvent]);

  // Cleanup
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    currentStep,
    stepLabel,
    stepRemainingMs,
    stepTotalMs: currentStepDuration,
    cycleNr,
    totalCycles,
    isActive,
    audioEnabled,
    toggleAudio,
    start,
    signalEnd,
  };
}
