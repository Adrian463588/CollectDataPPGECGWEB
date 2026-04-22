// ============================================================
// Stress Phase — Interleaved TSST (Arithmetic) + SCWT (Stroop)
// Pattern: Arithmetic → Stroop → Arithmetic → Stroop → ...
// Arithmetic logs to RESPONSE_SUBMITTED (+ /responses endpoint).
// SCWT logs to SCWT_RESPONSE event (client-side graded only).
// Follows SOLID / DRY — task-specific logic isolated in handlers.
// ============================================================

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import MathProblem from "@/components/stress/MathProblem";
import NumericKeypad from "@/components/stress/NumericKeypad";
import StroopCard, {
  type StroopProblem,
  type StroopColor,
  ALL_STROOP_COLORS,
} from "@/components/stress/StroopCard";
import ScoreDisplay from "@/components/stress/ScoreDisplay";
import CountdownTimer from "@/components/ui/CountdownTimer";
import SkipConfirmModal from "@/components/ui/SkipConfirmModal";
import ProgressBar from "@/components/ui/ProgressBar";
import PhaseIndicator from "@/components/layout/PhaseIndicator";

import { useCountdown } from "@/hooks/useCountdown";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { useEventLogger } from "@/hooks/useEventLogger";

import {
  playTransitionBeep,
  playStimulusBeep,
  playCorrectChime,
  playIncorrectBuzz,
  stopAllAudio,
} from "@/lib/audio";
import { DEFAULT_SESSION_CONFIG } from "@/lib/types";
import { useT } from "@/i18n/provider";

// ---- Constants ----

const STRESS_DURATION_MS   = DEFAULT_SESSION_CONFIG.stress_duration_ms;
const QUESTION_TIMEOUT_MS  = DEFAULT_SESSION_CONFIG.question_timeout_ms;
const SCWT_TIMEOUT_MS      = 3000;

type TaskType = "arithmetic" | "stroop";
type Feedback = "correct" | "incorrect" | "timeout" | null;

// ---- Arithmetic problem generator ----

interface ArithmeticProblem {
  id: string;
  text: string;
  answer: number;
}

function generateArithmetic(): ArithmeticProblem {
  const a = Math.floor(Math.random() * 9000) + 1000; // 1000–9999
  const b = Math.floor(Math.random() * 90) + 10;     // 10–99
  return { id: uuidv4(), text: `${a} − ${b}`, answer: a - b };
}

// ---- Stroop problem generator ----

function generateStroop(): StroopProblem {
  const colors = ALL_STROOP_COLORS;
  const word = colors[Math.floor(Math.random() * colors.length)];
  // inkColor must differ from word
  const otherColors = colors.filter((c) => c !== word);
  const inkColor = otherColors[Math.floor(Math.random() * otherColors.length)];
  return { id: uuidv4(), word, inkColor, correctAnswer: inkColor };
}

// ---- Score state ----

interface ScoreState {
  arithmeticCorrect: number;
  arithmeticTotal: number;
  scwtCorrect: number;
  scwtTotal: number;
}

const INITIAL_SCORE: ScoreState = {
  arithmeticCorrect: 0,
  arithmeticTotal: 0,
  scwtCorrect: 0,
  scwtTotal: 0,
};

// ---- Component ----

