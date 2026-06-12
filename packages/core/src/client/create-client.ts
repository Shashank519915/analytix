import {
  isPublicEventEnabled,
  isPublicFieldEnabled,
  shouldDropEventForSampling,
  type PublicSiteConfig,
} from "../analytics-config";
import { isPathExcluded } from "../request";
import { collectBrowserContext } from "./browser-context";
import { fetchPublicSiteConfig } from "./fetch-config";
import { readQueue } from "./queue";
import { analytixBackendPlugin, flushBackendQueue } from "./plugins/backend";
import { debugPlugin } from "./plugins/debug";
import { attachScrollDepthListener } from "./plugins/scroll-depth";
import {
  getStoredTraits,
  getStoredUserId,
  markVisitorAsReturning,
  setStoredTraits,
  setStoredUserId,
} from "./storage";
import type {
  AnalytixClient,
  AnalytixClientConfig,
  AnalytixPlugin,
  AnalytixPluginContext,
  CollectPayload,
  IdentifyTraits,
  PageProperties,
  TrackProperties,
} from "./types";

type HookName = "page" | "track";

function buildContext(
  config: AnalytixClientConfig,
  siteConfig: PublicSiteConfig | null,
  configReady: boolean,
  consentGranted: boolean
): AnalytixPluginContext {
  return {
    config,
    siteConfig,
    configReady,
    consentGranted,
    userId: typeof window !== "undefined" ? getStoredUserId(config) : null,
    traits: typeof window !== "undefined" ? getStoredTraits(config) : {},
  };
}

function shouldSample(ctx: AnalytixPluginContext): boolean {
  if (!ctx.siteConfig) return false;
  return shouldDropEventForSampling({
    collection_profile: ctx.siteConfig.collection_profile,
    enabled_events: ctx.siteConfig.enabled_events,
    enabled_fields: ctx.siteConfig.enabled_fields,
    sample_rate: ctx.siteConfig.sample_rate,
    consent_required: ctx.siteConfig.consent_required,
    dashboard_widgets: ctx.siteConfig.dashboard_widgets,
    dashboard_theme: ctx.siteConfig.dashboard_theme,
  });
}

function trackingAllowed(ctx: AnalytixPluginContext): boolean {
  if (!ctx.configReady) return false;
  if (!ctx.consentGranted) return false;
  if (ctx.siteConfig?.consent_required && !ctx.consentGranted) return false;
  return true;
}

function enrichPayload(
  config: AnalytixClientConfig,
  siteConfig: AnalytixPluginContext["siteConfig"],
  partial: CollectPayload
): CollectPayload {
  const ctx = collectBrowserContext(config, siteConfig);
  const includeContent = !siteConfig || isPublicFieldEnabled(siteConfig, "content");

  return {
    ...partial,
    session_id: partial.session_id || ctx.session_id,
    visitor_fingerprint: partial.visitor_fingerprint || ctx.visitor_fingerprint,
    visitor_type: partial.visitor_type ?? ctx.visitor_type,
    referrer: partial.referrer ?? (typeof document !== "undefined" ? document.referrer || null : null),
    user_agent: partial.user_agent ?? (typeof navigator !== "undefined" ? navigator.userAgent : null),
    accept_language: partial.accept_language ?? ctx.accept_language,
    timezone: partial.timezone ?? ctx.timezone,
    screen_width: partial.screen_width ?? ctx.screen_width,
    screen_height: partial.screen_height ?? ctx.screen_height,
    viewport_width: partial.viewport_width ?? ctx.viewport_width,
    viewport_height: partial.viewport_height ?? ctx.viewport_height,
    device_pixel_ratio: partial.device_pixel_ratio ?? ctx.device_pixel_ratio,
    platform: partial.platform ?? ctx.platform,
    connection_type: partial.connection_type ?? ctx.connection_type,
    content_id: includeContent ? (partial.content_id ?? null) : null,
    content_slug: includeContent ? (partial.content_slug ?? null) : null,
    content_title: includeContent ? (partial.content_title ?? null) : null,
    metadata: {
      ...ctx.utm,
      ...(ctx.user_id ? { user_id: ctx.user_id } : {}),
      ...(Object.keys(ctx.traits).length ? { visitor_traits: ctx.traits } : {}),
      ...partial.metadata,
    },
  };
}

