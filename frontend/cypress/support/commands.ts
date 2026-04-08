// ============================================================
// Custom Commands — Reusable multi-step interactions (DRY)
// ============================================================

import { SEL } from "./selectors";

// ---- Atomic helpers ----

/** Shorthand: select an element by its #id. */
Cypress.Commands.add("getById", (id: string) => {
  return cy.get(`#${id}`);
});

// ---- Consent flow ----

/** Check the consent checkbox and click "I Agree — Continue". */
Cypress.Commands.add("completeConsent", () => {
  cy.get(SEL.consent.checkbox).check({ force: true });
  cy.get(SEL.consent.agreeBtn).should("not.be.disabled").click();
});

// ---- Participant code ----

/** Type a participant code and click "Start Session". */
Cypress.Commands.add("enterParticipantCode", (code: string) => {
  cy.get(SEL.session.codeInput).clear().type(code);
  cy.get(SEL.session.startBtn).should("not.be.disabled").click();
});

// ---- Combined: create session via UI ----

/** Complete consent + enter participant code in one call. */
Cypress.Commands.add("createSessionViaUI", (code: string) => {
  cy.visit("/session/new");
  cy.completeConsent();
  cy.get(SEL.session.codeInput).should("be.visible");
  cy.enterParticipantCode(code);
});

// ---- Device check ----

/** Check both device checkboxes and click Continue. */
Cypress.Commands.add("completeDeviceCheck", () => {
  cy.get(SEL.deviceCheck.galaxyWatch).check({ force: true });
  cy.get(SEL.deviceCheck.polarH10).check({ force: true });
  cy.get(SEL.deviceCheck.continueBtn).should("not.be.disabled").click();
});

// ---- Skip phase ----

/** Click the dev skip button, then confirm in the modal. */
Cypress.Commands.add("skipPhase", () => {
  cy.get(SEL.skip.phaseBtn).click();
  cy.get(SEL.skip.confirmBtn).should("be.visible").click();
});

// ---- Admin auth ----

/** Type admin key and click Authenticate on the export page. */
Cypress.Commands.add("adminAuth", (key: string) => {
  cy.get(SEL.export.adminKeyInput).clear().type(key);
  cy.get(SEL.export.authBtn).click();
});
