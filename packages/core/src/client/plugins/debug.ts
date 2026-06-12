import type { AnalytixPlugin } from "../types";

export function debugPlugin(enabled = true): AnalytixPlugin {
  return {
    name: "analytix-debug",
    bootstrap(ctx) {
      if (!enabled && !ctx.config.debug) return;
      console.info("[analytix] client ready", {
        collectUrl: ctx.config.collectUrl,
        configUrl: ctx.config.configUrl,
      });
    },
    loaded(ctx) {
      if (!enabled && !ctx.config.debug) return;
      console.info("[analytix] site config loaded", ctx.siteConfig);
    },
    page(payload, ctx) {
      if (!enabled && !ctx.config.debug) return;
      console.info("[analytix] page", payload.path, payload);
    },
    track(payload, ctx) {
      if (!enabled && !ctx.config.debug) return;
      console.info("[analytix] track", payload.metadata?.event_name ?? payload.event_type, payload);
    },
    identify(payload, ctx) {
      if (!enabled && !ctx.config.debug) return;
      console.info("[analytix] identify", payload.userId, payload.traits);
    },
  };
}
