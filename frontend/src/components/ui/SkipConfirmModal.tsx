// ============================================================
// SkipConfirmModal — Confirmation dialog for skipping a phase
// Features: focus trap, keyboard handling (Esc/Enter), overlay
// i18n: all strings via useT()
// ============================================================

"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/i18n/provider";

interface SkipConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  phaseName: string;
  /** Optional override for the modal title (defaults to skip.title) */
  title?: string;
  /** Optional override for the body message (defaults to skip.message) */
  message?: string;
  /** Optional label for the confirm button (defaults to skip.confirm) */
  confirmLabel?: string;
}

export default function SkipConfirmModal({
  open,
  onConfirm,
  onCancel,
  phaseName,
  title,
  message,
  confirmLabel,
}: SkipConfirmModalProps) {
  const t = useT();
  const resolvedTitle = title ?? t("skip.title");
  const resolvedMessage = message ?? t("skip.message", { phase: phaseName });
  const resolvedConfirmLabel = confirmLabel ?? t("skip.confirm");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus the Confirm button when modal opens
  useEffect(() => {
    if (open && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [open]);

  // Keyboard handling
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      } else if (e.key === "Tab") {
        // Focus trap: cycle between Cancel and Confirm
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [open, onCancel, onConfirm]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={t("skip.title")}
            aria-describedby="skip-modal-message"
          >
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">
                {resolvedTitle}
              </h3>
              <p id="skip-modal-message" className="text-sm text-slate-400 mb-6">
                {resolvedMessage}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                  id="skip-cancel-btn"
                >
                  {t("skip.cancel")}
                </button>
                <button
                  ref={confirmRef}
                  onClick={onConfirm}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-amber-600 hover:bg-amber-500 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
                  id="skip-confirm-btn"
                >
                  {resolvedConfirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
