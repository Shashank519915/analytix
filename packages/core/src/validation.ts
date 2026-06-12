import { z } from "zod";
import { DASHBOARD_WIDGET_IDS } from "./analytics-config";

export const collectEventSchema = z.object({
  event_type: z
    .enum(["page_view", "engagement", "custom", "scroll_depth", "outbound_click"])
    .optional(),
  path: z.string().min(1).max(500),
  content_id: z.string().max(120).nullable().optional(),
  content_slug: z.string().max(200).nullable().optional(),
  content_title: z.string().max(500).nullable().optional(),
  session_id: z.string().min(1).max(120),
  visitor_fingerprint: z.string().min(1).max(500),
  visitor_type: z.enum(["new", "returning"]).optional(),
  referrer: z.string().max(2000).nullable().optional(),
  user_agent: z.string().max(1000).nullable().optional(),
  accept_language: z.string().max(120).nullable().optional(),
  timezone: z.string().max(120).nullable().optional(),
  screen_width: z.number().int().nullable().optional(),
  screen_height: z.number().int().nullable().optional(),
  viewport_width: z.number().int().nullable().optional(),
  viewport_height: z.number().int().nullable().optional(),
  device_pixel_ratio: z.number().nullable().optional(),
  platform: z.string().max(120).nullable().optional(),
  connection_type: z.string().max(60).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const registerSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  name: z.string().max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
});

export const createSiteSchema = z.object({
  name: z.string().min(1).max(120),
  domain: z.string().min(1).max(200),
  exclude_paths: z.array(z.string().max(200)).optional(),
  allowed_origins: z.array(z.string().max(200)).optional(),
  retention_days: z.number().int().min(30).max(730).optional(),
});

export const siteAnalyticsConfigSchema = z.object({
  collection_profile: z.enum(["minimal", "standard", "full", "custom"]).optional(),
  enabled_events: z
    .array(z.enum(["page_view", "engagement", "scroll_depth", "outbound_click", "custom"]))
    .optional(),
  enabled_fields: z.array(z.enum(["geo", "utm", "device", "performance", "content"])).optional(),
  sample_rate: z.number().min(0).max(1).optional(),
  consent_required: z.boolean().optional(),
  dashboard_widgets: z.array(z.enum(DASHBOARD_WIDGET_IDS)).optional(),
  dashboard_theme: z
    .object({
      mode: z.enum(["light", "dark", "system"]).optional(),
      accent: z.string().max(40).optional(),
    })
    .optional(),
});

export const updateSiteSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    domain: z.string().min(1).max(200).optional(),
    exclude_paths: z.array(z.string().max(200)).optional(),
    allowed_origins: z.array(z.string().max(200)).optional(),
    retention_days: z.number().int().min(30).max(730).optional(),
    analytics_config: siteAnalyticsConfigSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type CollectEventPayload = z.infer<typeof collectEventSchema>;
