// ============================================================
// E2E: Relaxation Phase — Countdown + Box Breathing
// ============================================================

import { SEL } from "../support/selectors";

describe("Relaxation Phase", () => {
  beforeEach(() => {
    const code = `CY-RELAX-${Date.now()}`;
    cy.createSessionViaUI(code);
    cy.url({ timeout: 15_000 }).should("include", "/device-check");
    cy.completeDeviceCheck();
    cy.url({ timeout: 15_000 }).should("include", "/relaxation");
  });

  it("shows countdown phase initially", () => {
    cy.contains("Get Ready").should("be.visible");
  });

  it("displays box breathing after countdown ends", () => {
    // Wait for countdown to finish (5 seconds)
    cy.contains("Box Breathing", { timeout: 10_000 }).should("be.visible");
  });

  it("shows time remaining label during relaxation", () => {
    cy.contains("Box Breathing", { timeout: 10_000 }).should("be.visible");
    cy.contains("Time Remaining").should("be.visible");
  });

  it("shows cycle counter during relaxation", () => {
    cy.contains("Box Breathing", { timeout: 10_000 }).should("be.visible");
    cy.contains("Cycle").should("be.visible");
  });

  it("displays skip button in dev mode", () => {
    cy.contains("Box Breathing", { timeout: 10_000 }).should("be.visible");
    cy.get(SEL.skip.phaseBtn).should("be.visible");
  });

  it("opens skip confirmation modal on skip button click", () => {
    cy.contains("Box Breathing", { timeout: 10_000 }).should("be.visible");
    cy.get(SEL.skip.phaseBtn).click();
    cy.contains("Skip Phase?").should("be.visible");
    cy.get(SEL.skip.confirmBtn).should("be.visible");
    cy.get(SEL.skip.cancelBtn).should("be.visible");
  });

  it("cancels skip and returns to relaxation", () => {
    cy.contains("Box Breathing", { timeout: 10_000 }).should("be.visible");
    cy.get(SEL.skip.phaseBtn).click();
    cy.get(SEL.skip.cancelBtn).click();
    cy.contains("Box Breathing").should("be.visible");
  });

  it("confirms skip and navigates to routine page", () => {
    cy.contains("Box Breathing", { timeout: 10_000 }).should("be.visible");
    cy.skipPhase();
    cy.url({ timeout: 15_000 }).should("include", "/routine");
  });
});
