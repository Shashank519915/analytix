"use client";

import { AnalyticsDashboard, AnalyticsDashboardSkeleton } from "@analytix/dashboard";
import type { DashboardWidgetId } from "@analytix/core";
import { useToast } from "./ToastProvider";

export function SiteAnalyticsSection({
  siteId,
  defaultWidgets,
}: {
  siteId: string;
  defaultWidgets?: DashboardWidgetId[];
}) {
  const { toast } = useToast();

  return (
    <AnalyticsDashboard
      siteId={siteId}
      defaultWidgets={defaultWidgets}
      defaultTheme="light"
      settingsEndpoint={`/api/sites/${siteId}`}
      loadingFallback={<AnalyticsDashboardSkeleton />}
      onWidgetsSaved={() => toast("Widget layout saved as site default")}
      onWidgetsSaveError={(message) => toast(message)}
    />
  );
}
