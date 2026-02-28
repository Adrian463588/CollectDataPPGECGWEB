// ============================================================
// useDevControls — Reads NEXT_PUBLIC_ENABLE_DEV_CONTROLS env var
// ============================================================

export function useDevControls(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_DEV_CONTROLS === "true";
}
