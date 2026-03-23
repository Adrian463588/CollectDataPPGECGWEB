// ============================================================
// Experiment Controller — Event Buffer
// Buffers events in memory, flushes in batches to the backend.
// Uses IndexedDB for persistence across page reloads.
// ============================================================

import { v4 as uuidv4 } from "uuid";
import { openDB, type IDBPDatabase } from "idb";
import { sendEvents } from "./api-client";
import type { ExperimentEvent, EventType, EventPayload } from "./types";

const DB_NAME = "experiment_events";
const STORE_NAME = "pending_events";
const FLUSH_INTERVAL_MS = 2_000;
const MAX_BATCH_SIZE = 10;
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 500;

interface BufferedEvent extends ExperimentEvent {
  _retries: number;
  _sessionId: string;
}

let db: IDBPDatabase | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let memoryBuffer: BufferedEvent[] = [];

async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "idempotency_key" });
      }
    },
  });
  return db;
}

/** Enqueue a new event for sending */
export async function enqueueEvent(
  sessionId: string,
  eventType: EventType,
  payload: EventPayload = {}
): Promise<string> {
  const idempotencyKey = uuidv4();
  const event: BufferedEvent = {
    event_type: eventType,
    client_time_ms: Date.now(),
    idempotency_key: idempotencyKey,
    payload,
    _retries: 0,
    _sessionId: sessionId,
  };

  memoryBuffer.push(event);

  // Persist to IndexedDB for crash recovery
  try {
    const database = await getDB();
    await database.put(STORE_NAME, event);
  } catch {
    // IndexedDB may be unavailable — memory buffer is the fallback
    console.warn("IndexedDB unavailable, using memory-only buffer");
  }

  // Flush immediately if buffer is full
  if (memoryBuffer.length >= MAX_BATCH_SIZE) {
    void flush();
  }

  return idempotencyKey;
}

/** Strip internal fields from buffered events before sending */
function toApiEvent(event: BufferedEvent): ExperimentEvent {
  return {
    event_type: event.event_type,
    client_time_ms: event.client_time_ms,
    idempotency_key: event.idempotency_key,
    payload: event.payload,
  };
}

/** Flush pending events to the backend */
async function flush(): Promise<void> {
  if (memoryBuffer.length === 0) return;

  // Group events by session
  const bySession = new Map<string, BufferedEvent[]>();
  for (const event of memoryBuffer) {
    const list = bySession.get(event._sessionId) || [];
    list.push(event);
    bySession.set(event._sessionId, list);
  }

  for (const [sessionId, events] of bySession) {
    const batch = events.slice(0, MAX_BATCH_SIZE);
    const cleaned = batch.map(toApiEvent);

    try {
      await sendEvents(sessionId, { events: cleaned });

      // Remove sent events from memory buffer
      const sentKeys = new Set(batch.map((e) => e.idempotency_key));
      memoryBuffer = memoryBuffer.filter((e) => !sentKeys.has(e.idempotency_key));

      // Remove from IndexedDB
      try {
        const database = await getDB();
        const tx = database.transaction(STORE_NAME, "readwrite");
        for (const key of sentKeys) {
          await tx.store.delete(key);
        }
        await tx.done;
      } catch {
        // Non-critical
      }
    } catch (err: any) {
      console.error("Failed to flush events:", err);

      // If session not found (404), do not retry — drop immediately
      if (err?.status === 404) {
        console.warn(`Session ${sessionId} not found, dropping ${batch.length} stale events`);
        const sentKeys = new Set(batch.map((e) => e.idempotency_key));
        memoryBuffer = memoryBuffer.filter((e) => !sentKeys.has(e.idempotency_key));
        try {
          const database = await getDB();
          const tx = database.transaction(STORE_NAME, "readwrite");
          for (const key of sentKeys) {
            await tx.store.delete(key);
          }
          await tx.done;
        } catch {}
      } else {
        // Increment retry count for other errors
        for (const event of batch) {
          event._retries++;
          if (event._retries >= MAX_RETRIES) {
            console.error("Event exceeded max retries, dropping:", event.idempotency_key);
            memoryBuffer = memoryBuffer.filter(
              (e) => e.idempotency_key !== event.idempotency_key
            );
          }
        }
        // Backoff before next attempt
        await new Promise((r) =>
          setTimeout(r, BASE_BACKOFF_MS * Math.pow(2, batch[0]._retries))
        );
      }
    }
  }
}

/** Start the periodic flush timer */
export function startEventBuffer(currentSessionId?: string): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);

  // Purge stale events from previous sessions, then recover valid ones
  void clearStaleEvents(currentSessionId).then(() => recoverPersistedEvents(currentSessionId));
}

/** Stop the flush timer and perform a final flush */
export async function stopEventBuffer(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flush();
}

/** Remove events from IndexedDB + memory that belong to a different session */
async function clearStaleEvents(currentSessionId?: string): Promise<void> {
  if (!currentSessionId) return;
  try {
    const database = await getDB();
    const persisted = await database.getAll(STORE_NAME);
    const tx = database.transaction(STORE_NAME, "readwrite");
    let cleared = 0;
    for (const event of persisted) {
      if ((event as BufferedEvent)._sessionId !== currentSessionId) {
        await tx.store.delete(event.idempotency_key);
        cleared++;
      }
    }
    await tx.done;
    // Also remove from memory
    memoryBuffer = memoryBuffer.filter((e) => e._sessionId === currentSessionId);
    if (cleared > 0) {
      console.info(`Cleared ${cleared} stale events from previous sessions`);
    }
  } catch {
    // Non-critical
  }
}

/** Recover events persisted in IndexedDB (after a page reload) */
async function recoverPersistedEvents(currentSessionId?: string): Promise<void> {
  try {
    const database = await getDB();
    const persisted = await database.getAll(STORE_NAME);
    for (const event of persisted) {
      const buffered = event as BufferedEvent;
      // Only recover events for the current session
      if (currentSessionId && buffered._sessionId !== currentSessionId) continue;
      if (!memoryBuffer.find((e) => e.idempotency_key === buffered.idempotency_key)) {
        memoryBuffer.push(buffered);
      }
    }
  } catch {
    // IndexedDB may be unavailable
  }
}

/** Clear ALL buffered events (for manual cleanup after DB reset) */
export async function clearAllEvents(): Promise<void> {
  memoryBuffer = [];
  try {
    const database = await getDB();
    await database.clear(STORE_NAME);
    console.info("All buffered events cleared");
  } catch {
    // Non-critical
  }
}

/** Get pending event count (for debugging / UI) */
export function getPendingCount(): number {
  return memoryBuffer.length;
}
