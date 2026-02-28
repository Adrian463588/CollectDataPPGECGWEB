// ============================================================
// useCountdown — Precise countdown timer hook
// Uses requestAnimationFrame for smooth rendering
// ============================================================

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseCountdownReturn {
  remainingMs: number;
  isRunning: boolean;
  isComplete: boolean;
  start: (durationMs: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useCountdown(onComplete?: () => void): UseCountdownReturn {
  const [remainingMs, setRemainingMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const pausedRemainingRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);

  onCompleteRef.current = onComplete;

  const tick = useCallback(() => {
    const elapsed = performance.now() - startTimeRef.current;
    const remaining = Math.max(0, durationRef.current - elapsed);
    setRemainingMs(remaining);

    if (remaining <= 0) {
      setIsRunning(false);
      setIsComplete(true);
      onCompleteRef.current?.();
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback((durationMs: number) => {
    durationRef.current = durationMs;
    startTimeRef.current = performance.now();
    setRemainingMs(durationMs);
    setIsRunning(true);
    setIsComplete(false);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    cancelAnimationFrame(rafRef.current);
    pausedRemainingRef.current = remainingMs;
    setIsRunning(false);
  }, [isRunning, remainingMs]);

  const resume = useCallback(() => {
    if (isRunning || isComplete) return;
    durationRef.current = pausedRemainingRef.current;
    startTimeRef.current = performance.now();
    setIsRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [isRunning, isComplete, tick]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setRemainingMs(0);
    setIsRunning(false);
    setIsComplete(false);
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return { remainingMs, isRunning, isComplete, start, pause, resume, reset };
}
