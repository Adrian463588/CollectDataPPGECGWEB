// ============================================================
// TypeScript Declarations for Custom Cypress Commands
// ============================================================

declare namespace Cypress {
  interface Chainable {
    /**
     * Select an element by its `id` attribute.
     * @example cy.getById('consent-checkbox')
     */
    getById(id: string): Chainable<JQuery<HTMLElement>>;

    /**
     * Complete the consent form: check box + click agree.
     */
    completeConsent(): Chainable<void>;

    /**
     * Type a participant code and submit.
     * @param code - Participant code, e.g. "P001"
     */
    enterParticipantCode(code: string): Chainable<void>;

    /**
     * Full session creation via UI: visit /session/new, consent, enter code.
     * Navigates to device-check page upon success.
     * @param code - Participant code
     */
    createSessionViaUI(code: string): Chainable<void>;

    /**
     * Check both device checkboxes and click Continue.
     */
    completeDeviceCheck(): Chainable<void>;

    /**
     * Click the dev skip button and confirm in the modal.
     */
    skipPhase(): Chainable<void>;

    /**
     * Authenticate on the export page with the given admin key.
     * @param key - Admin API key
     */
    adminAuth(key: string): Chainable<void>;
  }
}
