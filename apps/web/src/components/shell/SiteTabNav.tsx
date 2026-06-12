"use client";

import Link from "next/link";

const TABS = [
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
  { id: "integration", label: "Integration" },
] as const;

export type SiteTabId = (typeof TABS)[number]["id"];

export function SiteTabNav({ siteId, activeTab }: { siteId: string; activeTab: SiteTabId }) {
  return (
    <nav className="tabNav" aria-label="Site sections">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/dashboard/sites/${siteId}?tab=${tab.id}`}
          className="tabNavLink"
          data-active={activeTab === tab.id ? "true" : "false"}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function parseSiteTab(value: string | undefined): SiteTabId {
  if (value === "settings" || value === "integration") return value;
  return "analytics";
}
