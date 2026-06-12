"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AnalyticsSummary, DashboardWidgetId } from "@analytix/core";
import { DEFAULT_DASHBOARD_WIDGETS, percentChange } from "@analytix/core";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  Eye,
  Users,
  Clock,
  MousePointerClick,
  Repeat,
  FileText,
  UserPlus,
  UserCheck,
  Sun,
  Moon,
  Monitor,
  SlidersHorizontal,
} from "lucide-react";
import { AnalyticsDashboardSkeleton } from "./AnalyticsDashboardSkeleton";
import { useDashboardWidgets } from "./useDashboardWidgets";
import { DASHBOARD_THEME_LABELS, useDashboardTheme } from "./useDashboardTheme";
import { WidgetCustomizePanel } from "./WidgetCustomizePanel";

type RangeKey = "24h" | "7d" | "30d" | "90d";
type Granularity = "hour" | "day";
type TrafficScope = "all" | "page" | "blog";
type ThemeMode = "light" | "dark" | "system";

export interface AnalyticsDashboardProps {
  siteId: string;
  summaryEndpoint?: string;
  exportEndpoint?: string;
  /** Shown while fetching summary data. Defaults to built-in skeleton. */
  loadingFallback?: ReactNode;
  /** Initial theme. Defaults to system preference. */
  defaultTheme?: ThemeMode;
  /** Site-default widget layout (overridden by localStorage when set). */
  defaultWidgets?: DashboardWidgetId[];
  /** PATCH endpoint to persist widget layout as site default. */
  settingsEndpoint?: string;
  /** Called after widget layout is saved as site default. */
  onWidgetsSaved?: () => void;
  /** Called when saving widget layout fails. */
  onWidgetsSaveError?: (message: string) => void;
}

