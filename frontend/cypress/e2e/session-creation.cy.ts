// ============================================================
// E2E: Session Creation — Consent + Participant Code Entry
// ============================================================

import { SEL } from "../support/selectors";

describe("Session Creation", () => {
  beforeEach(() => {
    cy.visit("/session/new");
  });

  // ---- Root redirect ----

  it("redirects root (/) to /session/new", () => {
    cy.visit("/");
    cy.url().should("include", "/session/new");
  });

  // ---- Consent step ----

  it("displays the consent form on load", () => {
    cy.contains("Welcome to the Study").should("be.visible");
    cy.get(SEL.consent.checkbox).should("exist");
    cy.get(SEL.consent.agreeBtn).should("be.disabled");
  });

  it("enables the agree button only when consent checkbox is checked", () => {
    cy.get(SEL.consent.agreeBtn).should("be.disabled");
    cy.get(SEL.consent.checkbox).check({ force: true });
    cy.get(SEL.consent.agreeBtn).should("not.be.disabled");
  });

  it("disables the agree button when consent is unchecked", () => {
    cy.get(SEL.consent.checkbox).check({ force: true });
    cy.get(SEL.consent.agreeBtn).should("not.be.disabled");
    cy.get(SEL.consent.checkbox).uncheck({ force: true });
    cy.get(SEL.consent.agreeBtn).should("be.disabled");
  });

  it("proceeds to participant code step after agreeing", () => {
    cy.completeConsent();
    cy.get(SEL.session.codeInput).should("be.visible");
    cy.contains("Participant Code").should("be.visible");
  });

  // ---- Participant code step ----

  it("shows start button disabled when code is empty", () => {
    cy.completeConsent();
    cy.get(SEL.session.startBtn).should("be.disabled");
  });

  it("converts participant code to uppercase", () => {
    cy.completeConsent();
    cy.get(SEL.session.codeInput).type("abc123");
    cy.get(SEL.session.codeInput).should("have.value", "ABC123");
  });

  it("creates a session and redirects to device-check on valid code", () => {
    const code = `CY-${Date.now()}`;
    cy.completeConsent();
    cy.enterParticipantCode(code);
    cy.url({ timeout: 15_000 }).should("include", "/device-check");
  });

  it("submits participant code on Enter key press", () => {
    const code = `CY-ENTER-${Date.now()}`;
    cy.completeConsent();
    cy.get(SEL.session.codeInput).type(`${code}{enter}`);
    cy.url({ timeout: 15_000 }).should("include", "/device-check");
  });
});
