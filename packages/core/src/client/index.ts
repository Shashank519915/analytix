export type {
  AnalytixClient,
  AnalytixClientConfig,
  AnalytixPlugin,
  AnalytixPluginContext,
  CollectPayload,
  IdentifyTraits,
  PageProperties,
  TrackProperties,
} from "./types";

export { createAnalytixClient } from "./create-client";
export { fetchPublicSiteConfig } from "./fetch-config";
export { collectBrowserContext, collectUtmParams } from "./browser-context";
export {
  getOrCreateVisitorId,
  getOrCreateSessionId,
  getVisitorType,
  markVisitorAsReturning,
  buildClientFingerprint,
  getStoredUserId,
  getStoredTraits,
} from "./storage";
export { readQueue, enqueuePayload } from "./queue";
export { flushBackendQueue, analytixBackendPlugin, sendCollectPayload } from "./plugins/backend";
export { debugPlugin } from "./plugins/debug";
export { attachScrollDepthListener, scrollDepthPlugin } from "./plugins/scroll-depth";
