// ============================================================
// Phase Machine — Unit Tests
// ============================================================

import {
  isValidTransition,
  getNextPhase,
  shouldAutoAdvance,
  transition,
  getAllPhases,
  getPhaseIndex,
} from "@/lib/phase-machine";

describe("Phase Machine", () => {
  describe("isValidTransition", () => {
    it("allows INTRO → DEVICE_CHECK", () => {
      expect(isValidTransition("INTRO", "DEVICE_CHECK")).toBe(true);
    });

    it("allows DEVICE_CHECK → COUNTDOWN", () => {
      expect(isValidTransition("DEVICE_CHECK", "COUNTDOWN")).toBe(true);
    });

    it("allows COUNTDOWN → RELAXATION", () => {
      expect(isValidTransition("COUNTDOWN", "RELAXATION")).toBe(true);
    });

    it("allows RELAXATION → STRESS", () => {
      expect(isValidTransition("RELAXATION", "STRESS")).toBe(true);
    });

    it("allows STRESS → COMPLETE", () => {
      expect(isValidTransition("STRESS", "COMPLETE")).toBe(true);
    });

    it("rejects INTRO → RELAXATION (skipping steps)", () => {
      expect(isValidTransition("INTRO", "RELAXATION")).toBe(false);
    });

    it("rejects COMPLETE → INTRO (backward)", () => {
      expect(isValidTransition("COMPLETE", "INTRO")).toBe(false);
    });

    it("rejects STRESS → RELAXATION (backward)", () => {
      expect(isValidTransition("STRESS", "RELAXATION")).toBe(false);
    });
  });

  describe("getNextPhase", () => {
    it("returns DEVICE_CHECK for INTRO", () => {
      expect(getNextPhase("INTRO")).toBe("DEVICE_CHECK");
    });

    it("returns null for COMPLETE", () => {
      expect(getNextPhase("COMPLETE")).toBeNull();
    });
  });

  describe("shouldAutoAdvance", () => {
    it("returns true for COUNTDOWN", () => {
      expect(shouldAutoAdvance("COUNTDOWN")).toBe(true);
    });

    it("returns true for RELAXATION", () => {
      expect(shouldAutoAdvance("RELAXATION")).toBe(true);
    });

    it("returns true for STRESS", () => {
      expect(shouldAutoAdvance("STRESS")).toBe(true);
    });

    it("returns false for INTRO", () => {
      expect(shouldAutoAdvance("INTRO")).toBe(false);
    });
  });

  describe("transition", () => {
    it("returns the target phase on valid transition", () => {
      expect(transition("INTRO", "DEVICE_CHECK")).toBe("DEVICE_CHECK");
    });

    it("throws on invalid transition", () => {
      expect(() => transition("INTRO", "STRESS")).toThrow();
    });
  });

  describe("getAllPhases / getPhaseIndex", () => {
    it("returns 6 phases", () => {
      expect(getAllPhases()).toHaveLength(6);
    });

    it("INTRO is index 0", () => {
      expect(getPhaseIndex("INTRO")).toBe(0);
    });

    it("COMPLETE is index 5", () => {
      expect(getPhaseIndex("COMPLETE")).toBe(5);
    });
  });
});
