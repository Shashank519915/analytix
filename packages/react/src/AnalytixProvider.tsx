"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createAnalytixClient,
  fetchPublicSiteConfig,
  type AnalytixClient,
  type PublicSiteConfig,
} from "@analytix/core";

export interface AnalytixConfig {
  siteKey: string;
  collectUrl: string;
  configUrl?: string;
  storagePrefix?: string;
  skipPaths?: string[];
  consentGranted?: boolean;
  debug?: boolean;
}

interface AnalytixContextValue {
  config: AnalytixConfig;
  client: AnalytixClient;
  siteConfig: PublicSiteConfig | null;
  configReady: boolean;
  consentGranted: boolean;
  grantConsent: () => void;
  revokeConsent: () => void;
}

const AnalytixContext = createContext<AnalytixContextValue | null>(null);

export { fetchPublicSiteConfig };

export function AnalytixProvider({
  config,
  children,
}: {
  config: AnalytixConfig;
  children: ReactNode;
}) {
  const clientRef = useRef<AnalytixClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = createAnalytixClient({
      siteKey: config.siteKey,
      collectUrl: config.collectUrl,
      configUrl: config.configUrl,
      storagePrefix: config.storagePrefix,
      skipPaths: config.skipPaths,
      consentGranted: config.consentGranted,
      debug: config.debug,
    });
  }

  const client = clientRef.current;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void client.ready().then(() => {
      if (!cancelled) setTick((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const value = useMemo(() => {
    const state = client.getState();
    return {
      config,
      client,
      siteConfig: state.siteConfig,
      configReady: state.configReady,
      consentGranted: state.consentGranted,
      grantConsent: () => {
        client.grantConsent();
        setTick((n) => n + 1);
      },
      revokeConsent: () => {
        client.revokeConsent();
        setTick((n) => n + 1);
      },
    };
  }, [config, client, tick]);

  return <AnalytixContext.Provider value={value}>{children}</AnalytixContext.Provider>;
}

export function useAnalytixConfig(): AnalytixConfig {
  const ctx = useContext(AnalytixContext);
  if (!ctx) throw new Error("useAnalytixConfig must be used within AnalytixProvider");
  return ctx.config;
}

export function useAnalytixClient(): AnalytixClient {
  const ctx = useContext(AnalytixContext);
  if (!ctx) throw new Error("useAnalytixClient must be used within AnalytixProvider");
  return ctx.client;
}

export function useAnalytixRuntime() {
  const ctx = useContext(AnalytixContext);
  if (!ctx) throw new Error("useAnalytixRuntime must be used within AnalytixProvider");
  return ctx;
}
