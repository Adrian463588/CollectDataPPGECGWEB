// ============================================================
// E2E: Routine Phase — Researcher note-taking
// ============================================================

import { SEL } from "../support/selectors";

describe("Routine Phase", () => {
  beforeEach(() => {
    const code = `CY-ROUT-${Date.now()}`;
    cy.createSessionViaUI(code);
    cy.url({ timeout: 15_000 }).should("include", "/device-check");
    cy.completeDeviceCheck();
    cy.url({ timeout: 15_000 }).should("include", "/relaxation");
    // Wait for countdown, then skip relaxation
    cy.contains("Box Breathing", { timeout: 10_000 }).should("be.visible");
    cy.skipPhase();
    cy.url({ timeout: 15_000 }).should("include", "/routine");
  });

  it("displays the routine page with title and note input", () => {
    cy.contains("Routine Phase").should("be.visible");
    cy.get(SEL.routine.noteInput).should("be.visible");
  });

  it("shows save button disabled when note is empty", () => {
    cy.get(SEL.routine.saveBtn).should("be.disabled");
  });

  it("enables save button when text is entered", () => {
    cy.get(SEL.routine.noteInput).type("Test observation note");
    cy.get(SEL.routine.saveBtn).should("not.be.disabled");
  });

  it("saves a note and shows confirmation", () => {
    // Intercept the notes API for a predictable response
    cy.intercept("POST", "**/sessions/*/notes", {
      statusCode: 201,
      body: { id: "note-001", char_length: 20 },
    }).as("saveNote");

    cy.get(SEL.routine.noteInput).type("Test observation note");
    cy.get(SEL.routine.saveBtn).click();
    cy.wait("@saveNote");
    cy.contains("Saved").should("be.visible");
  });

  it("clears the textarea after saving a note", () => {
    cy.intercept("POST", "**/sessions/*/notes", {
      statusCode: 201,
      body: { id: "note-002", char_length: 15 },
    }).as("saveNote");

    cy.get(SEL.routine.noteInput).type("Another test note");
    cy.get(SEL.routine.saveBtn).click();
    cy.wait("@saveNote");
    cy.get(SEL.routine.noteInput).should("have.value", "");
  });

  it("shows saved notes summary after saving", () => {
    cy.intercept("POST", "**/sessions/*/notes", {
      statusCode: 201,
      body: { id: "note-003", char_length: 12 },
    }).as("saveNote");

    cy.get(SEL.routine.noteInput).type("A short note");
    cy.get(SEL.routine.saveBtn).click();
    cy.wait("@saveNote");
    cy.contains("Saved Notes").should("be.visible");
    cy.contains("12 chars").should("be.visible");
  });

  it("shows character counter", () => {
    cy.get(SEL.routine.noteInput).type("Hello");
    cy.contains("5/2000").should("be.visible");
  });

  it("navigates to stress phase on Continue click", () => {
    cy.get(SEL.routine.continueBtn).click();
    cy.url({ timeout: 15_000 }).should("include", "/stress");
  });
});
