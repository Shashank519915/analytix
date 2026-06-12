"use client";

import { AnalyticsDashboard, AnalyticsDashboardSkeleton } from "@Shashank519915/analytix-dashboard";

export function SiteAnalyticsSection({ siteId }: { siteId: string }) {
  return (
    <AnalyticsDashboard siteId={siteId} loadingFallback={<AnalyticsDashboardSkeleton />} />
  );
}