export function createAnalytixClient(options: AnalytixClientConfig): AnalytixClient {
  const plugins: AnalytixPlugin[] = [
    ...(options.debug ? [debugPlugin()] : []),
    analytixBackendPlugin(),
    ...(options.plugins ?? []),
  ];

  let siteConfig: AnalytixPluginContext["siteConfig"] = null;
  let configReady = !options.configUrl;
  let consentGranted =
    options.consentGranted !== undefined ? options.consentGranted : !options.configUrl;

  let readyResolve: (() => void) | null = null;
  const readyPromise = new Promise<void>((resolve) => {
    readyResolve = resolve;
  });

  let scrollCleanup: (() => void) | undefined;
  let initialized = false;

  function ctx(): AnalytixPluginContext {
    return buildContext(options, siteConfig, configReady, consentGranted);
  }

  async function runHook(
    hook: HookName,
    payload: CollectPayload
  ): Promise<CollectPayload | null> {
    let current: CollectPayload | false | void | undefined = payload;
    for (const plugin of plugins) {
      const fn = plugin[hook];
      if (!fn) continue;
      current = await fn(current as CollectPayload, ctx());
      if (current === false) return null;
    }
    return (current as CollectPayload) ?? payload;
  }

  async function dispatch(hook: HookName, payload: CollectPayload) {
    const finalPayload = await runHook(hook, payload);
    if (!finalPayload) return;
    if (hook === "page" && finalPayload.visitor_type === "new") {
      markVisitorAsReturning(options);
    }
  }

  async function init() {
    if (initialized || typeof window === "undefined") return;
    initialized = true;

    for (const plugin of plugins) {
      await plugin.bootstrap?.(ctx());
    }

    if (options.configUrl) {
      siteConfig = await fetchPublicSiteConfig(options.configUrl, options.siteKey);
      configReady = true;
      if (!siteConfig) {
        consentGranted = false;
      } else if (options.consentGranted === undefined) {
        consentGranted = siteConfig.consent_required ? false : true;
      }
    }

    for (const plugin of plugins) {
      await plugin.loaded?.(ctx());
    }

    scrollCleanup = attachScrollDepthListener(ctx(), (depth, path) => {
      void emitEvent("scroll_depth", path, { depth_percent: depth });
    });

    readyResolve?.();
    void flushBackendQueue(ctx());
  }

  async function emitEvent(
    eventType: CollectPayload["event_type"],
    path: string,
    metadata?: Record<string, unknown>,
    content?: PageProperties["content"]
  ) {
    if (typeof window === "undefined") return;
    const c = ctx();
    if (!trackingAllowed(c)) return;
    if (options.configUrl && !c.siteConfig) return;
    if (shouldSample(c)) return;
    if (c.siteConfig && !isPublicEventEnabled(c.siteConfig, eventType)) return;

    const skipPaths = [...(options.skipPaths ?? []), ...(c.siteConfig?.exclude_paths ?? [])];
    if (isPathExcluded(path, skipPaths)) return;

    const hook: HookName = eventType === "page_view" ? "page" : "track";
    const payload = enrichPayload(options, c.siteConfig, {
      event_type: eventType,
      path,
      session_id: "",
      visitor_fingerprint: "",
      content_id: content?.id ?? null,
      content_slug: content?.slug ?? null,
      content_title: content?.title ?? null,
      metadata: {
        ...(typeof document !== "undefined" ? { page_title: document.title } : {}),
        ...metadata,
      },
    });

    await dispatch(hook, payload);
  }

  void init();

  return {
    async page(properties: PageProperties = {}) {
      const path =
        properties.path ??
        (typeof window !== "undefined" ? window.location.pathname : "/");
      await emitEvent("page_view", path, {
        page_title: properties.title ?? (typeof document !== "undefined" ? document.title : undefined),
        href: typeof window !== "undefined" ? window.location.href : undefined,
        referrer: properties.referrer,
      }, properties.content);
    },

    async track(event: string, properties: TrackProperties = {}) {
      const path =
        properties.path ??
        (typeof window !== "undefined" ? window.location.pathname : "/");
      const { path: _p, ...rest } = properties;
      await emitEvent("custom", path, { event_name: event, ...rest });
    },

    async engagement(path: string, durationMs: number, content?: PageProperties["content"]) {
      if (durationMs < 1000) return;
      await emitEvent("engagement", path, { duration_ms: durationMs }, content);
    },

    async identify(userId: string, traits: IdentifyTraits = {}) {
      if (typeof window === "undefined") return;
      setStoredUserId(options, userId);
      setStoredTraits(options, traits);
      for (const plugin of plugins) {
        await plugin.identify?.({ userId, traits }, ctx());
      }
    },

    grantConsent() {
      consentGranted = true;
    },

    revokeConsent() {
      consentGranted = false;
    },

    getState() {
      return {
        ...ctx(),
        queueSize: readQueue(options.storagePrefix).length,
      };
    },

    ready() {
      return readyPromise;
    },

    async flushQueue() {
      return flushBackendQueue(ctx());
    },
  };
}
