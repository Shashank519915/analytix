import type { CollectPayload } from "./types";

const QUEUE_KEY = "analytix_offline_queue";
const MAX_QUEUE = 100;

function queueKey(storagePrefix?: string) {
  return `${storagePrefix ?? "analytix"}_${QUEUE_KEY}`;
}

export function readQueue(storagePrefix?: string): CollectPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(queueKey(storagePrefix));
    return raw ? (JSON.parse(raw) as CollectPayload[]) : [];
  } catch {
    return [];
  }
}

export function writeQueue(storagePrefix: string | undefined, items: CollectPayload[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(queueKey(storagePrefix), JSON.stringify(items.slice(-MAX_QUEUE)));
}

export function enqueuePayload(
  storagePrefix: string | undefined,
  payload: CollectPayload
): number {
  const queue = readQueue(storagePrefix);
  queue.push(payload);
  writeQueue(storagePrefix, queue);
  return queue.length;
}

export function dequeueAll(storagePrefix?: string): CollectPayload[] {
  const queue = readQueue(storagePrefix);
  writeQueue(storagePrefix, []);
  return queue;
}
