import { useCallback, useEffect, useState } from "react";
import {
  DASHBOARD_WIDGET_IDS,
  DEFAULT_DASHBOARD_WIDGETS,
  type DashboardWidgetId,
} from "@analytix/core";

function storageKey(siteId: string) {
  return `analytix_widgets_${siteId}`;
}

function readStoredWidgets(siteId: string): DashboardWidgetId[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(siteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as string[];
    const allowed = new Set<string>(DASHBOARD_WIDGET_IDS);
    const filtered = parsed.filter((id): id is DashboardWidgetId => allowed.has(id));
    return filtered.length ? filtered : null;
  } catch {
    return null;
  }
}

export function useDashboardWidgets(
  siteId: string,
  defaultWidgets: DashboardWidgetId[] = DEFAULT_DASHBOARD_WIDGETS
) {
  const [widgets, setWidgets] = useState<DashboardWidgetId[]>(defaultWidgets);

  useEffect(() => {
    setWidgets(readStoredWidgets(siteId) ?? defaultWidgets);
  }, [siteId, defaultWidgets]);

  const persist = useCallback(
    (next: DashboardWidgetId[]) => {
      setWidgets(next);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey(siteId), JSON.stringify(next));
      }
    },
    [siteId]
  );

  const toggleWidget = useCallback(
    (id: DashboardWidgetId) => {
      persist(widgets.includes(id) ? widgets.filter((w) => w !== id) : [...widgets, id]);
    },
    [persist, widgets]
  );

  const resetToDefault = useCallback(() => {
    persist(defaultWidgets);
  }, [defaultWidgets, persist]);

  const isVisible = useCallback((id: DashboardWidgetId) => widgets.includes(id), [widgets]);

  return { widgets, toggleWidget, resetToDefault, isVisible, setWidgets: persist };
}
