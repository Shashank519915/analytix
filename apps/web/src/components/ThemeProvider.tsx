"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type PlatformTheme = "light" | "dark" | "system";

const STORAGE_KEY = "analytix_platform_theme";

const ThemeContext = createContext<{
  theme: PlatformTheme;
  setTheme: (theme: PlatformTheme) => void;
  cycleTheme: () => void;
} | null>(null);

function readStoredTheme(): PlatformTheme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "light";
}

function applyTheme(theme: PlatformTheme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<PlatformTheme>("light");

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  function setTheme(next: PlatformTheme) {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  function cycleTheme() {
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function usePlatformTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("usePlatformTheme must be used within ThemeProvider");
  return ctx;
}
