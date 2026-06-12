"use client";

import Link from "next/link";
import type { SiteRecord } from "@analytix/core";
import { CopyButton } from "./CopyButton";
import { useToast } from "./ToastProvider";

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

export function SiteIntegrationPanel({
  site,
  collectUrl,
  appUrl,
}: {
  site: Omit<SiteRecord, "api_secret">;
  collectUrl: string;
  appUrl: string;
}) {
  const { toast } = useToast();
  const configUrl = collectUrl.replace("/collect", "/config");

  const installSnippet = `npm install @analytix/core @analytix/react`;

  const providerSnippet = `import { AnalytixProvider, AnalytixTracker } from "@analytix/react";

export function Analytics({ children }: { children: React.ReactNode }) {
  return (
    <AnalytixProvider
      siteKey="${site.site_key}"
      collectUrl="${collectUrl}"
      configUrl="${configUrl}"
    >
      <AnalytixTracker />
      {children}
    </AnalytixProvider>
  );
}`;

  const envChecklist = [
    { label: "ANALYTIX_SITE_KEY", value: site.site_key },
    { label: "ANALYTIX_COLLECT_URL", value: collectUrl },
    { label: "ANALYTIX_CONFIG_URL", value: configUrl },
  ];

  const devOrigins = site.allowed_origins.filter((origin) =>
    /localhost|127\.0\.0\.1/.test(origin)
  );
  const prodOrigins = site.allowed_origins.filter(
    (origin) => !/localhost|127\.0\.0\.1/.test(origin)
  );

  async function sendTestEvent() {
    try {
      const res = await fetch(`/api/sites/${site.id}/test-event`, {
        method: "POST",
        credentials: "same-origin",
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.error ?? "Test event failed");
      }

      if (payload.recorded === false) {
        toast(payload.reason ?? "Test event skipped by site rules.");
        return;
      }

      toast("Test event recorded — check Analytics in a few seconds.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Test event failed");
    }
  }

  return (
    <div className="stack">
      <section className="card stack">
        <div>
          <h2 className="sectionTitle">Install packages</h2>
          <p className="sectionLead">
            Published on npm as <code>@analytix/*</code>. No registry token required.
          </p>
        </div>
        <div className="codeBlockHeader">
          <span className="fieldLabel">Terminal</span>
          <CopyButton
            value={installSnippet}
            label="Copy"
            onCopied={() => toast("Install command copied")}
          />
        </div>
        <pre className="codeBlock">{installSnippet}</pre>
      </section>

      <section className="card stack">
        <div>
          <h2 className="sectionTitle">React provider</h2>
          <p className="sectionLead">
            Wrap your app root. The tracker reads collection profile from{" "}
            <code>{configUrl}</code>.
          </p>
        </div>
        <div className="codeBlockHeader">
          <span className="fieldLabel">analytics.tsx</span>
          <CopyButton
            value={providerSnippet}
            label="Copy"
            onCopied={() => toast("Provider snippet copied")}
          />
        </div>
        <pre className="codeBlock">{providerSnippet}</pre>
      </section>

      <section className="card stack">
        <div>
          <h2 className="sectionTitle">Environment checklist</h2>
          <p className="sectionLead">
            Map these in your host (Netlify, Vercel) or proxy through your API.
          </p>
        </div>
        <ul className="checklist">
          {envChecklist.map((item) => (
            <li key={item.label}>
              <span className="checklistMark">✓</span>
              <span>
                <strong style={{ color: "var(--ax-ink)" }}>{item.label}</strong>
                <br />
                <code>{item.value}</code>
              </span>
            </li>
          ))}
        </ul>
        <div className="stack" style={{ gap: 8 }}>
          <span className="fieldLabel">Allowed origins ({site.allowed_origins.length})</span>
          {prodOrigins.length ? (
            <ul className="originList">
              {prodOrigins.map((origin) => (
                <li key={origin}>
                  <code>{origin}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--ax-muted)" }}>
              No production origins configured — add your live site URL in Settings if the browser
              SDK calls collect/config directly (not via a server proxy).
            </p>
          )}
          {devOrigins.length ? (
            <>
              <span className="fieldLabel" style={{ marginTop: 4 }}>
                Local dev origins
              </span>
              <ul className="originList">
                {devOrigins.map((origin) => (
                  <li key={origin}>
                    <code>{origin}</code>
                  </li>
                ))}
              </ul>
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--ax-muted)" }}>
                <code>http://localhost:3000</code> is included by default so you can run the
                consumer app locally (<code>next dev</code>) and test tracking in the browser.
              </p>
            </>
          ) : null}
        </div>
      </section>

      <section className="card stack">
        <div>
          <h2 className="sectionTitle">Verify collection</h2>
          <p className="sectionLead">
            Sends a single <code>page_view</code> through the collect pipeline (server-side, same
            as a consumer API proxy). Does not depend on allowed origins.
          </p>
        </div>
        <div className="pageActions">
          <button type="button" className="btn" onClick={sendTestEvent}>
            Send test event
          </button>
          <Link className="btnSecondary" href={`/dashboard/sites/${site.id}?tab=analytics`}>
            Open analytics
          </Link>
        </div>
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--ax-muted)" }}>
          Platform URL: <code>{appUrl}</code> · Profile:{" "}
          <span className="badge badgeInfo">{profileLabel(site.analytics_config.collection_profile)}</span>
        </p>
      </section>
    </div>
  );
}
