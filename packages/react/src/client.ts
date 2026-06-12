import type { AnalytixConfig } from "./AnalytixProvider";
import type { PublicSiteConfig } from "@analytix/core";

/** @deprecated Use `useAnalytixClient().page()` instead. */
export async function trackPageView(
  config: AnalytixConfig,
  path: string,
  content?: { id?: string; slug?: string; title?: string },
  _siteConfig?: PublicSiteConfig | null
) {
  const { createAnalytixClient } = await import("@analytix/core");
  const client = createAnalytixClient({
    siteKey: config.siteKey,
    collectUrl: config.collectUrl,
    configUrl: config.configUrl,
    storagePrefix: config.storagePrefix,
    skipPaths: config.skipPaths,
  });
  await client.ready();
  await client.page({ path, content });
}

/** @deprecated Use `useAnalytixClient().engagement()` instead. */
export function trackEngagement(
  config: AnalytixConfig,
  path: string,
  durationMs: number,
  _siteConfig?: PublicSiteConfig | null,
  content?: { id?: string; slug?: string; title?: string }
) {
  void import("@analytix/core").then(({ createAnalytixClient }) => {
    const client = createAnalytixClient({
      siteKey: config.siteKey,
      collectUrl: config.collectUrl,
      configUrl: config.configUrl,
      storagePrefix: config.storagePrefix,
    });
    void client.ready().then(() => client.engagement(path, durationMs, content));
  });
}

/** @deprecated Use `useAnalytixClient().track()` instead. */
export function trackCustomEvent(
  config: AnalytixConfig,
  path: string,
  eventName: string,
  metadata?: Record<string, unknown>,
  _siteConfig?: PublicSiteConfig | null
) {
  void import("@analytix/core").then(({ createAnalytixClient }) => {
    const client = createAnalytixClient({
      siteKey: config.siteKey,
      collectUrl: config.collectUrl,
      configUrl: config.configUrl,
      storagePrefix: config.storagePrefix,
    });
    void client.ready().then(() => client.track(eventName, { path, ...metadata }));
  });
}

export { collectBrowserContext as collectClientContext } from "@analytix/core";
