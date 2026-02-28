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
    } catch (err) {
      console.error("Failed to flush events:", err);
      // Increment retry count
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

/** Start the periodic flush timer */
export function startEventBuffer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);

  // Also flush any events persisted in IndexedDB from a previous session
  void recoverPersistedEvents();
}

/** Stop the flush timer and perform a final flush */
export async function stopEventBuffer(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flush();
}

/** Recover events persisted in IndexedDB (after a page reload) */
async function recoverPersistedEvents(): Promise<void> {
  try {
    const database = await getDB();
    const persisted = await database.getAll(STORE_NAME);
    for (const event of persisted) {
      if (!memoryBuffer.find((e) => e.idempotency_key === event.idempotency_key)) {
        memoryBuffer.push(event as BufferedEvent);
      }
    }
  } catch {
    // IndexedDB may be unavailable
  }
}

/** Get pending event count (for debugging / UI) */
export function getPendingCount(): number {
  return memoryBuffer.length;
}
