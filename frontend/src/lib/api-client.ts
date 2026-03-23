// ============================================================
// Experiment Controller — API Client
// Typed fetch wrapper with retry, request ID, error handling
// ============================================================

import { v4 as uuidv4 } from "uuid";
import type {
  Participant,
  CreateParticipantRequest,
  Session,
  SessionState,
  CreateSessionRequest,
  TransitionRequest,
  TransitionResponse,
  BatchEventsRequest,
  BatchEventsResponse,
  HeartbeatRequest,
  HeartbeatResponse,
  SubmitResponseRequest,
  SubmitResponseResponse,
  Stimulus,
  ApiError,
} from "./types";

// Always route through the server-side proxy (/api-proxy).
// Never expose the raw backend URL to the browser — it breaks LAN/cross-origin access.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api-proxy";

// ---- Helpers ----

class ApiClientError extends Error {
  constructor(
    public status: number,
    public body: ApiError
  ) {
    super(body.error?.message || `HTTP ${status}`);
    this.name = "ApiClientError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retries = 2
): Promise<T> {
  const requestId = uuidv4();
  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
    ...(options.headers as Record<string, string>),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({
          error: { code: "UNKNOWN", message: res.statusText, request_id: requestId },
        }));
        throw new ApiClientError(res.status, errorBody as ApiError);
      }

      // Handle empty responses (204, etc.)
      const text = await res.text();
      if (!text) return {} as T;
      return JSON.parse(text) as T;
    } catch (err) {
      if (err instanceof ApiClientError && err.status < 500) throw err;
      if (attempt === retries) throw err;
      // Exponential backoff: 500ms, 1000ms
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }

  throw new Error("Unreachable");
}

// ---- Participants ----

export async function createParticipant(
  data: CreateParticipantRequest
): Promise<Participant> {
  return request<Participant>("/participants", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getParticipant(code: string): Promise<Participant> {
  return request<Participant>(`/participants/${encodeURIComponent(code)}`);
}

// ---- Sessions ----

export async function createSession(
  data: CreateSessionRequest
): Promise<Session> {
  return request<Session>("/sessions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getSessionState(sessionId: string): Promise<SessionState> {
  return request<SessionState>(`/sessions/${sessionId}`);
}

export async function transitionPhase(
  sessionId: string,
  data: TransitionRequest
): Promise<TransitionResponse> {
  return request<TransitionResponse>(`/sessions/${sessionId}/transition`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---- Heartbeat ----

export async function sendHeartbeat(
  sessionId: string,
  data: HeartbeatRequest
): Promise<HeartbeatResponse> {
  return request<HeartbeatResponse>(`/sessions/${sessionId}/heartbeat`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---- Events ----

export async function sendEvents(
  sessionId: string,
  data: BatchEventsRequest
): Promise<BatchEventsResponse> {
  return request<BatchEventsResponse>(`/sessions/${sessionId}/events`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---- Responses ----

export async function submitResponse(
  sessionId: string,
  data: SubmitResponseRequest
): Promise<SubmitResponseResponse> {
  return request<SubmitResponseResponse>(`/sessions/${sessionId}/responses`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---- Stimuli ----

export async function getStimuli(sessionId: string): Promise<Stimulus[]> {
  return request<Stimulus[]>(`/sessions/${sessionId}/stimuli`);
}

// ---- Export (for admin, add admin key in header) ----

export function getExportUrl(path: string): string {
  return `${API_BASE}/admin/export${path}`;
}

export { ApiClientError };
