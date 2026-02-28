// ============================================================
// Experiment Controller — Audio Manager
// Centralized Web Audio API manager with:
//   - Global kill switch (blocks all audio after completion)
//   - Active oscillator tracking + bulk stop
//   - Pending setTimeout cleanup
//   - Single AudioContext lifecycle management
// ============================================================

let audioContext: AudioContext | null = null;
let killed = false;

/** Set of active oscillator nodes — for bulk stop on kill */
const activeNodes = new Set<OscillatorNode>();

/** Set of pending setTimeout IDs — for cleanup on kill */
const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();

// ---- AudioContext lifecycle ----

function getAudioContext(): AudioContext | null {
  if (killed) return null;
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/** Resume audio context (must be called from user gesture) */
export async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    await ctx.resume();
  }
}

// ---- Core play function ----

/**
 * Play a short beep tone.
 * Returns immediately if audio is killed.
 */
export function playBeep(
  frequency: number = 440,
  duration: number = 100,
  volume: number = 0.3
): void {
  if (killed) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + duration / 1000
    );

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Track the active node
    activeNodes.add(oscillator);
    oscillator.onended = () => {
      activeNodes.delete(oscillator);
    };

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (err) {
    console.warn("Audio playback failed:", err);
  }
}

// ---- Safe setTimeout wrapper ----

/** Schedule a delayed audio call — tracked for cleanup on kill */
function safeTimeout(fn: () => void, delayMs: number): void {
  if (killed) return;
  const id = setTimeout(() => {
    pendingTimeouts.delete(id);
    if (!killed) fn();
  }, delayMs);
  pendingTimeouts.add(id);
}

// ---- Named beep functions ----

/** Play a transition beep (two-tone) */
export function playTransitionBeep(): void {
  if (killed) return;
  playBeep(523, 120, 0.2); // C5
  safeTimeout(() => playBeep(659, 150, 0.2), 150); // E5
}

/** Play a soft breathing step beep (gentle, short) */
export function playBreathingStepBeep(): void {
  if (killed) return;
  playBeep(300, 60, 0.15);
}

/** Play a stimulus beep (short, attention-grabbing) */
export function playStimulusBeep(): void {
  if (killed) return;
  playBeep(880, 80, 0.25); // A5
}

/** Play a correct answer chime */
export function playCorrectChime(): void {
  if (killed) return;
  playBeep(523, 80, 0.15);
  safeTimeout(() => playBeep(659, 100, 0.15), 100);
}

/** Play an incorrect answer buzz */
export function playIncorrectBuzz(): void {
  if (killed) return;
  playBeep(220, 200, 0.2); // A3 (low)
}

// ---- Kill switch ----

/**
 * KILL ALL AUDIO. Called when experiment reaches COMPLETE.
 * - Stops all active oscillators immediately
 * - Clears all pending delayed audio calls
 * - Suspends the AudioContext
 * - Sets the killed flag to block all future play() calls
 *
 * Audio remains dead until resetAudio() is called (e.g., new session).
 */
export function stopAllAudio(): void {
  killed = true;

  // Stop all active oscillator nodes
  for (const node of activeNodes) {
    try {
      node.stop();
      node.disconnect();
    } catch {
      // Already stopped — ignore
    }
  }
  activeNodes.clear();

  // Clear all pending setTimeout calls
  for (const id of pendingTimeouts) {
    clearTimeout(id);
  }
  pendingTimeouts.clear();

  // Suspend the AudioContext (frees system resources)
  if (audioContext) {
    audioContext.suspend().catch(() => {});
  }
}

/**
 * Reset audio for a new session.
 * Re-enables audio playback after a previous kill.
 * Does NOT create a new AudioContext — reuses the existing one.
 */
export function resetAudio(): void {
  killed = false;
  // Resume context if it was suspended
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
}

/**
 * Check if audio is currently killed.
 * Useful for guard checks in components.
 */
export function isAudioKilled(): boolean {
  return killed;
}
