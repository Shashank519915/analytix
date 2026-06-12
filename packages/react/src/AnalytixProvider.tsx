"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PublicSiteConfig } from "@analytix/core";

export interface AnalytixConfig {
  /** Public site key (sk_live_...) */
  siteKey: string;
  /** Collect endpoint URL, e.g. https://analytics.example.com/api/v1/collect */
  collectUrl: string;
  /** Optional public config endpoint, e.g. https://analytics.example.com/api/v1/config */
  configUrl?: string;
  /** Optional storage key prefix to isolate sites on same origin */
  storagePrefix?: string;
  /** Paths to skip tracking entirely (client-side, in addition to server exclude_paths) */
  skipPaths?: string[];
  /** When true, tracking starts immediately. When false and consent_required, waits for grantConsent(). */
  consentGranted?: boolean;
}

interface AnalytixContextValue {
  config: AnalytixConfig;
  siteConfig: PublicSiteConfig | null;
  /** True once remote config fetch finished (or no configUrl). */
  configReady: boolean;
  consentGranted: boolean;
  grantConsent: () => void;
}

const AnalytixContext = createContext<AnalytixContextValue | null>(null);

export async function fetchPublicSiteConfig(
  configUrl: string,
  siteKey: string
): Promise<PublicSiteConfig | null> {
  try {
    const res = await fetch(configUrl, {
      headers: { "X-Analytix-Site-Key": siteKey },
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return payload.config ?? null;
  } catch {
    return null;
  }
}

export function AnalytixProvider({
  config,
  children,
}: {
  config: AnalytixConfig;
  children: ReactNode;
}) {
  const [siteConfig, setSiteConfig] = useState<PublicSiteConfig | null>(null);
  const [configReady, setConfigReady] = useState(!config.configUrl);
  const [consentGranted, setConsentGranted] = useState(() => {
    if (config.consentGranted !== undefined) return config.consentGranted;
    return !config.configUrl;
  });

  useEffect(() => {
    if (!config.configUrl) return;

    let cancelled = false;
    void fetchPublicSiteConfig(config.configUrl, config.siteKey).then((cfg) => {
      if (cancelled) return;
      setSiteConfig(cfg);
      setConfigReady(true);
      if (config.consentGranted !== undefined) return;
      setConsentGranted(cfg?.consent_required ? false : true);
    });

    return () => {
      cancelled = true;
    };
  }, [config.configUrl, config.siteKey, config.consentGranted]);

  const value = useMemo(
    () => ({
      config,
      siteConfig,
      configReady,
      consentGranted,
      grantConsent: () => setConsentGranted(true),
    }),
    [config, siteConfig, configReady, consentGranted]
  );

  return <AnalytixContext.Provider value={value}>{children}</AnalytixContext.Provider>;
}

export function useAnalytixConfig(): AnalytixConfig {
  const ctx = useContext(AnalytixContext);
  if (!ctx) throw new Error("useAnalytixConfig must be used within AnalytixProvider");
  return ctx.config;
}

export function useAnalytixRuntime() {
  const ctx = useContext(AnalytixContext);
  if (!ctx) throw new Error("useAnalytixRuntime must be used within AnalytixProvider");
  return ctx;
}
