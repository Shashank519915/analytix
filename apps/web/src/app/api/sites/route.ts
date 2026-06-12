import { NextResponse } from "next/server";
import { z } from "zod";
import { createSiteSchema } from "@analytix/core";
import { createSite, listSitesForAccount } from "@analytix/db";
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
    created_at: site.created_at,
  };
}

export async function GET() {
  try {
    const account = await requireAccountSession();
    const sites = await listSitesForAccount(account.id);
    return NextResponse.json({ sites: sites.map(publicSite) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[sites/get]", error);
    return NextResponse.json({ error: "Failed to load sites" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const account = await requireAccountSession();
    const body = createSiteSchema.parse(await request.json());
    const site = await createSite(account.id, body);
    return NextResponse.json({ site: publicSite(site) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid site payload" }, { status: 400 });
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[sites/post]", error);
    return NextResponse.json({ error: "Failed to create site" }, { status: 500 });
  }
}
