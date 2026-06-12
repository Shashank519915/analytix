import { enqueuePayload } from "../queue";
import type { AnalytixPlugin, AnalytixPluginContext, CollectPayload } from "../types";

export interface BackendPluginOptions {
  /** Flush offline queue when browser comes online. Default true. */
  flushOnOnline?: boolean;
}

async function postCollect(
  ctx: AnalytixPluginContext,
  payload: CollectPayload
): Promise<boolean> {
  try {
    const res = await fetch(ctx.config.collectUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Analytix-Site-Key": ctx.config.siteKey,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function deliver(ctx: AnalytixPluginContext, payload: CollectPayload) {
  const ok = await postCollect(ctx, payload);
  if (!ok && typeof window !== "undefined") {
    enqueuePayload(ctx.config.storagePrefix, payload);
  }
  return ok;
}

export function analytixBackendPlugin(options: BackendPluginOptions = {}): AnalytixPlugin {
  const flushOnOnline = options.flushOnOnline !== false;

  return {
    name: "analytix-backend",
    bootstrap(ctx) {
      if (!flushOnOnline || typeof window === "undefined") return;
      window.addEventListener("online", () => {
        void flushBackendQueue(ctx);
      });
    },
    async page(payload, ctx) {
      await deliver(ctx, payload);
    },
    async track(payload, ctx) {
      await deliver(ctx, payload);
    },
  };
}

export async function flushBackendQueue(ctx: AnalytixPluginContext): Promise<number> {
  const { dequeueAll } = await import("../queue");
  const pending = dequeueAll(ctx.config.storagePrefix);
  let sent = 0;
  for (const payload of pending) {
    const ok = await postCollect(ctx, payload);
    if (ok) sent += 1;
    else {
      enqueuePayload(ctx.config.storagePrefix, payload);
      break;
    }
  }
  return sent;
}

export { postCollect as sendCollectPayload };
