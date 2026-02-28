// ============================================================
// useEventLogger — Convenient hook for logging experiment events
// ============================================================

"use client";

import { useCallback, useEffect } from "react";
import { enqueueEvent, startEventBuffer, stopEventBuffer } from "@/lib/event-buffer";
import type { EventType, EventPayload } from "@/lib/types";

export function useEventLogger(sessionId: string | null) {
  useEffect(() => {
    if (!sessionId) return;
    startEventBuffer();
    return () => {
      void stopEventBuffer();
    };
  }, [sessionId]);

  const logEvent = useCallback(
    async (eventType: EventType, payload: EventPayload = {}) => {
      if (!sessionId) return;
      await enqueueEvent(sessionId, eventType, payload);
    },
    [sessionId]
  );

  return { logEvent };
}
