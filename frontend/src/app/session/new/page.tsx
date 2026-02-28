// ============================================================
// Session New — Consent + Participant Code Entry
// ============================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Header from "@/components/layout/Header";
import { useSession } from "@/hooks/useSession";
import { resumeAudioContext } from "@/lib/audio";

export default function SessionNewPage() {
  const router = useRouter();
  const { initSession, loading, error } = useSession();

  const [participantCode, setParticipantCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState<"consent" | "code">("consent");

  const handleConsent = () => {
    setStep("code");
    // Pre-warm audio context on user gesture
    void resumeAudioContext();
  };

  const handleStart = async () => {
    if (!participantCode.trim()) return;
    try {
      const session = await initSession(participantCode.trim());
      router.push(`/session/${session.id}/device-check`);
    } catch {
      // Error is handled by useSession hook
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          {step === "consent" ? (
            <Card>
              <h2 className="text-2xl font-bold text-white mb-4">
                Welcome to the Study
              </h2>
              <div className="prose prose-invert prose-sm mb-6">
                <p className="text-slate-300 leading-relaxed">
                  Thank you for participating in this early stress detection research study.
                  During this session, you will complete a{" "}
                  <strong>5-minute relaxation phase</strong> followed by a{" "}
                  <strong>5-minute mental arithmetic task</strong>.
                </p>
                <p className="text-slate-300 leading-relaxed mt-3">
                  Your physiological signals will be recorded by the wearable devices
                  you are wearing (Samsung Galaxy Watch and Polar H10). This web
                  application manages the experiment timeline only — it does not
                  access your device data directly.
                </p>
                <p className="text-slate-300 leading-relaxed mt-3">
                  All data collected is pseudonymous. No personally identifiable
                  information is stored.
                </p>
              </div>

              <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                  id="consent-checkbox"
                />
                <span className="text-sm text-slate-300 group-hover:text-slate-200">
                  I have read and understood the study information above. I agree to
                  participate in this session.
                </span>
              </label>

              <Button
                onClick={handleConsent}
                disabled={!agreed}
                className="w-full"
                size="lg"
                id="consent-agree-btn"
              >
                I Agree — Continue
              </Button>
            </Card>
          ) : (
            <Card>
              <h2 className="text-2xl font-bold text-white mb-2">
                Participant Code
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Enter the code provided by your researcher.
              </p>

              <input
                type="text"
                value={participantCode}
                onChange={(e) => setParticipantCode(e.target.value.toUpperCase())}
                placeholder="e.g. P001"
                maxLength={50}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                id="participant-code-input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleStart();
                }}
              />

              {error && (
                <p className="text-sm text-red-400 mb-4">{error}</p>
              )}

              <Button
                onClick={handleStart}
                disabled={!participantCode.trim()}
                loading={loading}
                className="w-full"
                size="lg"
                id="start-session-btn"
              >
                Start Session
              </Button>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
}
