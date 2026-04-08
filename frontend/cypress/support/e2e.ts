// ============================================================
// E2E Support — Global hooks and imports
// ============================================================

import "./commands";

// Prevent Cypress from failing on uncaught exceptions thrown by Next.js
// (e.g. hydration mismatches, dynamic import errors during navigation).
Cypress.on("uncaught:exception", () => false);

// Clear localStorage before each test to ensure consistent English locale.
beforeEach(() => {
  cy.window().then((win) => {
    win.localStorage.removeItem("experiment-controller-lang");
  });
});
