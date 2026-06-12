"use client";

import {
  AnalyticsDashboard,
  AnalyticsDashboardSkeleton,
} from "@Shashank519915/analytix-dashboard";
import type { DashboardWidgetId } from "@Shashank519915/analytix-core";

export function SiteAnalyticsSection({
  siteId,
  defaultWidgets,
}: {
  siteId: string;
  defaultWidgets?: DashboardWidgetId[];
}) {
  return (
    <AnalyticsDashboard
      siteId={siteId}
      defaultWidgets={defaultWidgets}
      settingsEndpoint={`/api/sites/${siteId}`}
      loadingFallback={<AnalyticsDashboardSkeleton />}
    />
  );
}
