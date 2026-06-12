import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteById } from "@analytix/db";
import { requireAccountSession } from "@/lib/auth";
import { SiteSettingsPanel } from "@/components/SiteSettingsPanel";
import { SiteAnalyticsSection } from "@/components/SiteAnalyticsSection";
import "@Shashank519915/analytix-dashboard/styles.css";

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

      <SiteSettingsPanel site={site} collectUrl={collectUrl} />

      <SiteAnalyticsSection
        siteId={site.id}
        defaultWidgets={site.analytics_config.dashboard_widgets}
      />
    </main>
  );
}
