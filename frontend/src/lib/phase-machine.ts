// ============================================================
// Experiment Controller — Phase State Machine
// Finite state machine for experiment phase transitions
// ============================================================

import type { Phase } from "./types";

/** Valid transitions map: from → allowed destinations */
const VALID_TRANSITIONS: Record<Phase, Phase[]> = {
  INTRO: ["DEVICE_CHECK"],
  DEVICE_CHECK: ["COUNTDOWN"],
  COUNTDOWN: ["RELAXATION"],
  RELAXATION: ["ROUTINE"],
  ROUTINE: ["STRESS"],
  STRESS: ["COMPLETE"],
  COMPLETE: [],
};

/** Phase durations (defaults, overridden by session config) */
export const DEFAULT_PHASE_DURATIONS: Partial<Record<Phase, number>> = {
  COUNTDOWN: 5_000,       // 5 seconds
  RELAXATION: 300_000,    // 5 minutes
  STRESS: 300_000,        // 5 minutes
};

/** Phases that auto-advance after their duration expires */
export const AUTO_ADVANCE_PHASES: Phase[] = ["COUNTDOWN", "RELAXATION", "STRESS"];

/** Phases that can be skipped via dev controls */
export const SKIPPABLE_PHASES: Phase[] = ["RELAXATION", "ROUTINE", "STRESS"];

/** If true, skip goes to the next phase's instructions screen instead of the phase itself */
export const SKIP_TO_INSTRUCTIONS = false;

/** Check if a transition is valid */
export function isValidTransition(from: Phase, to: Phase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Get the next phase (if deterministic) */
export function getNextPhase(current: Phase): Phase | null {
  const targets = VALID_TRANSITIONS[current];
  if (targets && targets.length === 1) return targets[0];
  return null;
}

/** Check if the phase should auto-advance */
export function shouldAutoAdvance(phase: Phase): boolean {
  return AUTO_ADVANCE_PHASES.includes(phase);
}

/** Get the ordered list of all phases */
export function getAllPhases(): Phase[] {
  return ["INTRO", "DEVICE_CHECK", "COUNTDOWN", "RELAXATION", "ROUTINE", "STRESS", "COMPLETE"];
}

/** Get the index of a phase (for progress indication) */
export function getPhaseIndex(phase: Phase): number {
  return getAllPhases().indexOf(phase);
}

/** Get total number of phases */
export function getTotalPhases(): number {
  return getAllPhases().length;
}

/** Validate and return next phase or throw */
export function transition(from: Phase, to: Phase): Phase {
  if (!isValidTransition(from, to)) {
    throw new Error(`Invalid phase transition: ${from} → ${to}`);
  }
  return to;
}
