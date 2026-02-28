// ============================================================
// Stress Phase — Mental Arithmetic (TSST-based)
// ============================================================

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import MathProblem from "@/components/stress/MathProblem";
import NumericKeypad from "@/components/stress/NumericKeypad";
import ScoreDisplay from "@/components/stress/ScoreDisplay";
import CountdownTimer from "@/components/ui/CountdownTimer";
import SkipConfirmModal from "@/components/ui/SkipConfirmModal";
import ProgressBar from "@/components/ui/ProgressBar";
import PhaseIndicator from "@/components/layout/PhaseIndicator";
import { useCountdown } from "@/hooks/useCountdown";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { useEventLogger } from "@/hooks/useEventLogger";
import { useDevControls } from "@/hooks/useDevControls";
import {
  playTransitionBeep,
  playStimulusBeep,
  playCorrectChime,
  playIncorrectBuzz,
  stopAllAudio,
} from "@/lib/audio";
import { DEFAULT_SESSION_CONFIG } from "@/lib/types";

const STRESS_DURATION_MS = DEFAULT_SESSION_CONFIG.stress_duration_ms;
const QUESTION_TIMEOUT_MS = DEFAULT_SESSION_CONFIG.question_timeout_ms;

// ---- Problem Generator (client-side for immediate display) ----
interface Problem {
  id: string;
  text: string;
  answer: number;
}

function generateProblem(): Problem {
  const a = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
  const b = Math.floor(Math.random() * 90) + 10;     // 10-99
  return {
    id: uuidv4(),
    text: `${a} − ${b}`,
    answer: a - b,
  };
}

