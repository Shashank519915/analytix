"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PublicSiteConfig } from "@Shashank519915/analytix-core";

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
  const [consentGranted, setConsentGranted] = useState(config.consentGranted ?? true);

  useEffect(() => {
    if (!config.configUrl) return;
    void fetchPublicSiteConfig(config.configUrl, config.siteKey).then(setSiteConfig);
  }, [config.configUrl, config.siteKey]);

  const value = useMemo(
    () => ({
      config,
      siteConfig,
      consentGranted,
      grantConsent: () => setConsentGranted(true),
    }),
    [config, siteConfig, consentGranted]
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
