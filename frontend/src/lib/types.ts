// ============================================================
// Experiment Controller — Shared TypeScript DTOs & Types
// ============================================================

// ---- Enums ----

export type SessionStatus =
  | "CREATED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "ABORTED"
  | "STALE";

export type Phase =
  | "INTRO"
  | "DEVICE_CHECK"
  | "COUNTDOWN"
  | "RELAXATION"
  | "ROUTINE"
  | "STRESS"
  | "COMPLETE";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type BreathingStep =
  | "inhale"
  | "hold_after_inhale"
  | "exhale"
  | "hold_after_exhale";

export type EventType =
  | "SESSION_CREATED"
  | "PHASE_TRANSITION"
  | "PHASE_PAUSED"
  | "PHASE_RESUMED"
  | "RELAXATION_START"
  | "BREATHING_STEP_START"
  | "BREATHING_STEP_END"
  | "RELAXATION_END"
  | "STIMULUS_SHOWN"
  | "RESPONSE_SUBMITTED"
  | "RESPONSE_TIMEOUT"
  | "HEARTBEAT"
  | "RECONNECT"
  | "AUDIO_TOGGLE"
  | "SKIP_CLICKED"
  | "SKIP_CANCELLED"
  | "SKIP_CONFIRMED"
  | "ROUTINE_STARTED"
  | "ROUTINE_NOTE_SAVED"
  | "ROUTINE_COMPLETED"
  | "VALIDATION_ERROR"
  | "SESSION_COMPLETE"
  | "CUSTOM_MARKER";

// ---- Participant ----

export interface Participant {
  id: string;
  code: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface CreateParticipantRequest {
  code: string;
  metadata?: Record<string, unknown>;
}

// ---- Session ----

export interface BreathingConfig {
  inhale_ms: number;
  hold_after_inhale_ms: number;
  exhale_ms: number;
  hold_after_exhale_ms: number;
}

export const DEFAULT_BREATHING_CONFIG: BreathingConfig = {
  inhale_ms: 4_000,
  hold_after_inhale_ms: 4_000,
  exhale_ms: 4_000,
  hold_after_exhale_ms: 4_000,
};

export interface SessionConfig {
  relaxation_duration_ms: number;
  stress_duration_ms: number;
  question_timeout_ms: number;
  difficulty: Difficulty;
  audio_enabled: boolean;
  score_visible: boolean;
  breathing_config: BreathingConfig;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  relaxation_duration_ms: 300_000, // 5 minutes
  stress_duration_ms: 300_000,     // 5 minutes
  question_timeout_ms: 8_000,     // 8 seconds
  difficulty: "MEDIUM",
  audio_enabled: true,
  score_visible: true,
  breathing_config: DEFAULT_BREATHING_CONFIG,
};

export interface CreateSessionRequest {
  participant_code: string;
  config: SessionConfig;
}

export interface Session {
  id: string;
  participant_id: string;
  status: SessionStatus;
  current_phase: Phase;
  config: SessionConfig;
  stimuli_count: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface SessionState {
  id: string;
  status: SessionStatus;
  current_phase: Phase;
  phase_started_at_wib: string;
  phase_ends_at_wib: string;
  elapsed_ms: number;
  config: SessionConfig;
  current_stimulus_index?: number;
}

// ---- Phase Transition ----

export interface TransitionRequest {
  to_phase: Phase;
  client_time_ms: number;
}

export interface TransitionResponse {
  phase: Phase;
  started_at_wib: string;
  ends_at_wib: string;
}

// ---- Events ----

export interface EventPayload {
  [key: string]: unknown;
}

export interface ExperimentEvent {
  event_type: EventType;
  client_time_ms: number;
  idempotency_key: string;
  payload: EventPayload;
}

export interface BatchEventsRequest {
  events: ExperimentEvent[];
}

export interface BatchEventsResponse {
  accepted: number;
  duplicates: number;
}

// ---- Heartbeat ----

export interface HeartbeatRequest {
  sequence_nr: number;
  client_time_ms: number;
}

export interface HeartbeatResponse {
  server_time_wib: string;
  status: string;
}

// ---- Stimulus ----

export interface Stimulus {
  id: string;
  session_id: string;
  sequence_nr: number;
  problem_text: string;
  correct_answer: number;
  difficulty: Difficulty;
}

// ---- Response ----

export interface SubmitResponseRequest {
  stimulus_id: string;
  participant_answer: number | null;
  reaction_time_ms: number | null;
  client_time_ms: number;
  idempotency_key: string;
}

export interface SubmitResponseResponse {
  id: string;
  is_correct: boolean;
}

// ---- API Error ----

export interface ApiError {
  error: {
    code: string;
    message: string;
    request_id: string;
  };
}
