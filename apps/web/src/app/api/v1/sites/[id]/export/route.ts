import { NextResponse } from "next/server";
import type { AnalyticsFilters, AnalyticsScope } from "@analytix/core";
import { resolveDateRange } from "@analytix/core";
import { exportAnalyticsCsv } from "@analytix/db";
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

    const csv = await exportAnalyticsCsv(filters);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="analytix-${site.name.replace(/\s+/g, "-").toLowerCase()}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[v1/sites/export]", error);
    return NextResponse.json({ error: "Failed to export analytics" }, { status: 500 });
  }
}
