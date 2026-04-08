// ============================================================
// Cypress Configuration — Experiment Controller E2E Tests
// ============================================================

import { defineConfig } from "cypress";

export default defineConfig({
  // Allow Cypress.env() usage in tests (required for reading cypress.env.json values)
  allowCypressEnv: true,
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    defaultCommandTimeout: 10_000,
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    // Retry flaky tests once in CI
    retries: {
      runMode: 1,
      openMode: 0,
    },
  },
});
