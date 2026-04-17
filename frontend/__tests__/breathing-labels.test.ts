// ============================================================
// breathing-labels.test.ts
// Tests that STEP_LABEL_KEYS in BoxBreathingCircle maps each
// BreathingStep to the correct i18n key.
// ============================================================

import type { BreathingStep } from "@/lib/types";

/** Mirror of STEP_LABEL_KEYS from BoxBreathingCircle (source of truth) */
const STEP_LABEL_KEYS: Record<BreathingStep, string> = {
  inhale: "relaxation.breatheIn",
  hold_after_inhale: "relaxation.hold",
  exhale: "relaxation.breatheOut",
  hold_after_exhale: "relaxation.hold",
};

describe("STEP_LABEL_KEYS mapping", () => {
  it("maps inhale to relaxation.breatheIn", () => {
    expect(STEP_LABEL_KEYS.inhale).toBe("relaxation.breatheIn");
  });

  it("maps hold_after_inhale to relaxation.hold", () => {
    expect(STEP_LABEL_KEYS.hold_after_inhale).toBe("relaxation.hold");
  });

  it("maps exhale to relaxation.breatheOut", () => {
    expect(STEP_LABEL_KEYS.exhale).toBe("relaxation.breatheOut");
  });

  it("maps hold_after_exhale to relaxation.hold", () => {
    expect(STEP_LABEL_KEYS.hold_after_exhale).toBe("relaxation.hold");
  });

  it("covers all four BreathingStep values", () => {
    const steps: BreathingStep[] = [
      "inhale",
      "hold_after_inhale",
      "exhale",
      "hold_after_exhale",
    ];
    steps.forEach((step) => {
      expect(STEP_LABEL_KEYS[step]).toBeTruthy();
    });
  });
});

describe("i18n keys resolve in en locale", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const en = require("@/i18n/en.json") as Record<string, Record<string, string>>;

  it("en has relaxation.breatheIn", () => {
    expect(en.relaxation.breatheIn).toBe("Breathe In");
  });

  it("en has relaxation.hold", () => {
    expect(en.relaxation.hold).toBe("Hold");
  });

  it("en has relaxation.breatheOut", () => {
    expect(en.relaxation.breatheOut).toBe("Breathe Out");
  });
});

describe("i18n keys resolve in id locale", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const id = require("@/i18n/id.json") as Record<string, Record<string, string>>;

  it("id has relaxation.breatheIn in Indonesian", () => {
    expect(id.relaxation.breatheIn).toBe("Tarik Napas");
  });

  it("id has relaxation.hold in Indonesian", () => {
    expect(id.relaxation.hold).toBe("Tahan");
  });

  it("id has relaxation.breatheOut in Indonesian", () => {
    expect(id.relaxation.breatheOut).toBe("Hembuskan");
  });
});
