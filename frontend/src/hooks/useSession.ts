// ============================================================
// useSession — Session state management hook
// ============================================================

"use client";

import { useState, useCallback } from "react";
import type { Session, SessionState, SessionConfig, Phase } from "@/lib/types";
import { DEFAULT_SESSION_CONFIG } from "@/lib/types";
import { createParticipant, createSession, getSessionState, transitionPhase } from "@/lib/api-client";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initSession = useCallback(async (
    participantCode: string,
    config?: Partial<SessionConfig>
  ): Promise<Session> => {
    setLoading(true);
    setError(null);
    try {
      // Create or get participant
      let participant;
      try {
        participant = await createParticipant({ code: participantCode });
      } catch {
        // Participant may already exist — that's fine
        // API should handle upsert or return existing
      }
      void participant;

      const sessionConfig: SessionConfig = {
        ...DEFAULT_SESSION_CONFIG,
        ...config,
      };

      const newSession = await createSession({
        participant_code: participantCode,
        config: sessionConfig,
      });

      setSession(newSession);
      return newSession;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create session";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchState = useCallback(async (sessionId: string): Promise<SessionState> => {
    setLoading(true);
    try {
      const state = await getSessionState(sessionId);
      setSessionState(state);
      return state;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch session state";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const advancePhase = useCallback(async (sessionId: string, toPhase: Phase) => {
    setLoading(true);
    setError(null);
    try {
      await transitionPhase(sessionId, {
        to_phase: toPhase,
        client_time_ms: Date.now(),
      });
      // Fetch updated state
      await fetchState(sessionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Phase transition failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchState]);

  return { session, sessionState, loading, error, initSession, fetchState, advancePhase };
}
