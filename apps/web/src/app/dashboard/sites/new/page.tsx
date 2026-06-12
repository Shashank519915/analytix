"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";

export default function NewSitePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [allowedOrigins, setAllowedOrigins] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const origins = allowedOrigins
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          domain,
          allowed_origins: origins.length ? origins : undefined,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to create site");
      }

      router.push(`/dashboard/sites/${payload.site.id}?tab=integration`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create site");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Create site"
        subtitle="Add a domain and allowed origins for collection."
        actions={
          <Link className="btnSecondary" href="/dashboard">
            Cancel
          </Link>
        }
      />

      <div className="card">
        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Site name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marketing site"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="domain">Domain</label>
            <input
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="allowedOrigins">Allowed origins (one per line)</label>
            <textarea
              id="allowedOrigins"
              rows={4}
              value={allowedOrigins}
              onChange={(e) => setAllowedOrigins(e.target.value)}
              placeholder={"Leave blank to auto-add https://your-domain + localhost dev origins"}
            />
          </div>

          {error ? <p className="error">{error}</p> : null}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create site"}
          </button>
        </form>
      </div>
    </>
  );
}
