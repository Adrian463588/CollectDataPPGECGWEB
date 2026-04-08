// ============================================================
// Selectors — Single source of truth for all UI element IDs
// (Single Responsibility Principle)
// ============================================================

export const SEL = {
  // ---- Consent Page ----
  consent: {
    checkbox: "#consent-checkbox",
    agreeBtn: "#consent-agree-btn",
  },

  // ---- Session New Page ----
  session: {
    codeInput: "#participant-code-input",
    startBtn: "#start-session-btn",
  },

  // ---- Device Check Page ----
  deviceCheck: {
    galaxyWatch: "#device-galaxy-watch",
    polarH10: "#device-polar-h10",
    continueBtn: "#device-continue-btn",
  },

  // ---- Routine Page ----
  routine: {
    noteInput: "#routine-note-input",
    saveBtn: "#save-note-btn",
    continueBtn: "#routine-continue-btn",
  },

  // ---- Skip Modal ----
  skip: {
    phaseBtn: "#skip-phase-btn",
    confirmBtn: "#skip-confirm-btn",
    cancelBtn: "#skip-cancel-btn",
  },

  // ---- Complete Page ----
  complete: {
    newSessionBtn: "#new-session-btn",
  },

  // ---- Export Page ----
  export: {
    adminKeyInput: "#admin-key-input",
    authBtn: "#auth-btn",
    prevBtn: "#prev-participant-btn",
    nextBtn: "#next-participant-btn",
    previewTable: "#preview-table",
    downloadBtn: "#download-csv-btn",
  },
} as const;
