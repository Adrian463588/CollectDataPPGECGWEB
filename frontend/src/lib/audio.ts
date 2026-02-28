// ============================================================
// Experiment Controller — Audio Helpers
// Web Audio API beep for phase transitions and stimulus cues
// ============================================================

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Play a short beep tone.
 * @param frequency - Tone frequency in Hz (default 440)
 * @param duration  - Duration in milliseconds (default 100)
 * @param volume    - Volume 0..1 (default 0.3)
 */
export function playBeep(
  frequency: number = 440,
  duration: number = 100,
  volume: number = 0.3
): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (err) {
    console.warn("Audio playback failed:", err);
  }
}

/** Play a transition beep (two-tone) */
export function playTransitionBeep(): void {
  playBeep(523, 120, 0.2); // C5
  setTimeout(() => playBeep(659, 150, 0.2), 150); // E5
}

/** Play a stimulus beep (short, attention-grabbing) */
export function playStimulusBeep(): void {
  playBeep(880, 80, 0.25); // A5
}

/** Play a correct answer chime */
export function playCorrectChime(): void {
  playBeep(523, 80, 0.15);
  setTimeout(() => playBeep(659, 100, 0.15), 100);
}

/** Play an incorrect answer buzz */
export function playIncorrectBuzz(): void {
  playBeep(220, 200, 0.2); // A3 (low)
}

/** Resume audio context (must be called from user gesture) */
export async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
}
