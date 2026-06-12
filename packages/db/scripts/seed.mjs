import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

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

async function seed() {
  loadEnvFile();

  const { createAccount } = await import("../dist/accounts.js");
  const { createSite } = await import("../dist/sites.js");
  const { getAccountByEmail } = await import("../dist/accounts.js");

  const email = process.env.SEED_EMAIL ?? "admin@analytix.local";
  const password = process.env.SEED_PASSWORD ?? "changeme123";
  const siteName = process.env.SEED_SITE_NAME ?? "BlueMint Services";
  const siteDomain = process.env.SEED_SITE_DOMAIN ?? "bluemint.services";

  let account = await getAccountByEmail(email);
  if (!account) {
    account = await createAccount(email, password, "Admin");
    console.log("Created account:", email);
  } else {
    console.log("Account exists:", email);
  }

  const { listSitesForAccount } = await import("../dist/sites.js");
  const existing = await listSitesForAccount(account.id);
  if (existing.length > 0) {
    console.log("\nExisting site:");
    console.log("  site_key:", existing[0].site_key);
    console.log("  api_secret:", existing[0].api_secret);
    return;
  }

  const site = await createSite(account.id, {
    name: siteName,
    domain: siteDomain,
    exclude_paths: ["/admin*", "/blog/preview*"],
    allowed_origins: ["http://localhost:3000", "http://localhost:3002", "https://bluemint.services"],
  });

  console.log("\nSite created:");
  console.log("  id:", site.id);
  console.log("  site_key (public):", site.site_key);
  console.log("  api_secret (server):", site.api_secret);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
