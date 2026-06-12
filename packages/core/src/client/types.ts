import type { PublicSiteConfig } from "../analytics-config";

export type AnalytixEventType =
  | "page_view"
  | "engagement"
  | "custom"
  | "scroll_depth"
  | "outbound_click";

export interface PageProperties {
  path?: string;
  title?: string;
  referrer?: string;
  content?: { id?: string; slug?: string; title?: string };
}

export interface TrackProperties {
  path?: string;
  [key: string]: unknown;
}

export interface IdentifyTraits {
  [key: string]: unknown;
}

/** Payload sent to the collect endpoint (subset of server schema). */
export interface CollectPayload {
  event_type: AnalytixEventType;
  path: string;
  content_id?: string | null;
  content_slug?: string | null;
  content_title?: string | null;
  session_id: string;
  visitor_fingerprint: string;
  visitor_type?: "new" | "returning";
  referrer?: string | null;
  user_agent?: string | null;
  accept_language?: string | null;
  timezone?: string | null;
  screen_width?: number | null;
  screen_height?: number | null;
  viewport_width?: number | null;
  viewport_height?: number | null;
  device_pixel_ratio?: number | null;
  platform?: string | null;
  connection_type?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AnalytixClientConfig {
  siteKey: string;
  collectUrl: string;
  configUrl?: string;
  storagePrefix?: string;
  skipPaths?: string[];
  debug?: boolean;
  /** Explicit consent override. When unset, derived from remote config. */
  consentGranted?: boolean;
  plugins?: AnalytixPlugin[];
}

export interface AnalytixPluginContext {
  config: AnalytixClientConfig;
  siteConfig: PublicSiteConfig | null;
  configReady: boolean;
  consentGranted: boolean;
  userId: string | null;
  traits: IdentifyTraits;
}

export interface AnalytixPlugin {
  name: string;
  /** Runs once when the client is created. */
  bootstrap?: (ctx: AnalytixPluginContext) => void | Promise<void>;
  /** Runs after remote site config is loaded (or immediately if no configUrl). */
  loaded?: (ctx: AnalytixPluginContext) => void | Promise<void>;
  /** Return `false` to cancel the event. Return a payload to replace it. */
  page?: (
    payload: CollectPayload,
    ctx: AnalytixPluginContext
  ) => CollectPayload | false | void | Promise<CollectPayload | false | void>;
  track?: (
    payload: CollectPayload,
    ctx: AnalytixPluginContext
  ) => CollectPayload | false | void | Promise<CollectPayload | false | void>;
  identify?: (
    payload: { userId: string; traits: IdentifyTraits },
    ctx: AnalytixPluginContext
  ) => void | Promise<void>;
}

export interface AnalytixClient {
  page(properties?: PageProperties): Promise<void>;
  track(event: string, properties?: TrackProperties): Promise<void>;
  engagement(
    path: string,
    durationMs: number,
    content?: PageProperties["content"]
  ): Promise<void>;
  identify(userId: string, traits?: IdentifyTraits): Promise<void>;
  grantConsent(): void;
  revokeConsent(): void;
  getState(): AnalytixPluginContext & { queueSize: number };
  ready(): Promise<void>;
  flushQueue(): Promise<number>;
}
