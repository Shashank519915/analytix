"use client";

import dynamic from "next/dynamic";
import { AnalyticsDashboardSkeleton } from "@analytix/dashboard";
import type { DashboardWidgetId } from "@analytix/core";
import "@analytix/dashboard/styles.css";

const SiteAnalyticsSection = dynamic(
  () => import("@/components/SiteAnalyticsSection").then((m) => m.SiteAnalyticsSection),
  {
    ssr: false,
    loading: () => <AnalyticsDashboardSkeleton />,
  }
);

export function SiteAnalyticsSectionDynamic({
  siteId,
  defaultWidgets,
}: {
  siteId: string;
  defaultWidgets?: DashboardWidgetId[];
}) {
  return <SiteAnalyticsSection siteId={siteId} defaultWidgets={defaultWidgets} />;
}