function formatBucketLabel(value: string, granularity: Granularity) {
  const date = new Date(value);
  if (granularity === "hour") {
    return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function Delta({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null;
  const delta = percentChange(current, previous);
  if (delta === null) return <span className="metricDelta">—</span>;
  const up = delta >= 0;
  return (
    <span className={`metricDelta ${up ? "metricDeltaUp" : "metricDeltaDown"}`}>
      {up ? "+" : ""}
      {delta}% vs prior period
    </span>
  );
}

function BreakdownPanel({
  title,
  emptyMessage,
  rows,
}: {
  title: string;
  emptyMessage: string;
  rows: Array<{ key: string; label: ReactNode; value: ReactNode }>;
}) {
  return (
    <div className="chartPanel">
      <div className="panelTitle">{title}</div>
      {rows.length === 0 ? (
        <p className="emptyState">{emptyMessage}</p>
      ) : (
        <ul className="list">
          {rows.map((row) => (
            <li key={row.key}>
              <span className="listLabel">{row.label}</span>
              <span className="listValue">{row.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AnalyticsDashboard({
  siteId,
  summaryEndpoint,
  exportEndpoint,
  loadingFallback,
  defaultTheme = "system",
  defaultWidgets = DEFAULT_DASHBOARD_WIDGETS,
  settingsEndpoint,
  onWidgetsSaved,
  onWidgetsSaveError,
}: AnalyticsDashboardProps) {
  const summaryUrl = summaryEndpoint ?? `/api/v1/sites/${siteId}/summary`;
  const exportUrl = exportEndpoint ?? `/api/v1/sites/${siteId}/export`;

  const [range, setRange] = useState<RangeKey>("7d");
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customFrom, setCustomFrom] = useState(() =>
    toDateInputValue(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  );
  const [customTo, setCustomTo] = useState(() => toDateInputValue(new Date()));
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [trafficScope, setTrafficScope] = useState<TrafficScope>("all");
  const [path, setPath] = useState("");
  const [contentId, setContentId] = useState("");
  const [includeBlogArticles, setIncludeBlogArticles] = useState(false);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const { themeMode, cycleTheme, resolvedTheme } = useDashboardTheme(siteId, defaultTheme);
  const hasLoadedRef = useRef(false);
  const [showWidgetCustomize, setShowWidgetCustomize] = useState(false);
  const [savingDefaultWidgets, setSavingDefaultWidgets] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const { widgets, toggleWidget, resetToDefault, isVisible } = useDashboardWidgets(
    siteId,
    defaultWidgets
  );

  const filterParams = useMemo(() => {
    const params = new URLSearchParams({
      granularity,
      compare: "1",
    });

    if (useCustomRange) {
      params.set("from", new Date(`${customFrom}T00:00:00.000Z`).toISOString());
      params.set("to", new Date(`${customTo}T23:59:59.999Z`).toISOString());
    } else {
      params.set("range", range);
    }

    if (trafficScope === "page" && path.trim()) {
      params.set("scope", "page");
      params.set("path", path.trim());
      if (path.trim() === "/blog" && includeBlogArticles) {
        params.set("includeBlogArticles", "1");
      }
    } else if (trafficScope === "blog") {
      if (contentId.trim()) {
        params.set("scope", "article");
        params.set("contentId", contentId.trim());
      } else {
        params.set("scope", "blog");
      }
    }

    return params;
  }, [
    range,
    useCustomRange,
    customFrom,
    customTo,
    granularity,
    trafficScope,
    path,
    contentId,
    includeBlogArticles,
  ]);

  useEffect(() => {
    let cancelled = false;
    const isFirstLoad = !hasLoadedRef.current;
    if (isFirstLoad) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    setError("");

    fetch(`${summaryUrl}?${filterParams.toString()}`, { credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error ?? "Failed to load analytics");
        }
        return res.json();
      })
      .then((payload) => {
        if (!cancelled) {
          hasLoadedRef.current = true;
          setSummary(payload.summary ?? payload);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [summaryUrl, filterParams, retryNonce]);

  const chartData = useMemo(
    () =>
      (summary?.buckets ?? []).map((bucket) => ({
        label: formatBucketLabel(bucket.bucket_start, granularity),
        views: bucket.page_views,
        uniques: bucket.unique_visitors,
      })),
    [summary, granularity]
  );

  const themeClass = resolvedTheme === "dark" ? "analytix-theme-dark" : "analytix-theme-light";

  if (initialLoading) {
    return (
      <div className={`analytix-dash ${themeClass}`}>
        {loadingFallback ?? <AnalyticsDashboardSkeleton />}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`analytix-dash ${themeClass}`}>
        <p className="error">{error}</p>
        <button
          type="button"
          className="btnSecondary"
          style={{ marginTop: 12 }}
          onClick={() => {
            setError("");
            setRetryNonce((n) => n + 1);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={`analytix-dash ${themeClass}`}>
        <p className="emptyState">No analytics data yet.</p>
      </div>
    );
  }

  const prev = summary.previous_period;
  const gridStroke = resolvedTheme === "dark" ? "rgba(148,163,184,0.15)" : "rgba(15,23,42,0.08)";
  const areaFill = resolvedTheme === "dark" ? "rgba(96,165,250,0.18)" : "rgba(0,82,255,0.12)";
  const areaStroke = resolvedTheme === "dark" ? "#60a5fa" : "#0052ff";
  const lineStroke = resolvedTheme === "dark" ? "#34d399" : "#059669";

  async function saveDefaultWidgets() {
    if (!settingsEndpoint) return;
    setSavingDefaultWidgets(true);
    try {
      const res = await fetch(settingsEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analytics_config: { dashboard_widgets: widgets } }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const message =
          typeof payload.error === "string" ? payload.error : "Failed to save widget layout";
        onWidgetsSaveError?.(message);
        return;
      }
      onWidgetsSaved?.();
    } catch {
      onWidgetsSaveError?.("Failed to save widget layout");
    } finally {
      setSavingDefaultWidgets(false);
    }
  }

  return (
    <div className={`analytix-dash ${themeClass}${refreshing ? " analytix-refreshing" : ""}`}>
      <div className="toolbar">
        <span className="realtime">{summary.realtime_visitors} visitors in the last 15 minutes</span>
        <div className="toolbarActions">
          <button
            type="button"
            className="btn btnIcon"
            onClick={() => setShowWidgetCustomize((open) => !open)}
            aria-label="Customize widgets"
          >
            <SlidersHorizontal size={16} />
          </button>
          <button
            type="button"
            className="btn btnIcon"
            onClick={cycleTheme}
            aria-label={`Theme: ${DASHBOARD_THEME_LABELS[themeMode]}. Click to change.`}
            title={`Theme: ${DASHBOARD_THEME_LABELS[themeMode]}`}
          >
            {themeMode === "system" ? (
              <Monitor size={16} />
            ) : resolvedTheme === "dark" ? (
              <Sun size={16} />
            ) : (
              <Moon size={16} />
            )}
          </button>
          <a className="btn" href={`${exportUrl}?${filterParams.toString()}`}>
            <Download size={14} />
            Export CSV
          </a>
        </div>
      </div>

      {showWidgetCustomize ? (
        <WidgetCustomizePanel
          widgets={widgets}
          onToggle={toggleWidget}
          onReset={resetToDefault}
          onSaveDefault={settingsEndpoint ? saveDefaultWidgets : undefined}
          savingDefault={savingDefaultWidgets}
        />
      ) : null}

      <div className="filters">
        <div className="filterGroup filterGroupWide">
          <span className="filterLabel">Range</span>
          <div className="chips">
            {(["24h", "7d", "30d", "90d"] as RangeKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className={!useCustomRange && range === key ? "chipActive" : "chip"}
                onClick={() => {
                  setUseCustomRange(false);
                  setRange(key);
                }}
              >
                {key}
              </button>
            ))}
            <button
              type="button"
              className={useCustomRange ? "chipActive" : "chip"}
              onClick={() => setUseCustomRange(true)}
            >
              Custom
            </button>
          </div>
          {useCustomRange && (
            <div className="dateRangeRow">
              <label>
                <span className="filterLabel">From</span>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label>
                <span className="filterLabel">To</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={toDateInputValue(new Date())}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        <div className="filterGroup">
          <span className="filterLabel">Granularity</span>
          <div className="chips">
            {(["hour", "day"] as Granularity[]).map((key) => (
              <button
                key={key}
                type="button"
                className={granularity === key ? "chipActive" : "chip"}
                onClick={() => setGranularity(key)}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="filterGroup">
          <span className="filterLabel">Scope</span>
          <div className="chips">
            {(["all", "page", "blog"] as TrafficScope[]).map((key) => (
              <button
                key={key}
                type="button"
                className={trafficScope === key ? "chipActive" : "chip"}
                onClick={() => setTrafficScope(key)}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {trafficScope === "page" && (
          <div className="filterGroup filterGroupWide textField">
            <span className="filterLabel">Path</span>
            <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/pricing" />
            {path.trim() === "/blog" && (
              <label className="checkboxRow">
                <input
                  type="checkbox"
                  checked={includeBlogArticles}
                  onChange={(e) => setIncludeBlogArticles(e.target.checked)}
                />
                Include blog articles
              </label>
            )}
          </div>
        )}

        {trafficScope === "blog" && (
          <div className="filterGroup filterGroupWide textField">
            <span className="filterLabel">Content ID (optional)</span>
            <input
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              placeholder="Filter to a single article"
            />
          </div>
        )}
      </div>

      {isVisible("metrics") ? (
      <div className="metrics">
        <div className="metricCard">
          <Eye size={18} />
          <span className="metricValue">{formatNumber(summary.total_page_views)}</span>
          <span className="metricLabel">Page views</span>
          <Delta current={summary.total_page_views} previous={prev?.total_page_views} />
        </div>
        <div className="metricCard">
          <Users size={18} />
          <span className="metricValue">{formatNumber(summary.unique_visitors)}</span>
          <span className="metricLabel">Unique visitors</span>
          <Delta current={summary.unique_visitors} previous={prev?.unique_visitors} />
        </div>
        <div className="metricCard">
          <Repeat size={18} />
          <span className="metricValue">{formatNumber(summary.total_sessions)}</span>
          <span className="metricLabel">Sessions</span>
          <Delta current={summary.total_sessions} previous={prev?.total_sessions} />
        </div>
        <div className="metricCard">
          <FileText size={18} />
          <span className="metricValue">{summary.pages_per_session.toFixed(2)}</span>
          <span className="metricLabel">Pages / session</span>
        </div>
        <div className="metricCard">
          <UserPlus size={18} />
          <span className="metricValue">{formatNumber(summary.new_visitors)}</span>
          <span className="metricLabel">New visitors</span>
        </div>
        <div className="metricCard">
          <UserCheck size={18} />
          <span className="metricValue">{formatNumber(summary.returning_visitors)}</span>
          <span className="metricLabel">Returning visitors</span>
        </div>
        <div className="metricCard">
          <MousePointerClick size={18} />
          <span className="metricValue">{summary.bounce_rate}%</span>
          <span className="metricLabel">Bounce rate</span>
          <Delta current={summary.bounce_rate} previous={prev?.bounce_rate} />
        </div>
        <div className="metricCard">
          <Clock size={18} />
          <span className="metricValue">{summary.avg_engagement_seconds}s</span>
          <span className="metricLabel">Avg engagement</span>
          <Delta current={summary.avg_engagement_seconds} previous={prev?.avg_engagement_seconds} />
        </div>
      </div>
      ) : null}

      {isVisible("chart") ? (
      <div className="chartPanel">
        <div className="panelTitle">Traffic over time</div>
        <div className="chartContainer">
          {chartData.length === 0 ? (
            <p className="emptyState">No traffic recorded for this period.</p>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--ax-muted)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--ax-muted)" }} />
              <Tooltip
                contentStyle={{
                  background: "var(--ax-surface)",
                  border: "1px solid var(--ax-border)",
                  borderRadius: 10,
                  color: "var(--ax-primary)",
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                fill={areaFill}
                stroke={areaStroke}
                name="Page views"
              />
              <Line type="monotone" dataKey="uniques" stroke={lineStroke} name="Uniques" />
            </ComposedChart>
          </ResponsiveContainer>
          )}
        </div>
      </div>
      ) : null}

      {isVisible("top_paths") || isVisible("top_content") ? (
        <div className="splitPanels">
          {isVisible("top_paths") ? (
            <BreakdownPanel
              title="Top paths"
              emptyMessage="No path data for this period."
              rows={summary.top_paths.map((row) => ({
                key: row.path,
                label: row.path,
                value: `${formatNumber(row.views)} views · ${formatNumber(row.uniques)} uniques`,
              }))}
            />
          ) : null}
          {isVisible("top_content") ? (
            <BreakdownPanel
              title="Top content"
              emptyMessage="No content data for this period."
              rows={summary.top_content.map((row) => ({
                key: row.content_id || row.content_slug || row.content_title,
                label: row.content_title || row.content_slug || row.content_id,
                value: `${formatNumber(row.views)} views`,
              }))}
            />
          ) : null}
        </div>
      ) : null}

      {isVisible("landing_pages") || isVisible("referrers") || isVisible("channels") ? (
        <div className="splitPanels">
          {isVisible("landing_pages") ? (
            <BreakdownPanel
              title="Landing pages"
              emptyMessage="No landing page data for this period."
              rows={summary.landing_pages.map((row) => ({
                key: row.path,
                label: row.path,
                value: `${formatNumber(row.sessions)} sessions`,
              }))}
            />
          ) : null}
          {isVisible("referrers") ? (
            <BreakdownPanel
              title="Top referrers"
              emptyMessage="No referrer data for this period."
              rows={summary.referrer_breakdown.map((row) => ({
                key: row.referrer,
                label: row.referrer,
                value: formatNumber(row.count),
              }))}
            />
          ) : null}
          {isVisible("channels") ? (
            <BreakdownPanel
              title="Traffic channels"
              emptyMessage="No channel data for this period."
              rows={summary.channel_breakdown.map((row) => ({
                key: row.channel,
                label: row.channel,
                value: formatNumber(row.count),
              }))}
            />
          ) : null}
        </div>
      ) : null}

      {isVisible("utm") ? (
        <>
          <div className="splitPanels">
            <BreakdownPanel
              title="UTM source"
              emptyMessage="No UTM source data for this period."
              rows={summary.utm_source_breakdown.map((row) => ({
                key: row.source,
                label: row.source,
                value: formatNumber(row.count),
              }))}
            />
            <BreakdownPanel
              title="UTM medium"
              emptyMessage="No UTM medium data for this period."
              rows={summary.utm_medium_breakdown.map((row) => ({
                key: row.medium,
                label: row.medium,
                value: formatNumber(row.count),
              }))}
            />
          </div>
          <div className="splitPanels">
            <BreakdownPanel
              title="UTM campaign"
              emptyMessage="No UTM campaign data for this period."
              rows={summary.utm_campaign_breakdown.map((row) => ({
                key: row.campaign,
                label: row.campaign,
                value: formatNumber(row.count),
              }))}
            />
            <BreakdownPanel
              title="UTM term"
              emptyMessage="No UTM term data for this period."
              rows={summary.utm_term_breakdown.map((row) => ({
                key: row.term,
                label: row.term,
                value: formatNumber(row.count),
              }))}
            />
          </div>
          <BreakdownPanel
            title="UTM content"
            emptyMessage="No UTM content data for this period."
            rows={summary.utm_content_breakdown.map((row) => ({
              key: row.content,
              label: row.content,
              value: formatNumber(row.count),
            }))}
          />
        </>
      ) : null}

      {isVisible("geo") ? (
        <>
          <div className="splitPanels">
            <BreakdownPanel
              title="Countries"
              emptyMessage="No geo data for this period."
              rows={summary.country_breakdown.map((row) => ({
                key: row.country,
                label: row.country,
                value: formatNumber(row.count),
              }))}
            />
            <BreakdownPanel
              title="Regions"
              emptyMessage="No region data for this period."
              rows={summary.region_breakdown.map((row) => ({
                key: row.region,
                label: row.region,
                value: formatNumber(row.count),
              }))}
            />
          </div>
          <BreakdownPanel
            title="Languages"
            emptyMessage="No language data for this period."
            rows={summary.language_breakdown.map((row) => ({
              key: row.language,
              label: row.language,
              value: formatNumber(row.count),
            }))}
          />
        </>
      ) : null}

      {isVisible("devices") ? (
        <div className="splitPanels">
          <BreakdownPanel
            title="Devices"
            emptyMessage="No device data for this period."
            rows={summary.device_breakdown.map((row) => ({
              key: row.device_type,
              label: row.device_type,
              value: formatNumber(row.count),
            }))}
          />
          <BreakdownPanel
            title="Browsers"
            emptyMessage="No browser data for this period."
            rows={summary.browser_breakdown.map((row) => ({
              key: row.browser,
              label: row.browser,
              value: formatNumber(row.count),
            }))}
          />
        </div>
      ) : null}

      {isVisible("os") ? (
        <BreakdownPanel
          title="Operating systems"
          emptyMessage="No OS data for this period."
          rows={summary.os_breakdown.map((row) => ({
            key: row.os,
            label: row.os,
            value: formatNumber(row.count),
          }))}
        />
      ) : null}
    </div>
  );
}
