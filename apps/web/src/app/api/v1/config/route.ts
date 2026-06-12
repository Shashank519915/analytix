import { NextResponse } from "next/server";
import { getPublicSiteConfig, getSiteBySiteKey } from "@analytix/db";
import { isOriginAllowed } from "@analytix/core";
import { buildCorsHeaders } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  const siteKey = request.headers.get("x-analytix-site-key");
  const site = siteKey ? await getSiteBySiteKey(siteKey) : null;
  const allowedOrigins = site?.allowed_origins ?? [];

  if (origin && site && !isOriginAllowed(origin, allowedOrigins)) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin, allowedOrigins),
  });
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const siteKey = request.headers.get("x-analytix-site-key");

  if (!siteKey) {
    return NextResponse.json({ error: "Missing site key" }, { status: 401 });
  }

  const site = await getSiteBySiteKey(siteKey);
  if (!site) {
    return NextResponse.json({ error: "Invalid site key" }, { status: 401 });
  }

  if (origin && !isOriginAllowed(origin, site.allowed_origins)) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403, headers: buildCorsHeaders(origin, site.allowed_origins) }
    );
  }

  return NextResponse.json(
    { config: getPublicSiteConfig(site) },
    { headers: buildCorsHeaders(origin, site.allowed_origins) }
  );
}
