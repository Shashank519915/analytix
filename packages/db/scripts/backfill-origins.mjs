#!/usr/bin/env node
/**
 * Backfill empty allowed_origins on existing sites.
 *
 * Usage (from analytics/):
 *   npm run db:backfill-origins
 *
 * Optional env (analytics/.env.local):
 *   BACKFILL_EXTRA_ORIGINS=https://other.netlify.app,http://localhost:3002
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";
import { buildDefaultAllowedOrigins, parseExtraOriginsEnv } from "./lib/origins.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const root = join(__dirname, "..", "..", "..");
  for (const file of [".env.local", ".env"]) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
    return;
  }
}

function parseExtraOrigins() {
  return parseExtraOriginsEnv();
}

async function main() {
  loadEnvFile();

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required (set in analytics/.env.local)");
    process.exit(1);
  }

  const extra = parseExtraOrigins();
  const sql = neon(url);

  const sites = await sql`
    SELECT id, name, domain, allowed_origins
    FROM sites
    ORDER BY created_at ASC
  `;

  if (sites.length === 0) {
    console.log("No sites in database.");
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const site of sites) {
    const current = site.allowed_origins ?? [];
    const origins = Array.isArray(current) ? current : [];

    if (origins.length > 0) {
      console.log(`Skip ${site.name} (${site.domain}) — ${origins.length} origin(s) already set`);
      console.log(`  ${origins.join(", ")}`);
      skipped += 1;
      continue;
    }

    const next = buildDefaultAllowedOrigins(site.domain, extra);
    await sql`
      UPDATE sites
      SET allowed_origins = ${JSON.stringify(next)}::jsonb
      WHERE id = ${site.id}::uuid
    `;

    console.log(`Updated ${site.name} (${site.domain}):`);
    for (const origin of next) console.log(`  + ${origin}`);
    updated += 1;
  }

  console.log(`\nDone. Updated ${updated}, skipped ${skipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
