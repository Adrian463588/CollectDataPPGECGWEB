// ============================================================
// useHeartbeat — Periodic heartbeat sender
// ============================================================

"use client";

import { useEffect, useRef } from "react";
import { sendHeartbeat } from "@/lib/api-client";

const HEARTBEAT_INTERVAL_MS = 5_000;

export function useHeartbeat(sessionId: string | null, active: boolean = true) {
  const sequenceRef = useRef(0);

  useEffect(() => {
    if (!sessionId || !active) return;

    const interval = setInterval(async () => {
      sequenceRef.current++;
      try {
        await sendHeartbeat(sessionId, {
          sequence_nr: sequenceRef.current,
          client_time_ms: Date.now(),
        });
      } catch (err) {
        console.warn("Heartbeat failed:", err);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [sessionId, active]);
}
