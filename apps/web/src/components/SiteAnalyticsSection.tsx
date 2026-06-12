"use client";

import {
  AnalyticsDashboard,
  AnalyticsDashboardSkeleton,
} from "@analytix/dashboard";
import type { DashboardWidgetId } from "@analytix/core";

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
