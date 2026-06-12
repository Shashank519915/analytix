import { isPublicEventEnabled } from "../../analytics-config";
import type { AnalytixPluginContext } from "../types";

const MILESTONES = [25, 50, 75, 100] as const;

/** Attach scroll listener that emits scroll_depth milestones via callback. */
export function attachScrollDepthListener(
  ctx: AnalytixPluginContext,
  emitScroll: (depth: number, path: string) => void
) {
  if (typeof window === "undefined") return () => undefined;
  if (ctx.siteConfig && !isPublicEventEnabled(ctx.siteConfig, "scroll_depth")) {
    return () => undefined;
  }

  const fired = new Set<number>();
  const path = () => window.location.pathname;

  function handler() {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop;
    const height = Math.max(doc.scrollHeight - window.innerHeight, 1);
    const percent = Math.min(100, Math.round((scrollTop / height) * 100));

    for (const milestone of MILESTONES) {
      if (percent >= milestone && !fired.has(milestone)) {
        fired.add(milestone);
        emitScroll(milestone, path());
      }
    }
  }

  window.addEventListener("scroll", handler, { passive: true });
  return () => window.removeEventListener("scroll", handler);
}

/** Plugin stub for explicit plugin lists (scroll is wired in createAnalytixClient). */
export function scrollDepthPlugin(): { name: string } {
  return { name: "analytix-scroll-depth" };
}
