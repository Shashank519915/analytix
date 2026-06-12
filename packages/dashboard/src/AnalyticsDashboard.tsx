"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalyticsSummary } from "@analytix/core";
import { percentChange } from "@analytix/core";
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
import { Download, Eye, Users, Clock, MousePointerClick } from "lucide-react";

type RangeKey = "24h" | "7d" | "30d" | "90d";
type Granularity = "hour" | "day";
type TrafficScope = "all" | "page" | "blog";

export interface AnalyticsDashboardProps {
  siteId: string;
  summaryEndpoint?: string;
  exportEndpoint?: string;
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

export function AnalyticsDashboard({
  siteId,
  summaryEndpoint,
  exportEndpoint,
}: AnalyticsDashboardProps) {
  const summaryUrl = summaryEndpoint ?? `/api/v1/sites/${siteId}/summary`;
  const exportUrl = exportEndpoint ?? `/api/v1/sites/${siteId}/export`;

  const [range, setRange] = useState<RangeKey>("7d");
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [trafficScope, setTrafficScope] = useState<TrafficScope>("all");
  const [path, setPath] = useState("");
  const [contentId, setContentId] = useState("");
  const [includeBlogArticles, setIncludeBlogArticles] = useState(false);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filterParams = useMemo(() => {
    const params = new URLSearchParams({
      range,
      granularity,
      compare: "1",
    });

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
  }, [range, granularity, trafficScope, path, contentId, includeBlogArticles]);

  useEffect(() => {
    setLoading(true);
    setError("");

    fetch(`${summaryUrl}?${filterParams.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error ?? "Failed to load analytics");
        }
        return res.json();
      })
      .then((payload) => setSummary(payload.summary ?? payload))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [summaryUrl, filterParams]);

  const chartData = useMemo(
    () =>
      (summary?.buckets ?? []).map((bucket) => ({
        label: formatBucketLabel(bucket.bucket_start, granularity),
        views: bucket.page_views,
        uniques: bucket.unique_visitors,
      })),
    [summary, granularity]
  );

  if (loading) {
    return <div className="analytix-dash">Loading analytics…</div>;
  }

  if (error) {
    return (
      <div className="analytix-dash">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="analytix-dash">
        <p>No analytics data yet.</p>
      </div>
    );
  }

  const prev = summary.previous_period;

  return (
    <div className="analytix-dash">
      <div className="toolbar">
        <span className="realtime">{summary.realtime_visitors} visitors in the last 15 minutes</span>
        <a className="btn" href={`${exportUrl}?${filterParams.toString()}`}>
          <Download size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
          Export CSV
        </a>
      </div>

      <div className="filters">
        <div className="filterGroup">
          <span className="filterLabel">Range</span>
          <div className="chips">
            {(["24h", "7d", "30d", "90d"] as RangeKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className={range === key ? "chipActive" : "chip"}
                onClick={() => setRange(key)}
              >
                {key}
              </button>
            ))}
          </div>
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
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/pricing"
            />
            {path.trim() === "/blog" && (
              <label>
                <input
                  type="checkbox"
                  checked={includeBlogArticles}
                  onChange={(e) => setIncludeBlogArticles(e.target.checked)}
                />{" "}
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
          <MousePointerClick size={18} />
          <span className="metricValue">{summary.bounce_rate}%</span>
          <span className="metricLabel">Bounce rate</span>
          <Delta current={summary.bounce_rate} previous={prev?.bounce_rate} />
        </div>
        <div className="metricCard">
          <Clock size={18} />
          <span className="metricValue">{summary.avg_engagement_seconds}s</span>
          <span className="metricLabel">Avg engagement</span>
          <Delta
            current={summary.avg_engagement_seconds}
            previous={prev?.avg_engagement_seconds}
          />
        </div>
      </div>

      <div className="chartPanel">
        <div className="panelTitle">Traffic over time</div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="views"
                fill="rgba(0,82,255,0.12)"
                stroke="#0052ff"
                name="Page views"
              />
              <Line type="monotone" dataKey="uniques" stroke="#059669" name="Uniques" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="splitPanels">
        <div className="chartPanel">
          <div className="panelTitle">Top paths</div>
          <ul className="list">
            {summary.top_paths.map((row) => (
              <li key={row.path}>
                <span>{row.path}</span>
                <span>
                  {row.views} views · {row.uniques} uniques
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="chartPanel">
          <div className="panelTitle">Top referrers</div>
          <ul className="list">
            {summary.referrer_breakdown.map((row) => (
              <li key={row.referrer}>
                <span>{row.referrer}</span>
                <span>{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="splitPanels">
        <div className="chartPanel">
          <div className="panelTitle">Devices</div>
          <ul className="list">
            {summary.device_breakdown.map((row) => (
              <li key={row.device_type}>
                <span>{row.device_type}</span>
                <span>{row.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="chartPanel">
          <div className="panelTitle">Browsers</div>
          <ul className="list">
            {summary.browser_breakdown.map((row) => (
              <li key={row.browser}>
                <span>{row.browser}</span>
                <span>{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
