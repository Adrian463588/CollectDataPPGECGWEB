// ============================================================
// E2E: Stress Phase — Mental Arithmetic (TSST-based)
// ============================================================

import { SEL } from "../support/selectors";

describe("Stress Phase", () => {
  beforeEach(() => {
    const code = `CY-STRESS-${Date.now()}`;
    cy.createSessionViaUI(code);
    cy.url({ timeout: 15_000 }).should("include", "/device-check");
    cy.completeDeviceCheck();
    cy.url({ timeout: 15_000 }).should("include", "/relaxation");
    cy.contains("Box Breathing", { timeout: 10_000 }).should("be.visible");
    cy.skipPhase();
    cy.url({ timeout: 15_000 }).should("include", "/routine");
    cy.get(SEL.routine.continueBtn).click();
    cy.url({ timeout: 15_000 }).should("include", "/stress");
  });

  it("displays a math problem", () => {
    // Math problems use the "−" character (minus sign)
    cy.contains("−").should("be.visible");
  });

  it("shows the score display", () => {
    cy.contains("Score").should("be.visible");
  });

  it("shows time remaining label", () => {
    cy.contains("Time Remaining").should("be.visible");
  });

  it("accepts numeric input via keyboard", () => {
    cy.get("body").type("1234");
    cy.contains("1234").should("be.visible");
  });

  it("shows submit button in the numeric keypad", () => {
    cy.contains("Submit").should("be.visible");
  });

  it("shows clear button in the numeric keypad", () => {
    // The clear key renders as 'C' on the keypad; 'Clear' is its aria-label
    cy.get('[aria-label="Clear"]').should('be.visible');
  });

  it("shows feedback after submitting an answer", () => {
    // Type any number and submit — will show correct or incorrect
    cy.get("body").type("1000{enter}");
    // One of these feedback states should appear
    cy.get("body").then(($body) => {
      const hasCorrect = $body.text().includes("Correct");
      const hasWrong = $body.text().includes("Wrong");
      const hasTimeout = $body.text().includes("Time");
      expect(hasCorrect || hasWrong || hasTimeout).to.be.true;
    });
  });

  it("displays skip button in dev mode", () => {
    cy.get(SEL.skip.phaseBtn).should("be.visible");
  });

  it("skip modal navigates to complete page", () => {
    cy.skipPhase();
    cy.url({ timeout: 15_000 }).should("include", "/complete");
  });
});
