// ============================================================
// routine-confirm-i18n.test.ts
// Tests that the routine data-confirm i18n keys exist and
// contain the expected values in both en and id locales.
// ============================================================

describe("routine confirm modal i18n — en locale", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const en = require("@/i18n/en.json") as Record<string, Record<string, string>>;

  it("has routine.confirmTitle", () => {
    expect(en.routine.confirmTitle).toBeTruthy();
  });

  it("has routine.confirmMessage", () => {
    expect(en.routine.confirmMessage).toBeTruthy();
  });

  it("has routine.confirmBtn", () => {
    expect(en.routine.confirmBtn).toBeTruthy();
  });

  it("routine.confirmMessage is a question", () => {
    expect(en.routine.confirmMessage.endsWith("?")).toBe(true);
  });
});

describe("routine confirm modal i18n — id locale", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const id = require("@/i18n/id.json") as Record<string, Record<string, string>>;

  it("has routine.confirmTitle in Indonesian", () => {
    expect(id.routine.confirmTitle).toBeTruthy();
  });

  it("has routine.confirmMessage in Indonesian", () => {
    expect(id.routine.confirmMessage).toBe(
      "Apakah data sudah tersimpan dengan benar?"
    );
  });

  it("has routine.confirmBtn in Indonesian", () => {
    expect(id.routine.confirmBtn).toBeTruthy();
  });

  it("routine.confirmMessage ends with a question mark", () => {
    expect(id.routine.confirmMessage.endsWith("?")).toBe(true);
  });
});
