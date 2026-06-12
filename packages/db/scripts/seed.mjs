import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { randomBytes, scryptSync } from "crypto";
import { neon } from "@neondatabase/serverless";

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

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function generateSiteKey() {
  return `sk_live_${randomBytes(24).toString("hex")}`;
}

function generateApiSecret() {
  return `sk_secret_${randomBytes(32).toString("hex")}`;
}

function normalizeDomain(domain) {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

async function seed() {
  loadEnvFile();

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required (set in analytics/.env.local)");
    process.exit(1);
  }

  const sql = neon(url);
  const email = process.env.SEED_EMAIL ?? "admin@analytix.local";
  const password = process.env.SEED_PASSWORD ?? "changeme123";
  const siteName = process.env.SEED_SITE_NAME ?? "BlueMint Services";
  const siteDomain = normalizeDomain(process.env.SEED_SITE_DOMAIN ?? "bluemint.services");
  const allowedOrigins = JSON.stringify([
    "http://localhost:3000",
    "http://localhost:3002",
    `https://${siteDomain}`,
    `http://${siteDomain}`,
  ]);
  const excludePaths = JSON.stringify(["/admin*", "/blog/preview*"]);

  let accountRows = await sql`SELECT id, email FROM accounts WHERE email = ${email} LIMIT 1`;
  let accountId = accountRows[0]?.id;

  if (!accountId) {
    const created = await sql`
      INSERT INTO accounts (email, password_hash, name)
      VALUES (${email}, ${hashPassword(password)}, ${"Admin"})
      RETURNING id, email
    `;
    accountId = created[0].id;
    console.log("Created account:", email);
  } else {
    console.log("Account exists:", email);
  }

  const existingSites = await sql`
    SELECT id, site_key, api_secret FROM sites WHERE account_id = ${accountId}::uuid LIMIT 1
  `;

  if (existingSites.length > 0) {
    console.log("\nExisting site:");
    console.log("  id:", existingSites[0].id);
    console.log("  site_key:", existingSites[0].site_key);
    console.log("  api_secret:", existingSites[0].api_secret);
    return;
  }

  const siteKey = generateSiteKey();
  const apiSecret = generateApiSecret();

  const siteRows = await sql`
    INSERT INTO sites (account_id, name, domain, site_key, api_secret, exclude_paths, allowed_origins)
    VALUES (
      ${accountId}::uuid,
      ${siteName},
      ${siteDomain},
      ${siteKey},
      ${apiSecret},
      ${excludePaths}::jsonb,
      ${allowedOrigins}::jsonb
    )
    RETURNING id, site_key, api_secret
  `;

  console.log("\nSite created:");
  console.log("  id:", siteRows[0].id);
  console.log("  site_key (public):", siteRows[0].site_key);
  console.log("  api_secret (server):", siteRows[0].api_secret);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
