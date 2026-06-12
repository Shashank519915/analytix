"use client";

import { useState } from "react";
import type { SiteRecord } from "@Shashank519915/analytix-core";
import { CopyButton } from "./CopyButton";

function linesToArray(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function arrayToLines(values: string[]) {
  return values.join("\n");
}

export function SiteSettingsPanel({
  site,
  collectUrl,
}: {
  site: SiteRecord;
  collectUrl: string;
}) {
  const [name, setName] = useState(site.name);
  const [domain, setDomain] = useState(site.domain);
  const [allowedOrigins, setAllowedOrigins] = useState(arrayToLines(site.allowed_origins));
  const [excludePaths, setExcludePaths] = useState(arrayToLines(site.exclude_paths));
  const [retentionDays, setRetentionDays] = useState(String(site.retention_days));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const retention = Number.parseInt(retentionDays, 10);
    if (!Number.isFinite(retention) || retention < 30 || retention > 730) {
      setError("Retention must be between 30 and 730 days.");
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
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to save settings");
      }

      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2 style={{ marginTop: 0 }}>Site settings</h2>

      <div className="settingsGrid" style={{ marginBottom: 20 }}>
        <div>
          <strong>Collect endpoint</strong>
          <div className="secretRow">
            <span>{collectUrl}</span>
            <CopyButton value={collectUrl} />
          </div>
        </div>
        <div>
          <strong>Site key</strong>
          <div className="secretRow">
            <span>{site.site_key}</span>
            <CopyButton value={site.site_key} />
          </div>
        </div>
        <div>
          <strong>API secret</strong>
          <div className="secretRow">
            <span>{site.api_secret}</span>
            <CopyButton value={site.api_secret} />
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

        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="success">{message}</p> : null}

        <div>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>

      <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: 0, marginTop: 20 }}>
        Send the site key with <code>X-Analytix-Site-Key</code> when collecting events. Use the API
        secret as a Bearer token for summary and export APIs.
      </p>
    </div>
  );
}
