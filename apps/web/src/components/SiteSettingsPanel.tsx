"use client";

import { useEffect, useState } from "react";
import type {
  CollectionEventType,
  CollectionFieldGroup,
  CollectionProfile,
  DashboardWidgetId,
  SiteRecord,
} from "@analytix/core";
import {
  DASHBOARD_WIDGET_IDS,
  DASHBOARD_WIDGET_LABELS,
  DEFAULT_DASHBOARD_WIDGETS,
} from "@analytix/core";
import { CopyButton } from "./CopyButton";
import { useToast } from "./ToastProvider";

const EVENT_OPTIONS: CollectionEventType[] = [
  "page_view",
  "engagement",
  "scroll_depth",
  "outbound_click",
  "custom",
];

const FIELD_OPTIONS: CollectionFieldGroup[] = ["geo", "utm", "device", "performance", "content"];

function linesToArray(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function arrayToLines(values: string[]) {
  return values.join("\n");
}

function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function SiteSettingsPanel({
  site,
  collectUrl,
}: {
  site: Omit<SiteRecord, "api_secret">;
  collectUrl: string;
}) {
  const [name, setName] = useState(site.name);
  const [domain, setDomain] = useState(site.domain);
  const [allowedOrigins, setAllowedOrigins] = useState(arrayToLines(site.allowed_origins));
  const [excludePaths, setExcludePaths] = useState(arrayToLines(site.exclude_paths));
  const [retentionDays, setRetentionDays] = useState(String(site.retention_days));
  const [collectionProfile, setCollectionProfile] = useState<CollectionProfile>(
    site.analytics_config.collection_profile
  );
  const [enabledEvents, setEnabledEvents] = useState<CollectionEventType[]>(
    site.analytics_config.enabled_events
  );
  const [enabledFields, setEnabledFields] = useState<CollectionFieldGroup[]>(
    site.analytics_config.enabled_fields
  );
  const [sampleRate, setSampleRate] = useState(String(site.analytics_config.sample_rate));
  const [consentRequired, setConsentRequired] = useState(site.analytics_config.consent_required);
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidgetId[]>(
    site.analytics_config.dashboard_widgets
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [apiSecret, setApiSecret] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sites/${site.id}`, { credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((payload) => {
        if (!cancelled) setApiSecret(payload?.site?.api_secret ?? null);
      })
      .catch(() => {
        if (!cancelled) setApiSecret(null);
      });
    return () => {
      cancelled = true;
    };
  }, [site.id]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const retention = Number.parseInt(retentionDays, 10);
    const sample = Number.parseFloat(sampleRate);
    if (!Number.isFinite(retention) || retention < 30 || retention > 730) {
      setError("Retention must be between 30 and 730 days.");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(sample) || sample < 0 || sample > 1) {
      setError("Sample rate must be between 0 and 1.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          domain: domain.trim(),
          allowed_origins: linesToArray(allowedOrigins),
          exclude_paths: linesToArray(excludePaths),
          retention_days: retention,
          analytics_config: {
            collection_profile: collectionProfile,
            enabled_events: enabledEvents,
            enabled_fields: enabledFields,
            sample_rate: sample,
            consent_required: consentRequired,
            dashboard_widgets: dashboardWidgets,
          },
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to save settings");
      }

      toast("Settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card stack">
      <div>
        <h2 className="sectionTitle">Site settings</h2>
        <p className="sectionLead">Keys, origins, retention, and collection profile.</p>
      </div>

      <div className="settingsGrid">
        <div>
          <span className="fieldLabel">Collect endpoint</span>
          <div className="secretRow">
            <span>{collectUrl}</span>
            <CopyButton
              value={collectUrl}
              onCopied={() => toast("Collect URL copied")}
            />
          </div>
        </div>
        <div>
          <span className="fieldLabel">Config endpoint (SDK)</span>
          <div className="secretRow">
            <span>{collectUrl.replace("/collect", "/config")}</span>
            <CopyButton
              value={collectUrl.replace("/collect", "/config")}
              onCopied={() => toast("Config URL copied")}
            />
          </div>
        </div>
        <div>
          <span className="fieldLabel">Site key</span>
          <div className="secretRow">
            <span>{site.site_key}</span>
            <CopyButton
              value={site.site_key}
              onCopied={() => toast("Site key copied")}
            />
          </div>
        </div>
        <div>
          <span className="fieldLabel">API secret</span>
          <div className="secretRow">
            <span>{apiSecret ?? "Loading…"}</span>
            {apiSecret ? (
            <CopyButton
              value={apiSecret}
              onCopied={() => toast("API secret copied")}
            />
            ) : null}
          </div>
        </div>
      </div>

      <form className="stack" onSubmit={handleSave}>
        <div className="field">
          <label htmlFor="site-name">Site name</label>
          <input id="site-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="site-domain">Domain</label>
          <input
            id="site-domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="allowed-origins">Allowed origins (one per line)</label>
          <textarea
            id="allowed-origins"
            rows={4}
            value={allowedOrigins}
            onChange={(e) => setAllowedOrigins(e.target.value)}
            placeholder={"https://example.com\nhttps://www.example.com"}
          />
          <p style={{ margin: "6px 0 0", fontSize: "0.8125rem", color: "var(--muted)" }}>
            Browser SDK requests must match one of these origins. Leave blank on create to auto-add{" "}
            <code>https://your-domain</code>, <code>http://localhost:3000</code>, and{" "}
            <code>http://localhost:3001</code>. Server-side proxies (recommended) do not send{" "}
            <code>Origin</code> and are not blocked.
          </p>
        </div>

        <div className="field">
          <label htmlFor="exclude-paths">Exclude paths (one per line, supports * wildcards)</label>
          <textarea
            id="exclude-paths"
            rows={4}
            value={excludePaths}
            onChange={(e) => setExcludePaths(e.target.value)}
            placeholder={"/admin*\n/blog/preview*"}
          />
        </div>

        <div className="field">
          <label htmlFor="retention-days">Retention (days)</label>
          <input
            id="retention-days"
            type="number"
            min={30}
            max={730}
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
            required
          />
        </div>

        <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "8px 0" }} />

        <h3 className="sectionTitle" style={{ fontSize: "1.0625rem" }}>
          Collection profile
        </h3>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.875rem" }}>
          Controls what the SDK collects. Presets apply unless profile is set to custom.
        </p>

        <div className="field">
          <label htmlFor="collection-profile">Profile</label>
          <select
            id="collection-profile"
            value={collectionProfile}
            onChange={(e) => setCollectionProfile(e.target.value as CollectionProfile)}
          >
            <option value="minimal">Minimal — page views only</option>
            <option value="standard">Standard — page views + engagement + device</option>
            <option value="full">Full — all events and fields</option>
            <option value="custom">Custom — manual toggles below</option>
          </select>
        </div>

        {collectionProfile === "custom" ? (
          <>
            <div className="field">
              <span className="fieldLabel">Enabled events</span>
              <div className="checkboxGrid">
                {EVENT_OPTIONS.map((event) => (
                  <label key={event}>
                    <input
                      type="checkbox"
                      checked={enabledEvents.includes(event)}
                      onChange={() => setEnabledEvents(toggleInList(enabledEvents, event))}
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="fieldLabel">Enabled field groups</span>
              <div className="checkboxGrid">
                {FIELD_OPTIONS.map((field) => (
                  <label key={field}>
                    <input
                      type="checkbox"
                      checked={enabledFields.includes(field)}
                      onChange={() => setEnabledFields(toggleInList(enabledFields, field))}
                    />
                    {field}
                  </label>
                ))}
              </div>
            </div>
          </>
        ) : null}

        <div className="field">
          <label htmlFor="sample-rate">Sample rate (0–1)</label>
          <input
            id="sample-rate"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={sampleRate}
            onChange={(e) => setSampleRate(e.target.value)}
          />
        </div>

        <label className="checkboxRow">
          <input
            type="checkbox"
            checked={consentRequired}
            onChange={(e) => setConsentRequired(e.target.checked)}
          />
          Require consent before tracking (SDK waits for grantConsent())
        </label>

        <div className="field">
          <span className="fieldLabel">Default dashboard widgets</span>
          <div className="checkboxGrid">
            {DASHBOARD_WIDGET_IDS.map((widget) => (
              <label key={widget}>
                <input
                  type="checkbox"
                  checked={dashboardWidgets.includes(widget)}
                  onChange={() => setDashboardWidgets(toggleInList(dashboardWidgets, widget))}
                />
                {DASHBOARD_WIDGET_LABELS[widget]}
              </label>
            ))}
          </div>
          <button
            type="button"
            className="btnSecondary"
            onClick={() => setDashboardWidgets(DEFAULT_DASHBOARD_WIDGETS)}
          >
            Select all widgets
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>

      <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: 0, marginTop: 20 }}>
        Send the site key with <code>X-Analytix-Site-Key</code> when collecting events or fetching
        config. Use the API secret as a Bearer token for summary and export APIs.
      </p>
    </div>
  );
}
