"use client";

import { useEffect, useState } from "react";

export type DashboardThemeMode = "light" | "dark" | "system";

const STORAGE_PREFIX = "analytix_dashboard_theme";

function storageKey(siteId: string) {
  return `${STORAGE_PREFIX}_${siteId}`;
}

function readStoredTheme(siteId: string, fallback: DashboardThemeMode): DashboardThemeMode {
  if (typeof window === "undefined") return fallback;
  const stored = localStorage.getItem(storageKey(siteId));
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return fallback;
}

export function useDashboardTheme(siteId: string, defaultTheme: DashboardThemeMode = "system") {
  const [themeMode, setThemeModeState] = useState<DashboardThemeMode>(defaultTheme);

  useEffect(() => {
    setThemeModeState(readStoredTheme(siteId, defaultTheme));
  }, [siteId, defaultTheme]);

  useEffect(() => {
    localStorage.setItem(storageKey(siteId), themeMode);
  }, [siteId, themeMode]);

  function setThemeMode(next: DashboardThemeMode) {
    setThemeModeState(next);
  }

  function cycleTheme() {
    setThemeModeState((current) =>
      current === "light" ? "dark" : current === "dark" ? "system" : "light"
    );
  }

  const resolvedTheme = useResolvedTheme(themeMode);

  return { themeMode, setThemeMode, cycleTheme, resolvedTheme };
}

function useResolvedTheme(mode: DashboardThemeMode): "light" | "dark" {
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (mode !== "system") {
      setResolved(mode);
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setResolved(media.matches ? "dark" : "light");
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode]);

  return resolved;
}

export const DASHBOARD_THEME_LABELS: Record<DashboardThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};