export default function StressPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [problem, setProblem] = useState<Problem>(generateProblem);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | "timeout" | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [questionNumber, setQuestionNumber] = useState(1);
  const [disabled, setDisabled] = useState(false);
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const devControls = useDevControls();

  const problemStartRef = useRef<number>(Date.now());
  const { logEvent } = useEventLogger(sessionId);
  useHeartbeat(sessionId);

  // ---- Phase timer ----
  const handlePhaseComplete = useCallback(() => {
    void logEvent("SESSION_COMPLETE", {
      total_duration_ms: STRESS_DURATION_MS,
      problems_total: score.total,
      problems_correct: score.correct,
    });
    void logEvent("PHASE_TRANSITION", {
      from_phase: "STRESS",
      to_phase: "COMPLETE",
    });
    playTransitionBeep();
    // Kill all audio AFTER the final beep is scheduled.
    // The safe timeout in playTransitionBeep will be cancelled by stopAllAudio
    // within 150ms, but the first tone already started.
    // We use a brief delay so the first tone plays, then kill everything.
    setTimeout(() => stopAllAudio(), 200);
    router.push(`/session/${sessionId}/complete`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, sessionId, logEvent]);

  const phaseTimer = useCountdown(handlePhaseComplete);

  // ---- Question timer ----
  const handleQuestionTimeout = useCallback(() => {
    setFeedback("timeout");
    setDisabled(true);
    void logEvent("RESPONSE_TIMEOUT", { stimulus_id: problem.id });

    setScore((prev) => ({ ...prev, total: prev.total + 1 }));

    setTimeout(() => {
      nextProblem();
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id, logEvent]);

  const questionTimer = useCountdown(handleQuestionTimeout);

  // ---- Next problem ----
  const nextProblem = useCallback(() => {
    const next = generateProblem();
    setProblem(next);
    setInputValue("");
    setFeedback(null);
    setDisabled(false);
    setQuestionNumber((n) => n + 1);
    problemStartRef.current = Date.now();

    void logEvent("STIMULUS_SHOWN", {
      stimulus_id: next.id,
      problem_text: next.text,
      correct_answer: next.answer,
    });
    playStimulusBeep();
    questionTimer.start(QUESTION_TIMEOUT_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logEvent]);

  // ---- Submit answer ----
  const handleSubmit = useCallback(() => {
    if (disabled || !inputValue) return;

    const reactionTimeMs = Date.now() - problemStartRef.current;
    const participantAnswer = parseInt(inputValue, 10);
    const isCorrect = participantAnswer === problem.answer;

    questionTimer.reset();
    setDisabled(true);
    setFeedback(isCorrect ? "correct" : "incorrect");
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    void logEvent("RESPONSE_SUBMITTED", {
      stimulus_id: problem.id,
      participant_answer: participantAnswer,
      is_correct: isCorrect,
      reaction_time_ms: reactionTimeMs,
    });

    if (isCorrect) playCorrectChime();
    else playIncorrectBuzz();

    setTimeout(() => {
      nextProblem();
    }, isCorrect ? 500 : 1000);
  }, [disabled, inputValue, problem, questionTimer, logEvent, nextProblem]);

  // ---- Keyboard input ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key >= "0" && e.key <= "9") {
        setInputValue((v) => v + e.key);
      } else if (e.key === "Backspace") {
        setInputValue((v) => v.slice(0, -1));
      } else if (e.key === "Enter" && inputValue) {
        handleSubmit();
      } else if (e.key === "Escape") {
        setInputValue("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, inputValue, handleSubmit]);

  // ---- Initialize ----
  useEffect(() => {
    phaseTimer.start(STRESS_DURATION_MS);

    void logEvent("PHASE_TRANSITION", {
      from_phase: "RELAXATION",
      to_phase: "STRESS",
    });
    void logEvent("STIMULUS_SHOWN", {
      stimulus_id: problem.id,
      problem_text: problem.text,
      correct_answer: problem.answer,
    });
    playStimulusBeep();
    questionTimer.start(QUESTION_TIMEOUT_MS);
    problemStartRef.current = Date.now();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Skip handlers ----
  const handleSkipClick = useCallback(() => {
    void logEvent("SKIP_CLICKED", { phase: "STRESS" });
    setSkipModalOpen(true);
  }, [logEvent]);

  const handleSkipCancel = useCallback(() => {
    void logEvent("SKIP_CANCELLED", { phase: "STRESS" });
    setSkipModalOpen(false);
  }, [logEvent]);

  const handleSkipConfirm = useCallback(() => {
    setSkipModalOpen(false);
    void logEvent("SKIP_CONFIRMED", { phase: "STRESS" });
    // Stop all timers and audio
    phaseTimer.reset();
    questionTimer.reset();
    stopAllAudio();
    void logEvent("PHASE_TRANSITION", {
      from_phase: "STRESS",
      to_phase: "COMPLETE",
      end_reason: "manual_skip",
    });
    router.push(`/session/${sessionId}/complete`);
  }, [logEvent, phaseTimer, questionTimer, router, sessionId]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-6 pt-4 flex items-center justify-between">
        <PhaseIndicator phase="STRESS" />
      </div>

      <div className="px-6 pt-2">
        <ProgressBar currentPhase="STRESS" />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Phase timer */}
        <CountdownTimer
          remainingMs={phaseTimer.remainingMs}
          totalMs={STRESS_DURATION_MS}
          label="Phase Time"
          size="sm"
        />

        {/* Score */}
        <ScoreDisplay
          correct={score.correct}
          total={score.total}
          visible={DEFAULT_SESSION_CONFIG.score_visible}
        />

        {/* Math problem */}
        <MathProblem
          problemText={problem.text}
          questionNumber={questionNumber}
          feedback={feedback}
        />

        {/* Question timer */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>⏱</span>
          <CountdownTimer
            remainingMs={questionTimer.remainingMs}
            totalMs={QUESTION_TIMEOUT_MS}
            size="sm"
          />
        </div>

        {/* Input */}
        <NumericKeypad
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          onValidationError={(reason) => {
            void logEvent("VALIDATION_ERROR" as Parameters<typeof logEvent>[0], {
              reason,
              value_length: inputValue.length,
              phase: "STRESS",
            });
          }}
          disabled={disabled}
        />

        {/* Dev Controls: Skip button */}
        {devControls && (
          <button
            onClick={handleSkipClick}
            className="mt-2 px-4 py-2 rounded-lg text-sm font-medium text-amber-300 bg-amber-900/30 border border-amber-700/40 hover:bg-amber-800/40 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            id="skip-phase-btn"
          >
            ⏩ Skip Phase (Dev)
          </button>
        )}
      </main>

      {/* Skip confirmation modal */}
      <SkipConfirmModal
        open={skipModalOpen}
        onConfirm={handleSkipConfirm}
        onCancel={handleSkipCancel}
        phaseName="Stress"
      />
    </div>
  );
}
