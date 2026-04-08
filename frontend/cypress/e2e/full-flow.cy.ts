// ============================================================
// E2E: Full Experiment Flow — Happy path end-to-end
// ============================================================

import { SEL } from "../support/selectors";

describe("Full Experiment Flow (Happy Path)", () => {
  const code = `CY-FULL-${Date.now()}`;

  it("completes the entire experiment lifecycle", () => {
    // ---- Step 1: Consent ----
    cy.visit("/session/new");
    cy.contains("Welcome to the Study").should("be.visible");
    cy.completeConsent();

    // ---- Step 2: Participant Code ----
    cy.get(SEL.session.codeInput).should("be.visible");
    cy.enterParticipantCode(code);

    // ---- Step 3: Device Check ----
    cy.url({ timeout: 15_000 }).should("include", "/device-check");
    cy.contains("Device Check").should("be.visible");
    cy.completeDeviceCheck();

    // ---- Step 4: Relaxation (skip via dev controls) ----
    cy.url({ timeout: 15_000 }).should("include", "/relaxation");
    cy.contains("Get Ready").should("be.visible");
    // Wait for countdown to finish and box breathing to start
    cy.contains("Box Breathing", { timeout: 10_000 }).should("be.visible");
    cy.skipPhase();

    // ---- Step 5: Routine (write a note, then continue) ----
    cy.url({ timeout: 15_000 }).should("include", "/routine");
    cy.contains("Routine Phase").should("be.visible");

    // Intercept note save API
    cy.intercept("POST", "**/sessions/*/notes", {
      statusCode: 201,
      body: { id: "flow-note-001", char_length: 25 },
    }).as("saveNote");

    cy.get(SEL.routine.noteInput).type("Full flow test note here");
    cy.get(SEL.routine.saveBtn).click();
    cy.wait("@saveNote");
    cy.contains("Saved").should("be.visible");
    cy.get(SEL.routine.continueBtn).click();

    // ---- Step 6: Stress (skip via dev controls) ----
    cy.url({ timeout: 15_000 }).should("include", "/stress");
    cy.contains("−").should("be.visible"); // Math problem displayed
    cy.contains("Score").should("be.visible");
    cy.skipPhase();

    // ---- Step 7: Complete ----
    cy.url({ timeout: 15_000 }).should("include", "/complete");
    cy.contains("Session Complete!").should("be.visible");
    cy.contains("🎉").should("be.visible");
    cy.contains("Session Summary").should("be.visible");

    // ---- Step 8: Start new session ----
    cy.get("#new-session-btn").click();
    cy.url({ timeout: 15_000 }).should("include", "/session/new");
    cy.contains("Welcome to the Study").should("be.visible");
  });

  it("can complete multiple sessions sequentially", () => {
    const code2 = `CY-FULL2-${Date.now()}`;

    // First session — quick pass
    cy.createSessionViaUI(code2);
    cy.url({ timeout: 15_000 }).should("include", "/device-check");
    cy.completeDeviceCheck();
    cy.url({ timeout: 15_000 }).should("include", "/relaxation");
    cy.contains("Box Breathing", { timeout: 10_000 }).should("be.visible");
    cy.skipPhase();
    cy.url({ timeout: 15_000 }).should("include", "/routine");
    cy.get(SEL.routine.continueBtn).click();
    cy.url({ timeout: 15_000 }).should("include", "/stress");
    cy.skipPhase();
    cy.url({ timeout: 15_000 }).should("include", "/complete");

    // Start another session
    cy.get("#new-session-btn").click();
    cy.url({ timeout: 15_000 }).should("include", "/session/new");
    cy.contains("Welcome to the Study").should("be.visible");

    // Second session
    const code3 = `CY-FULL3-${Date.now()}`;
    cy.completeConsent();
    cy.enterParticipantCode(code3);
    cy.url({ timeout: 15_000 }).should("include", "/device-check");
  });
});
