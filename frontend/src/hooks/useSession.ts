// ============================================================
// useSession — Session state management hook
// ============================================================

"use client";

import { useState, useCallback } from "react";
import type { Session, SessionState, SessionConfig, Phase } from "@/lib/types";
import { DEFAULT_SESSION_CONFIG } from "@/lib/types";
import { createSession, getSessionState, transitionPhase } from "@/lib/api-client";
import { useAsync } from "./useAsync";

interface UseSessionReturn {
  session: Session | null;
  sessionState: SessionState | null;
  loading: boolean;
  error: string | null;
  initSession: (participantCode: string, config?: Partial<SessionConfig>) => Promise<Session>;
  fetchState: (sessionId: string) => Promise<SessionState>;
  advancePhase: (sessionId: string, toPhase: Phase) => Promise<void>;
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const { loading, error, run } = useAsync();

  const initSession = useCallback(async (
    participantCode: string,
    config?: Partial<SessionConfig>
  ): Promise<Session> => {
    return run(
      (async () => {
        // POST /sessions auto-creates the participant if it doesn't exist.
        // No need to call createParticipant separately.
        const newSession = await createSession({
          participant_code: participantCode,
          config: { ...DEFAULT_SESSION_CONFIG, ...config },
        });
        setSession(newSession);
        return newSession;
      })(),
      "Failed to create session"
    );
  }, [run]);

  const fetchState = useCallback(async (sessionId: string): Promise<SessionState> => {
    return run(
      (async () => {
        const state = await getSessionState(sessionId);
        setSessionState(state);
        return state;
      })(),
      "Failed to fetch session state"
    );
  }, [run]);

  const advancePhase = useCallback(async (sessionId: string, toPhase: Phase) => {
    return run(
      (async () => {
        await transitionPhase(sessionId, {
          to_phase: toPhase,
          client_time_ms: Date.now(),
        });
        const state = await getSessionState(sessionId);
        setSessionState(state);
      })(),
      "Phase transition failed"
    );
  }, [run]);

  return { session, sessionState, loading, error, initSession, fetchState, advancePhase };
}
