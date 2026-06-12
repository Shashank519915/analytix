import { NextResponse } from "next/server";
import type { AnalyticsFilters, AnalyticsScope } from "@analytix/core";
import { resolveDateRange } from "@analytix/core";
import { getAnalyticsSummary } from "@analytix/db";
import { AuthError, authorizeSiteAccess } from "@/lib/auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const site = await authorizeSiteAccess(request, id);
    if (!site) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dates = resolveDateRange({
      range: searchParams.get("range"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });

    const scopeParam = searchParams.get("scope");
    const filters: AnalyticsFilters = {
      site_id: id,
      from: dates.from,
      to: dates.to,
      granularity: searchParams.get("granularity") === "hour" ? "hour" : "day",
      scope: (scopeParam as AnalyticsScope | null) ?? "all",
      path: searchParams.get("path"),
      contentId: searchParams.get("contentId"),
      includeBlogArticles: searchParams.get("includeBlogArticles") === "1",
    };

    const summary = await getAnalyticsSummary(filters, {
      includePreviousPeriod: searchParams.get("compare") === "1",
    });

    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[v1/sites/summary]", error);
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 });
  }
}
