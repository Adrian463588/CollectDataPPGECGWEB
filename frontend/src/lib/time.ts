// ============================================================
// Experiment Controller — Time Helpers
// WIB (Asia/Jakarta, UTC+7) formatting and offset calculation
// ============================================================

const WIB_TIMEZONE = "Asia/Jakarta";

/**
 * Format a Date (or timestamp) in WIB with millisecond precision.
 * Output: "YYYY-MM-DD HH:MM:SS.sss"
 */
export function formatWIB(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const ms = d.getMilliseconds().toString().padStart(3, "0");

  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}.${ms}`;
}

/**
 * Get the current time as Unix epoch milliseconds.
 */
export function nowMs(): number {
  return Date.now();
}

/**
 * Calculate client offset from server time.
 * offset = server_time_ms - client_time_ms
 * Positive offset means client is behind server.
 */
export function calculateOffset(serverTimeWib: string, clientTimeMs: number): number {
  const serverMs = new Date(serverTimeWib).getTime();
  return serverMs - clientTimeMs;
}

/**
 * Format milliseconds as MM:SS display for countdowns.
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format milliseconds as MM:SS.s display with tenths.
 */
export function formatCountdownPrecise(ms: number): string {
  if (ms <= 0) return "00:00.0";
  const totalTenths = Math.ceil(ms / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${tenths}`;
}
