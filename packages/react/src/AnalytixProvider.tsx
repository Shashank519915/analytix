"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface AnalytixConfig {
  /** Public site key (sk_live_...) */
  siteKey: string;
  /** Collect endpoint URL, e.g. https://analytics.example.com/api/v1/collect */
  collectUrl: string;
  /** Optional storage key prefix to isolate sites on same origin */
  storagePrefix?: string;
  /** Paths to skip tracking entirely */
  skipPaths?: string[];
}

const AnalytixContext = createContext<AnalytixConfig | null>(null);

export function AnalytixProvider({ config, children }: { config: AnalytixConfig; children: ReactNode }) {
  return <AnalytixContext.Provider value={config}>{children}</AnalytixContext.Provider>;
}

export function useAnalytixConfig(): AnalytixConfig {
  const ctx = useContext(AnalytixContext);
  if (!ctx) throw new Error("useAnalytixConfig must be used within AnalytixProvider");
  return ctx;
}
