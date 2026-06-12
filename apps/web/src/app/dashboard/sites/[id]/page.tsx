import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteById } from "@analytix/db";
import { SiteSettingsPanel } from "@/components/SiteSettingsPanel";
import { SiteIntegrationPanel } from "@/components/SiteIntegrationPanel";
import { SiteAnalyticsSectionDynamic } from "@/components/SiteAnalyticsSectionDynamic";
import { PageHeader } from "@/components/shell/PageHeader";
import { SiteTabNav } from "@/components/shell/SiteTabNav";
import { parseSiteTab } from "@/lib/site-tabs";
import { requireAccountSession } from "@/lib/auth";

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
  const { api_secret: _apiSecret, ...siteForClient } = site;

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
        <SiteAnalyticsSectionDynamic
          siteId={site.id}
          defaultWidgets={site.analytics_config.dashboard_widgets}
        />
      ) : null}

      {tab === "settings" ? <SiteSettingsPanel site={siteForClient} collectUrl={collectUrl} /> : null}

      {tab === "integration" ? (
        <SiteIntegrationPanel site={site} collectUrl={collectUrl} appUrl={appUrl} />
      ) : null}
    </>
  );
}
