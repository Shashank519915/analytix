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
  site: SiteRecord;
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
    { label: "Allowed origin", value: site.allowed_origins[0] ?? site.domain },
  ];

  async function sendTestEvent() {
    try {
      const res = await fetch(collectUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Analytix-Site-Key": site.site_key,
        },
        body: JSON.stringify({
          event_type: "page_view",
          path: "/integration-test",
          session_id: crypto.randomUUID(),
          visitor_fingerprint: "analytix-integration-test",
          referrer: "",
          metadata: { source: "analytix_platform_test", page_title: "Analytix integration test" },
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Collect request failed");
      }

      toast("Test event sent — check Analytics in a few seconds.");
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
      </section>

      <section className="card stack">
        <div>
          <h2 className="sectionTitle">Verify collection</h2>
          <p className="sectionLead">
            Sends a single <code>page_view</code> to your collect endpoint using the site key.
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
