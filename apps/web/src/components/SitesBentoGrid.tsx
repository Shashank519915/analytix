import Link from "next/link";
import type { SiteRecord } from "@analytix/core";

function profileLabel(profile: SiteRecord["analytics_config"]["collection_profile"]) {
  switch (profile) {
    case "minimal":
      return "Minimal";
    case "standard":
      return "Standard";
    case "full":
      return "Full";
    default:
      return "Custom";
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SitesBentoGrid({ sites }: { sites: SiteRecord[] }) {
  if (sites.length === 0) {
    return (
      <div className="sitesBento">
        <div className="emptyState">
          <h2>No sites yet</h2>
          <p>Create a property to start collecting page views and engagement.</p>
          <Link className="btn" href="/dashboard/sites/new">
            Create site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sitesBento">
      {sites.map((site) => (
        <Link key={site.id} className="siteCard" href={`/dashboard/sites/${site.id}`}>
          <div className="siteCardHeader">
            <div>
              <h2 className="siteCardTitle">{site.name}</h2>
              <p className="siteCardDomain">{site.domain}</p>
            </div>
            <span className="badge badgeInfo">{profileLabel(site.analytics_config.collection_profile)}</span>
          </div>
          <div className="siteCardMeta">
            <span>Added {formatDate(site.created_at)}</span>
            <span>{site.allowed_origins.length || 1} origin(s)</span>
          </div>
          <span className="siteCardAction">Open site →</span>
        </Link>
      ))}

      <Link className="addSiteCard" href="/dashboard/sites/new">
        <strong style={{ color: "var(--ax-ink)", fontSize: "0.9375rem" }}>Add site</strong>
        <span style={{ fontSize: "0.8125rem" }}>Register a new domain</span>
      </Link>
    </div>
  );
}

export function SitesBentoSkeleton() {
  return (
    <div className="sitesBento" aria-busy="true" aria-label="Loading sites">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeletonCard">
          <div className="skeleton skeletonLine skeletonLineMedium" />
          <div className="skeleton skeletonLine skeletonLineShort" />
          <div className="skeleton skeletonLine" style={{ marginTop: 24, width: "30%" }} />
        </div>
      ))}
    </div>
  );
}
