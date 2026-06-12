import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSiteById } from "@analytix/db";
import { AuthError, requireAccountSession } from "@/lib/auth";

/**
 * Sends a test page_view through the collect pipeline server-side (no Origin header).
 * Mirrors how consumer apps proxy collect (e.g. Bluemint /api/analytics/collect).
 */
export async function POST(
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

    const appUrl = (process.env.APP_URL ?? "http://localhost:3001").replace(/\/$/, "");
    const payload = {
      event_type: "page_view" as const,
      path: "/integration-test",
      session_id: randomUUID(),
      visitor_fingerprint: "analytix-integration-test",
      referrer: "",
      metadata: {
        source: "analytix_platform_test",
        page_title: "Analytix integration test",
      },
    };

    const upstream = await fetch(`${appUrl}/api/v1/collect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Analytix-Site-Key": site.site_key,
      },
      body: JSON.stringify(payload),
    });

    const body = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return NextResponse.json(
        { error: body.error ?? "Collect request failed", details: body },
        { status: upstream.status }
      );
    }

    if (body.skipped === "excluded_path") {
      return NextResponse.json({
        ok: true,
        recorded: false,
        reason: "Path /integration-test is excluded by site exclude_paths.",
      });
    }

    if (body.skipped === "event_disabled") {
      return NextResponse.json({
        ok: true,
        recorded: false,
        reason: "page_view is disabled for this site's collection profile.",
      });
    }

    if (body.sampled) {
      return NextResponse.json({
        ok: true,
        recorded: false,
        reason: "Event dropped by sample rate for this site.",
      });
    }

    if (body.deduped) {
      return NextResponse.json({
        ok: true,
        recorded: false,
        reason: "Duplicate page view deduplicated (try again in a few seconds).",
      });
    }

    return NextResponse.json({ ok: true, recorded: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[sites/id/test-event]", error);
    return NextResponse.json({ error: "Failed to send test event" }, { status: 500 });
  }
}
