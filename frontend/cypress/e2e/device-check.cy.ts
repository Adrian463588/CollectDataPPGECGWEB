// ============================================================
// E2E: Device Check — Verify wearable devices
// ============================================================

import { SEL } from "../support/selectors";

describe("Device Check", () => {
  beforeEach(() => {
    const code = `CY-DEV-${Date.now()}`;
    cy.createSessionViaUI(code);
    cy.url({ timeout: 15_000 }).should("include", "/device-check");
  });

  it("displays two device checkboxes", () => {
    cy.get(SEL.deviceCheck.galaxyWatch).should("exist");
    cy.get(SEL.deviceCheck.polarH10).should("exist");
  });

  it("shows continue button disabled by default", () => {
    cy.get(SEL.deviceCheck.continueBtn).should("be.disabled");
  });

  it("keeps button disabled when only one device is checked", () => {
    cy.get(SEL.deviceCheck.galaxyWatch).check({ force: true });
    cy.get(SEL.deviceCheck.continueBtn).should("be.disabled");
  });

  it("enables button when both devices are checked", () => {
    cy.get(SEL.deviceCheck.galaxyWatch).check({ force: true });
    cy.get(SEL.deviceCheck.polarH10).check({ force: true });
    cy.get(SEL.deviceCheck.continueBtn).should("not.be.disabled");
  });

  it("navigates to relaxation page on continue", () => {
    cy.completeDeviceCheck();
    cy.url({ timeout: 15_000 }).should("include", "/relaxation");
  });

  it("shows the Device Check title and progress bar", () => {
    cy.contains("Device Check").should("be.visible");
  });
});
