import Link from "next/link";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getSiteById } from "@analytix/db";
import { requireAccountSession } from "@/lib/auth";
import "@Shashank519915/analytix-dashboard/styles.css";

const AnalyticsDashboard = dynamic(
  () => import("@Shashank519915/analytix-dashboard").then((mod) => mod.AnalyticsDashboard),
  {
    loading: () => <div className="card">Loading analytics…</div>,
  }
);

export default async function SiteAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await requireAccountSession();
  const site = await getSiteById(id);

  if (!site || site.account_id !== account.id) {
    notFound();
  }

  const collectUrl = `${process.env.APP_URL ?? "http://localhost:3001"}/api/v1/collect`;

  return (
    <main>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">{site.name}</h1>
          <p className="pageSubtitle">{site.domain}</p>
        </div>
        <Link className="btnSecondary" href="/dashboard">
          All sites
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Site settings</h2>
        <div className="settingsGrid">
          <div>
            <strong>Collect endpoint</strong>
            <div className="secretRow">{collectUrl}</div>
          </div>
          <div>
            <strong>Site key</strong>
            <div className="secretRow">{site.site_key}</div>
          </div>
          <div>
            <strong>API secret</strong>
            <div className="secretRow">{site.api_secret}</div>
          </div>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: 0 }}>
          Send the site key with <code>X-Analytix-Site-Key</code> when collecting events.
          Use the API secret as a Bearer token for summary and export APIs.
        </p>
      </div>

      <AnalyticsDashboard siteId={site.id} />
    </main>
  );
}
