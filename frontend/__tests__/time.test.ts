// ============================================================
// Frontend Time Utilities — Unit Tests
// ============================================================

import {
  formatCountdown,
  formatCountdownPrecise,
  nowMs,
  calculateOffset,
} from "@/lib/time";

describe("Time Utilities", () => {
  describe("nowMs", () => {
    it("returns a positive number", () => {
      const result = nowMs();
      expect(result).toBeGreaterThan(0);
    });

    it("returns a value close to Date.now()", () => {
      const before = Date.now();
      const result = nowMs();
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe("calculateOffset", () => {
    it("returns positive offset when client is behind server", () => {
      // Server: 1700000001000, Client: 1700000000000
      const serverWib = new Date(1700000001000).toISOString();
      const offset = calculateOffset(serverWib, 1700000000000);
      expect(offset).toBe(1000);
    });

    it("returns negative offset when client is ahead of server", () => {
      const serverWib = new Date(1700000000000).toISOString();
      const offset = calculateOffset(serverWib, 1700000001000);
      expect(offset).toBe(-1000);
    });

    it("returns zero when times are equal", () => {
      const ms = 1700000000000;
      const serverWib = new Date(ms).toISOString();
      const offset = calculateOffset(serverWib, ms);
      expect(offset).toBe(0);
    });
  });

  describe("formatCountdown", () => {
    it("formats 0ms as 00:00", () => {
      expect(formatCountdown(0)).toBe("00:00");
    });

    it("formats negative values as 00:00", () => {
      expect(formatCountdown(-1000)).toBe("00:00");
    });

    it("formats 5000ms as 00:05", () => {
      expect(formatCountdown(5000)).toBe("00:05");
    });

    it("formats 60000ms as 01:00", () => {
      expect(formatCountdown(60000)).toBe("01:00");
    });

    it("formats 300000ms (5 min) as 05:00", () => {
      expect(formatCountdown(300000)).toBe("05:00");
    });

    it("rounds up partial seconds", () => {
      // 1500ms = 1.5s → rounds up to 2s
      expect(formatCountdown(1500)).toBe("00:02");
    });

    it("formats 1ms as 00:01 (rounds up)", () => {
      expect(formatCountdown(1)).toBe("00:01");
    });
  });

  describe("formatCountdownPrecise", () => {
    it("formats 0ms as 00:00.0", () => {
      expect(formatCountdownPrecise(0)).toBe("00:00.0");
    });

    it("formats negative values as 00:00.0", () => {
      expect(formatCountdownPrecise(-500)).toBe("00:00.0");
    });

    it("formats 5000ms as 00:05.0", () => {
      expect(formatCountdownPrecise(5000)).toBe("00:05.0");
    });

    it("formats 300000ms (5 min) as 05:00.0", () => {
      expect(formatCountdownPrecise(300000)).toBe("05:00.0");
    });

    it("formats 1500ms with tenths", () => {
      // 1500ms = 15 tenths → 1.5s → rounds up to 00:01.5
      expect(formatCountdownPrecise(1500)).toBe("00:01.5");
    });
  });
});
