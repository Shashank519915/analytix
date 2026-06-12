export const DASHBOARD_WIDGET_IDS = [
  "metrics",
  "chart",
  "top_paths",
  "top_content",
  "landing_pages",
  "referrers",
  "channels",
  "utm",
  "geo",
  "devices",
  "os",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetId[] = [...DASHBOARD_WIDGET_IDS];

export type CollectionProfile = "minimal" | "standard" | "full" | "custom";
export type CollectionEventType =
  | "page_view"
  | "engagement"
  | "scroll_depth"
  | "outbound_click"
  | "custom";
export type CollectionFieldGroup = "geo" | "utm" | "device" | "performance" | "content";
export type ReferrerChannel = "Direct" | "Organic" | "Social" | "Email" | "Paid" | "Referral";

export interface DashboardThemeConfig {
  mode?: "light" | "dark" | "system";
  accent?: string;
}

export interface SiteAnalyticsConfig {
  collection_profile: CollectionProfile;
  enabled_events: CollectionEventType[];
  enabled_fields: CollectionFieldGroup[];
  sample_rate: number;
  consent_required: boolean;
  dashboard_widgets: DashboardWidgetId[];
  dashboard_theme: DashboardThemeConfig;
}

export interface PublicSiteConfig {
  collection_profile: CollectionProfile;
  enabled_events: CollectionEventType[];
  enabled_fields: CollectionFieldGroup[];
  sample_rate: number;
  consent_required: boolean;
  exclude_paths: string[];
  dashboard_widgets: DashboardWidgetId[];
  dashboard_theme: DashboardThemeConfig;
}

export const DEFAULT_SITE_ANALYTICS_CONFIG: SiteAnalyticsConfig = {
  collection_profile: "standard",
  enabled_events: ["page_view", "engagement"],
  enabled_fields: ["device", "content", "utm"],
  sample_rate: 1,
  consent_required: false,
  dashboard_widgets: DEFAULT_DASHBOARD_WIDGETS,
  dashboard_theme: { mode: "system" },
};

const PROFILE_PRESETS: Record<
  Exclude<CollectionProfile, "custom">,
  Pick<SiteAnalyticsConfig, "enabled_events" | "enabled_fields">
> = {
  minimal: {
    enabled_events: ["page_view"],
    enabled_fields: [],
  },
  standard: {
    enabled_events: ["page_view", "engagement"],
    enabled_fields: ["device", "content"],
  },
  full: {
    enabled_events: ["page_view", "engagement", "custom", "scroll_depth", "outbound_click"],
    enabled_fields: ["geo", "utm", "device", "performance", "content"],
  },
};

function normalizeWidgetIds(widgets: string[] | undefined): DashboardWidgetId[] {
  if (!widgets?.length) return DEFAULT_DASHBOARD_WIDGETS;
  const allowed = new Set<string>(DASHBOARD_WIDGET_IDS);
  const filtered = widgets.filter((id): id is DashboardWidgetId => allowed.has(id));
  return filtered.length ? filtered : DEFAULT_DASHBOARD_WIDGETS;
}

export function mergeAnalyticsConfig(
  partial?: Partial<SiteAnalyticsConfig> | Record<string, unknown> | null
): SiteAnalyticsConfig {
  const input = (partial ?? {}) as Partial<SiteAnalyticsConfig>;
  return {
    collection_profile: input.collection_profile ?? DEFAULT_SITE_ANALYTICS_CONFIG.collection_profile,
    enabled_events: input.enabled_events ?? DEFAULT_SITE_ANALYTICS_CONFIG.enabled_events,
    enabled_fields: input.enabled_fields ?? DEFAULT_SITE_ANALYTICS_CONFIG.enabled_fields,
    sample_rate: input.sample_rate ?? DEFAULT_SITE_ANALYTICS_CONFIG.sample_rate,
    consent_required: input.consent_required ?? DEFAULT_SITE_ANALYTICS_CONFIG.consent_required,
    dashboard_widgets: normalizeWidgetIds(input.dashboard_widgets),
    dashboard_theme: {
      ...DEFAULT_SITE_ANALYTICS_CONFIG.dashboard_theme,
      ...(input.dashboard_theme ?? {}),
    },
  };
}

export function resolveEffectiveCollectionConfig(
  config: SiteAnalyticsConfig
): Pick<SiteAnalyticsConfig, "enabled_events" | "enabled_fields" | "sample_rate" | "consent_required"> {
  if (config.collection_profile === "custom") {
    return {
      enabled_events: config.enabled_events,
      enabled_fields: config.enabled_fields,
      sample_rate: clampSampleRate(config.sample_rate),
      consent_required: config.consent_required,
    };
  }

  const preset = PROFILE_PRESETS[config.collection_profile];
  return {
    enabled_events: preset.enabled_events,
    enabled_fields: preset.enabled_fields,
    sample_rate: clampSampleRate(config.sample_rate),
    consent_required: config.consent_required,
  };
}

function clampSampleRate(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

export function isEventEnabled(config: SiteAnalyticsConfig, eventType: string): boolean {
  const effective = resolveEffectiveCollectionConfig(config);
  return effective.enabled_events.includes(eventType as CollectionEventType);
}

export function isFieldEnabled(config: SiteAnalyticsConfig, field: CollectionFieldGroup): boolean {
  const effective = resolveEffectiveCollectionConfig(config);
  return effective.enabled_fields.includes(field);
}

export function shouldDropEventForSampling(config: SiteAnalyticsConfig): boolean {
  const rate = resolveEffectiveCollectionConfig(config).sample_rate;
  if (rate >= 1) return false;
  if (rate <= 0) return true;
  return Math.random() > rate;
}

export function classifyReferrerChannel(input: {
  referrerHost: string;
  utmMedium?: string | null;
  utmSource?: string | null;
}): ReferrerChannel {
  const host = (input.referrerHost || "Direct").toLowerCase();
  const medium = (input.utmMedium ?? "").toLowerCase();
  const source = (input.utmSource ?? "").toLowerCase();

  if (host === "direct" || host === "(none)" || host === "not set") {
    return medium === "email" ? "Email" : "Direct";
  }

  if (["cpc", "ppc", "paid", "paid-social", "cpm", "display"].includes(medium)) {
    return "Paid";
  }

  if (medium === "email" || host.includes("mail.")) {
    return "Email";
  }

  if (
    /facebook|instagram|linkedin|twitter|t\.co|x\.com|reddit|tiktok|youtube|pinterest|threads\.net/.test(
      host
    )
  ) {
    return "Social";
  }

  if (
    /google\.|bing\.|yahoo\.|duckduckgo\.|baidu\.|yandex\.|ecosia\./.test(host) &&
    !["cpc", "ppc", "paid"].includes(medium)
  ) {
    return "Organic";
  }

  if (source.includes("google") && ["cpc", "ppc"].includes(medium)) {
    return "Paid";
  }

  return "Referral";
}

export function toPublicSiteConfig(input: {
  analytics_config: SiteAnalyticsConfig;
  exclude_paths: string[];
}): PublicSiteConfig {
  const config = mergeAnalyticsConfig(input.analytics_config);
  const effective = resolveEffectiveCollectionConfig(config);
  return {
    collection_profile: config.collection_profile,
    enabled_events: effective.enabled_events,
    enabled_fields: effective.enabled_fields,
    sample_rate: effective.sample_rate,
    consent_required: effective.consent_required,
    exclude_paths: input.exclude_paths,
    dashboard_widgets: config.dashboard_widgets,
    dashboard_theme: config.dashboard_theme,
  };
}

export function isPublicEventEnabled(config: PublicSiteConfig, eventType: string): boolean {
  return config.enabled_events.includes(eventType as CollectionEventType);
}

export function isPublicFieldEnabled(config: PublicSiteConfig, field: CollectionFieldGroup): boolean {
  return config.enabled_fields.includes(field);
}

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  metrics: "KPI metrics",
  chart: "Traffic chart",
  top_paths: "Top paths",
  top_content: "Top content",
  landing_pages: "Landing pages",
  referrers: "Referrers",
  channels: "Traffic channels",
  utm: "UTM breakdown",
  geo: "Countries & regions",
  devices: "Devices & browsers",
  os: "Operating systems",
};
