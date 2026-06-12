export const SITE_TABS = ["analytics", "settings", "integration"] as const;

export type SiteTabId = (typeof SITE_TABS)[number];

export function parseSiteTab(value: string | undefined): SiteTabId {
  if (value === "settings" || value === "integration") return value;
  return "analytics";
}
