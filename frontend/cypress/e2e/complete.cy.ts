// ============================================================
// E2E: Complete Phase — Session Completion Summary
// ============================================================

describe("Complete Phase", () => {
  beforeEach(() => {
    const code = `CY-COMP-${Date.now()}`;
    cy.createSessionViaUI(code);
    cy.url({ timeout: 15_000 }).should("include", "/device-check");
    cy.completeDeviceCheck();
    cy.url({ timeout: 15_000 }).should("include", "/relaxation");
    cy.contains("Box Breathing", { timeout: 10_000 }).should("be.visible");
    cy.skipPhase();
    cy.url({ timeout: 15_000 }).should("include", "/routine");
    cy.get("#routine-continue-btn").click();
    cy.url({ timeout: 15_000 }).should("include", "/stress");
    cy.skipPhase();
    cy.url({ timeout: 15_000 }).should("include", "/complete");
  });

  it("displays the completion emoji and title", () => {
    cy.contains("🎉").should("be.visible");
    cy.contains("Session Complete!").should("be.visible");
  });

  it("shows thank you message", () => {
    cy.contains("Thank you for participating").should("be.visible");
  });

  it("displays the session summary section", () => {
    cy.contains("Session Summary").should("be.visible");
    cy.contains("Session ID").should("be.visible");
    cy.contains("Status").should("be.visible");
  });

  it("shows the new session button", () => {
    cy.get("#new-session-btn").should("be.visible");
    cy.contains("Start New Session").should("be.visible");
  });

  it("navigates to /session/new when clicking new session", () => {
    cy.get("#new-session-btn").click();
    cy.url({ timeout: 15_000 }).should("include", "/session/new");
  });

  it("shows remove devices instruction", () => {
    cy.contains("remove your devices").should("be.visible");
  });
});
