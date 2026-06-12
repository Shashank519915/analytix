import { NextResponse } from "next/server";
import { z } from "zod";
import { updateSiteSchema } from "@analytix/core";
import { getSiteById, updateSite } from "@analytix/db";
import { AuthError, requireAccountSession } from "@/lib/auth";

function publicSite(site: {
  id: string;
  account_id: string;
  name: string;
  domain: string;
  site_key: string;
  api_secret: string;
  exclude_paths: string[];
  allowed_origins: string[];
  retention_days: number;
  analytics_config: import("@analytix/core").SiteAnalyticsConfig;
  created_at: string;
}) {
  return {
    id: site.id,
    account_id: site.account_id,
    name: site.name,
    domain: site.domain,
    site_key: site.site_key,
    api_secret: site.api_secret,
    exclude_paths: site.exclude_paths,
    allowed_origins: site.allowed_origins,
    retention_days: site.retention_days,
    analytics_config: site.analytics_config,
    created_at: site.created_at,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const account = await requireAccountSession();
    const site = await getSiteById(id);

    if (!site || site.account_id !== account.id) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    return NextResponse.json({ site: publicSite(site) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[sites/id/get]", error);
    return NextResponse.json({ error: "Failed to load site" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const account = await requireAccountSession();
    const existing = await getSiteById(id);

    if (!existing || existing.account_id !== account.id) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const body = updateSiteSchema.parse(await request.json());
    const site = await updateSite(id, body);

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    return NextResponse.json({ site: publicSite(site) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid site payload" }, { status: 400 });
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[sites/id/patch]", error);
    return NextResponse.json({ error: "Failed to update site" }, { status: 500 });
  }
}
