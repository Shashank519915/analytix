import { NextResponse } from "next/server";
import { z } from "zod";
import {
  collectEventSchema,
  extractClientIp,
  extractGeoFromRequest,
  hashIp,
  isOriginAllowed,
} from "@analytix/core";
import {
  getSiteBySiteKey,
  incrementRateLimit,
  isDuplicatePageView,
  recordAnalyticsEvent,
} from "@analytix/db";
import { buildCorsHeaders } from "@/lib/cors";

async function resolveSite(request: Request) {
  const siteKey = request.headers.get("x-analytix-site-key");
  if (!siteKey) return null;
  return getSiteBySiteKey(siteKey);
}

function jsonWithCors(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
  allowedOrigins: string[]
) {
  return NextResponse.json(body, {
    status,
    headers: buildCorsHeaders(origin, allowedOrigins),
  });
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  const site = await resolveSite(request);
  const allowedOrigins = site?.allowed_origins ?? [];

  if (origin && site && !isOriginAllowed(origin, allowedOrigins)) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin, allowedOrigins),
  });
}

export async function POST(request: Request) {
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
    return jsonWithCors({ error: "Origin not allowed" }, 403, origin, site.allowed_origins);
  }

  try {
    const body = collectEventSchema.parse(await request.json());
    const ip = extractClientIp(request);
    const ipHash = hashIp(ip);
    const geo = extractGeoFromRequest(request);
    const eventType = body.event_type ?? "page_view";

    if (await incrementRateLimit(site.id, ipHash)) {
      return jsonWithCors({ error: "Rate limit exceeded" }, 429, origin, site.allowed_origins);
    }

    if (await isDuplicatePageView(site.id, body.session_id, body.path, eventType)) {
      return jsonWithCors({ ok: true, deduped: true }, 200, origin, site.allowed_origins);
    }

    await recordAnalyticsEvent({
      site_id: site.id,
      event_type: eventType,
      path: body.path,
      content_id: body.content_id ?? null,
      content_slug: body.content_slug ?? null,
      content_title: body.content_title ?? null,
      session_id: body.session_id,
      visitor_fingerprint: body.visitor_fingerprint,
      visitor_type: body.visitor_type ?? null,
      referrer: body.referrer ?? null,
      user_agent: body.user_agent ?? request.headers.get("user-agent"),
      accept_language: body.accept_language ?? request.headers.get("accept-language"),
      timezone: body.timezone ?? null,
      screen_width: body.screen_width ?? null,
      screen_height: body.screen_height ?? null,
      viewport_width: body.viewport_width ?? null,
      viewport_height: body.viewport_height ?? null,
      device_pixel_ratio: body.device_pixel_ratio ?? null,
      platform: body.platform ?? null,
      connection_type: body.connection_type ?? null,
      ip_hash: ipHash,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      metadata: body.metadata ?? {},
    });

    return jsonWithCors({ ok: true }, 200, origin, site.allowed_origins);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonWithCors({ error: "Invalid analytics payload" }, 400, origin, site.allowed_origins);
    }
    console.error("[v1/collect]", error);
    return jsonWithCors({ error: "Failed to record analytics" }, 500, origin, site.allowed_origins);
  }
}
