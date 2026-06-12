"use client";

import Link from "next/link";
import type { SiteTabId } from "@/lib/site-tabs";

const TABS = [
  { id: "analytics" as const, label: "Analytics" },
  { id: "settings" as const, label: "Settings" },
  { id: "integration" as const, label: "Integration" },
];

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
