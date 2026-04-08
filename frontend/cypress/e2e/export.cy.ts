// ============================================================
// E2E: Export Page — Admin auth + preview + CSV download
// ============================================================

import { SEL } from "../support/selectors";

describe("Export Page", () => {
  const ADMIN_KEY = Cypress.env("ADMIN_API_KEY") || "test123";

  beforeEach(() => {
    cy.visit("/export");
  });

  // ---- Auth gate ----

  describe("Authentication Gate", () => {
    it("displays the auth form on load", () => {
      cy.contains("Data Export").should("be.visible");
      cy.get(SEL.export.adminKeyInput).should("be.visible");
      cy.get(SEL.export.authBtn).should("be.visible");
    });

    it("shows auth button disabled with empty key", () => {
      cy.get(SEL.export.authBtn).should("be.disabled");
    });

    it("enables auth button when key is typed", () => {
      cy.get(SEL.export.adminKeyInput).type("any-key");
      cy.get(SEL.export.authBtn).should("not.be.disabled");
    });

    it("shows error with invalid admin key", () => {
      cy.get(SEL.export.adminKeyInput).type("wrong-key-xyz");
      cy.get(SEL.export.authBtn).click();
      cy.contains("Invalid admin key", { timeout: 10_000 }).should("be.visible");
    });

    it("authenticates with valid admin key", () => {
      cy.adminAuth(ADMIN_KEY);
      cy.contains("Phase Timeline Export", { timeout: 10_000 }).should("be.visible");
    });

    it("submits admin key with Enter key", () => {
      cy.get(SEL.export.adminKeyInput).type(`${ADMIN_KEY}{enter}`);
      cy.contains("Phase Timeline Export", { timeout: 10_000 }).should("be.visible");
    });
  });

  // ---- Dashboard (after auth) ----

  describe("Export Dashboard", () => {
    beforeEach(() => {
      cy.adminAuth(ADMIN_KEY);
      cy.contains("Phase Timeline Export", { timeout: 10_000 }).should("be.visible");
    });

    it("shows the download CSV button", () => {
      cy.get(SEL.export.downloadBtn).should("be.visible");
      cy.contains("Download CSV").should("be.visible");
    });

    it("shows CSV note at the bottom", () => {
      cy.contains("participant_code").should("be.visible");
    });
  });

  // ---- Preview with mock data ----

  describe("Preview Table (mocked API)", () => {
    beforeEach(() => {
      // Intercept the admin sessions check for auth
      cy.intercept("GET", "**/admin/sessions", {
        statusCode: 200,
        body: { sessions: [], total: 0 },
      }).as("authCheck");

      // Intercept preview API with fixture data
      cy.fixture("session").then((fixture) => {
        cy.intercept("GET", "**/admin/export/preview", {
          statusCode: 200,
          body: fixture.mockExportPreview,
        }).as("preview");
      });

      cy.get(SEL.export.adminKeyInput).type("mock-key");
      cy.get(SEL.export.authBtn).click();
      cy.wait("@authCheck");
      cy.wait("@preview");
    });

    it("displays the preview table with participant data", () => {
      cy.get(SEL.export.previewTable).should("be.visible");
      cy.contains("CY-TEST-001").should("be.visible");
    });

    it("shows phase badges in preview", () => {
      cy.contains("Relax").should("be.visible");
      cy.contains("Stress").should("be.visible");
    });

    it("shows score columns", () => {
      cy.contains("Correct").should("be.visible");
      cy.contains("Incorrect").should("be.visible");
      cy.contains("Total Q").should("be.visible");
    });

    it("shows participant counter (1 of 1)", () => {
      cy.contains("Participant 1 of 1").should("be.visible");
    });

    it("disables previous/next when only one participant", () => {
      cy.get(SEL.export.prevBtn).should("be.disabled");
      cy.get(SEL.export.nextBtn).should("be.disabled");
    });
  });

  // ---- Download CSV ----

  describe("CSV Download", () => {
    it("triggers download on button click", () => {
      // Intercept the CSV download endpoint
      cy.intercept("GET", "**/admin/export/participants.csv", {
        statusCode: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="test.csv"',
        },
        body: "participant_code,phase,start,end,date\nTEST,Relax,2026-01-01,2026-01-01,2026-01-01",
      }).as("download");

      cy.adminAuth(ADMIN_KEY);
      cy.contains("Phase Timeline Export", { timeout: 10_000 }).should("be.visible");
      cy.get(SEL.export.downloadBtn).click();
      cy.wait("@download");

      // After download, button text should change
      cy.contains("Downloaded", { timeout: 5_000 }).should("be.visible");
    });
  });
});
