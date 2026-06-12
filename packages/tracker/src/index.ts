import {
  createAnalytixClient,
  type AnalytixClient,
  type AnalytixClientConfig,
  type AnalytixPlugin,
} from "@analytix/core";

export interface InitAnalytixOptions extends AnalytixClientConfig {
  plugins?: AnalytixPlugin[];
  /** Track initial page + history navigation. Default true. */
  autoPage?: boolean;
}

function patchHistory(client: AnalytixClient) {
  if (typeof window === "undefined") return () => undefined;

  const track = () => void client.page({ path: window.location.pathname });

  window.addEventListener("popstate", track);
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  history.pushState = (...args) => {
    push(...args);
    track();
  };
  history.replaceState = (...args) => {
    replace(...args);
    track();
  };

  return () => {
    window.removeEventListener("popstate", track);
    history.pushState = push;
    history.replaceState = replace;
  };
}

/**
 * Initialize Analytix for vanilla JS / static HTML / Vite SPA.
 * Returns the client instance (`page`, `track`, `identify`, `grantConsent`).
 */
export function initAnalytix(options: InitAnalytixOptions): AnalytixClient {
  const { autoPage = true, ...clientOptions } = options;
  const client = createAnalytixClient(clientOptions);

  if (autoPage && typeof window !== "undefined") {
    void client.ready().then(() => {
      void client.page({ path: window.location.pathname });
      patchHistory(client);
    });
  }

  return client;
}

export { createAnalytixClient };
export type { AnalytixClient, AnalytixClientConfig, AnalytixPlugin };

declare global {
  interface Window {
    analytix?: AnalytixClient;
  }
}

/** Attach client to `window.analytix` for script-tag usage. */
export function exposeAnalytix(client: AnalytixClient) {
  if (typeof window !== "undefined") {
    window.analytix = client;
  }
  return client;
}
