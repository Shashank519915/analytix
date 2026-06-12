"use client";

import { usePlatformTheme, type PlatformTheme } from "./ThemeProvider";

const LABELS: Record<PlatformTheme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function PlatformThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, cycleTheme } = usePlatformTheme();

  return (
    <button
      type="button"
      className="themeToggle"
      onClick={cycleTheme}
      aria-label={`Theme: ${LABELS[theme]}. Click to change.`}
      title={`Theme: ${LABELS[theme]}`}
    >
      <ThemeIcon mode={theme} />
      {compact ? null : <span>{LABELS[theme]}</span>}
    </button>
  );
}

function ThemeIcon({ mode }: { mode: PlatformTheme }) {
  if (mode === "dark") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <path d="M8 1v2M8 13v2M15 8h-2M3 8H1" stroke="currentColor" strokeWidth="1.25" />
      </svg>
    );
  }
  if (mode === "system") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="2" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
        <path d="M5 14h6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M8 1.5v1.5M8 13v1.5M14.5 8H13M3 8H1.5M12.4 3.6l-1 1M4.6 11.4l-1 1M12.4 12.4l-1-1M4.6 4.6l-1-1"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
