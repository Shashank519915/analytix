import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteById } from "@analytix/db";
import { SiteSettingsPanel } from "@/components/SiteSettingsPanel";
import { SiteAnalyticsSection } from "@/components/SiteAnalyticsSection";
import { SiteIntegrationPanel } from "@/components/SiteIntegrationPanel";
import { PageHeader } from "@/components/shell/PageHeader";
import { SiteTabNav, parseSiteTab } from "@/components/shell/SiteTabNav";
import { requireAccountSession } from "@/lib/auth";
import "@analytix/dashboard/styles.css";

export default async function SiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = parseSiteTab(tabParam);

  const account = await requireAccountSession();
  const site = await getSiteById(id);

  if (!site || site.account_id !== account.id) {
    notFound();
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3001";
  const collectUrl = `${appUrl}/api/v1/collect`;

  return (
    <>
      <PageHeader
        title={site.name}
        subtitle={site.domain}
        actions={
          <Link className="btnSecondary" href="/dashboard">
            All sites
          </Link>
        }
      />

      <SiteTabNav siteId={site.id} activeTab={tab} />

      {tab === "analytics" ? (
        <SiteAnalyticsSection
          siteId={site.id}
          defaultWidgets={site.analytics_config.dashboard_widgets}
        />
      ) : null}

      {tab === "settings" ? <SiteSettingsPanel site={site} collectUrl={collectUrl} /> : null}

      {tab === "integration" ? (
        <SiteIntegrationPanel site={site} collectUrl={collectUrl} appUrl={appUrl} />
      ) : null}
    </>
  );
}