export default function StressPage() {
  const t          = useT();
  const router     = useRouter();
  const params     = useParams();
  const sessionId  = params.id as string;

  // ---- Task state ----
  const [taskType,      setTaskType]      = useState<TaskType>("arithmetic");
  const [arithmetic,    setArithmetic]    = useState<ArithmeticProblem>(generateArithmetic);
  const [stroop,        setStroop]        = useState<StroopProblem>(generateStroop);
  const [inputValue,    setInputValue]    = useState("");
  const [feedback,      setFeedback]      = useState<Feedback>(null);
  const [score,         setScore]         = useState<ScoreState>(INITIAL_SCORE);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [disabled,      setDisabled]      = useState(false);
  const [skipModalOpen, setSkipModalOpen] = useState(false);

  // Stable ref for nextTask — prevents stale closure in question timeout
  const nextTaskRef       = useRef<() => void>(() => {});
  const problemStartRef   = useRef<number>(Date.now());
  const { logEvent }      = useEventLogger(sessionId);
  useHeartbeat(sessionId);

  // Track the currently-displayed stimulus so the timeout callback can
  // emit a RESPONSE_SUBMITTED event with the correct stimulus_id/type.
  const currentStimulusIdRef   = useRef<string>(arithmetic.id);
  const currentStimulusTypeRef = useRef<TaskType>("arithmetic");

  // ---- Phase timer (stable callback via ref) ----
  const scoreRef = useRef(score);
  scoreRef.current = score;

  const phaseTimer = useCountdown(
    useCallback(() => {
      const s = scoreRef.current;
      void logEvent("SESSION_COMPLETE", {
        total_duration_ms:      STRESS_DURATION_MS,
        arithmetic_total:       s.arithmeticTotal,
        arithmetic_correct:     s.arithmeticCorrect,
        scwt_total:             s.scwtTotal,
        scwt_correct:           s.scwtCorrect,
      });
      void logEvent("PHASE_TRANSITION", { from_phase: "STRESS", to_phase: "COMPLETE" });
      playTransitionBeep();
      setTimeout(() => stopAllAudio(), 200);
      router.push(`/session/${sessionId}/complete`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // ---- Question timer ----
  const questionTimer = useCountdown(
    useCallback(() => {
      setFeedback("timeout");
      setDisabled(true);

      const isArithmetic = currentStimulusTypeRef.current === "arithmetic";

      // Update live score display — timeout is treated as incorrect.
      setScore((prev) => ({
        ...prev,
        arithmeticTotal: prev.arithmeticTotal + (isArithmetic ? 1 : 0),
        scwtTotal:        prev.scwtTotal        + (!isArithmetic ? 1 : 0),
      }));

      // Emit RESPONSE_SUBMITTED so the backend export counts this as incorrect.
      // timed_out:true lets analysts distinguish timeouts from submitted wrong answers.
      void logEvent("RESPONSE_SUBMITTED", {
        stimulus_id:       currentStimulusIdRef.current,
        stimulus_type:     currentStimulusTypeRef.current,
        participant_answer: null,
        is_correct:        false,
        timed_out:         true,
        reaction_time_ms:  isArithmetic ? QUESTION_TIMEOUT_MS : SCWT_TIMEOUT_MS,
      });

      setTimeout(() => nextTaskRef.current(), 1000);
    }, [logEvent])
  );

  // ---- Advance to next task (alternating) ----
  const nextTask = useCallback((currentType: TaskType) => {
    const nextType: TaskType = currentType === "arithmetic" ? "stroop" : "arithmetic";

    if (nextType === "arithmetic") {
      const next = generateArithmetic();
      setArithmetic(next);
      // Keep refs current so the question-timeout callback has the right stimulus.
      currentStimulusIdRef.current   = next.id;
      currentStimulusTypeRef.current = "arithmetic";
      void logEvent("STIMULUS_SHOWN", {
        stimulus_id:    next.id,
        stimulus_type:  "arithmetic",
        problem_text:   next.text,
        correct_answer: next.answer,
      });
    } else {
      const next = generateStroop();
      setStroop(next);
      currentStimulusIdRef.current   = next.id;
      currentStimulusTypeRef.current = "stroop";
      void logEvent("STIMULUS_SHOWN", {
        stimulus_id:    next.id,
        stimulus_type:  "stroop",
        word:           next.word,
        ink_color:      next.inkColor,
        correct_answer: next.correctAnswer,
      });
    }

    setTaskType(nextType);
    setInputValue("");
    setFeedback(null);
    setDisabled(false);
    setQuestionNumber((n) => n + 1);
    problemStartRef.current = Date.now();
    playStimulusBeep();
    questionTimer.start(nextType === "arithmetic" ? QUESTION_TIMEOUT_MS : SCWT_TIMEOUT_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logEvent]);

  // Keep ref current so timeout callback always calls latest nextTask
  // We capture taskType via closure snapshot
  const taskTypeRef = useRef<TaskType>("arithmetic");
  taskTypeRef.current = taskType;
  nextTaskRef.current = useCallback(
    () => nextTask(taskTypeRef.current),
    [nextTask]
  );

  // ---- Submit arithmetic answer ----
  const submitArithmetic = useCallback(
    (value: string) => {
      if (disabled || !value) return;
      const reactionMs  = Date.now() - problemStartRef.current;
      const answer      = parseInt(value, 10);
      const isCorrect   = answer === arithmetic.answer;

      questionTimer.reset();
      setDisabled(true);
      setFeedback(isCorrect ? "correct" : "incorrect");
      setScore((prev) => ({
        ...prev,
        arithmeticCorrect: prev.arithmeticCorrect + (isCorrect ? 1 : 0),
        arithmeticTotal:   prev.arithmeticTotal   + 1,
      }));

      void logEvent("RESPONSE_SUBMITTED", {
        stimulus_id:        arithmetic.id,
        stimulus_type:      "arithmetic",
        participant_answer: answer,
        is_correct:         isCorrect,
        reaction_time_ms:   reactionMs,
      });

      if (isCorrect) playCorrectChime(); else playIncorrectBuzz();
      setTimeout(() => nextTask("arithmetic"), isCorrect ? 500 : 1000);
    },
    [disabled, arithmetic, questionTimer, logEvent, nextTask]
  );

  // Auto-submit arithmetic when typed answer matches
  const handleArithmeticInput = useCallback(
    (next: string) => {
      setInputValue(next);
      if (!next) return;
      if (parseInt(next, 10) === arithmetic.answer) submitArithmetic(next);
    },
    [arithmetic.answer, submitArithmetic]
  );

  // ---- Submit SCWT answer ----
  const submitStroop = useCallback(
    (chosen: StroopColor) => {
      if (disabled) return;
      const reactionMs = Date.now() - problemStartRef.current;
      const isCorrect  = chosen === stroop.correctAnswer;

      questionTimer.reset();
      setDisabled(true);
      setFeedback(isCorrect ? "correct" : "incorrect");
      setScore((prev) => ({
        ...prev,
        scwtCorrect: prev.scwtCorrect + (isCorrect ? 1 : 0),
        scwtTotal:   prev.scwtTotal   + 1,
      }));

      // SCWT uses its own event type — not stored in responses table.
      void logEvent("SCWT_RESPONSE", {
        stimulus_id:       stroop.id,
        stimulus_type:     "stroop",
        word:              stroop.word,
        ink_color:         stroop.inkColor,
        chosen_color:      chosen,
        correct_answer:    stroop.correctAnswer,
        is_correct:        isCorrect,
        reaction_time_ms:  reactionMs,
      });

      if (isCorrect) playCorrectChime(); else playIncorrectBuzz();
      setTimeout(() => nextTask("stroop"), isCorrect ? 500 : 1000);
    },
    [disabled, stroop, questionTimer, logEvent, nextTask]
  );

  // ---- Keyboard ----
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      
      if (taskType === "arithmetic") {
        if (e.key >= "0" && e.key <= "9") handleArithmeticInput(inputValue + e.key);
        else if (e.key === "Backspace")    setInputValue((v) => v.slice(0, -1));
        else if (e.key === "Enter" && inputValue) submitArithmetic(inputValue);
        else if (e.key === "Escape")       setInputValue("");
      } else if (taskType === "stroop") {
        const key = e.key.toLowerCase();
        if (key === "r" || key === "m") submitStroop("red");
        else if (key === "g" || key === "h") submitStroop("green");
        else if (key === "b") submitStroop("blue");
        else if (key === "y" || key === "k") submitStroop("yellow");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [taskType, disabled, inputValue, submitArithmetic, handleArithmeticInput, submitStroop]);

  // ---- Initialize on mount ----
  useEffect(() => {
    phaseTimer.start(STRESS_DURATION_MS);

    void logEvent("PHASE_TRANSITION", { from_phase: "RELAXATION", to_phase: "STRESS" });
    void logEvent("STIMULUS_SHOWN", {
      stimulus_id:    arithmetic.id,
      stimulus_type:  "arithmetic",
      problem_text:   arithmetic.text,
      correct_answer: arithmetic.answer,
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
    phaseTimer.reset();
    questionTimer.reset();
    stopAllAudio();
    void logEvent("PHASE_TRANSITION", {
      from_phase: "STRESS",
      to_phase:   "COMPLETE",
      end_reason: "manual_skip",
    });
    router.push(`/session/${sessionId}/complete`);
  }, [logEvent, phaseTimer, questionTimer, router, sessionId]);

  // ---- Combined display score ----
  const totalCorrect = score.arithmeticCorrect + score.scwtCorrect;
  const totalItems   = score.arithmeticTotal   + score.scwtTotal;

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
          label={t("relaxation.timeRemaining")}
          size="sm"
        />

        {/* Combined score */}
        <ScoreDisplay
          correct={totalCorrect}
          total={totalItems}
          visible={DEFAULT_SESSION_CONFIG.score_visible}
        />

        {/* Task type badge */}
        <div className={`
          px-4 py-1 rounded-full text-xs font-semibold tracking-wide uppercase
          ${taskType === "arithmetic"
            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
            : "bg-violet-500/20 text-violet-300 border border-violet-500/30"}
        `}>
          {taskType === "arithmetic" ? t("stress.taskArithmetic") : t("stress.taskStroop")}
        </div>

        {/* Active task */}
        {taskType === "arithmetic" ? (
          <>
            <MathProblem
              problemText={arithmetic.text}
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

            <NumericKeypad
              value={inputValue}
              onChange={handleArithmeticInput}
              onSubmit={() => submitArithmetic(inputValue)}
              onValidationError={(reason) => {
                void logEvent("VALIDATION_ERROR", {
                  reason,
                  value_length: inputValue.length,
                  phase: "STRESS",
                  task_type: "arithmetic",
                });
              }}
              disabled={disabled}
            />
          </>
        ) : (
          <>
            <StroopCard
              problem={stroop}
              questionNumber={questionNumber}
              feedback={feedback}
              disabled={disabled}
              onAnswer={submitStroop}
            />

            {/* Question timer */}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>⏱</span>
              <CountdownTimer
                remainingMs={questionTimer.remainingMs}
                totalMs={SCWT_TIMEOUT_MS}
                size="sm"
              />
            </div>
          </>
        )}

        {/* Researcher Emergency Skip */}
        <button
          onClick={handleSkipClick}
          className="mt-2 px-4 py-2 rounded-lg text-xs font-medium text-rose-400/70 bg-rose-950/20 border border-rose-800/30 hover:bg-rose-900/30 hover:text-rose-300 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-700/40"
          id="skip-phase-btn"
          title="For researcher use only — skip this phase if there was a data collection error"
        >
          {t("skip.researcherBtn")}
        </button>
      </main>

      <SkipConfirmModal
        open={skipModalOpen}
        onConfirm={handleSkipConfirm}
        onCancel={handleSkipCancel}
        phaseName={t("phases.stress")}
      />
    </div>
  );
}
