#!/usr/bin/env node
/**
 * Build and publish client packages to the public npm registry (registry.npmjs.org).
 *
 * Skips packages whose exact version is already on npm (safe to re-run after partial publish).
 *
 * Requires: npm login OR NPM_TOKEN with publish access to @analytix scope
 *   npm login
 *   # or: export NPM_TOKEN=npm_... (automation token)
 *
 * Publish one package only:
 *   npm publish --access public -w @analytix/react
 */
import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const order = ["packages/core", "packages/react", "packages/dashboard", "packages/tracker"];
const registry = "https://registry.npmjs.org";

function run(cmd, args, cwd, inherit = true) {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: inherit ? "inherit" : "pipe",
    shell: true,
    encoding: "utf8",
  });
  if (inherit && result.status !== 0) process.exit(result.status ?? 1);
  return result;
}

function isPublished(name, version) {
  const result = run(
    "npm",
    ["view", `${name}@${version}`, "version", `--registry=${registry}`],
    root,
    false
  );
  return result.status === 0 && result.stdout?.trim() === version;
}

console.log("Building packages...");
run("npm", ["run", "build:packages"], root);

let published = 0;
let skipped = 0;

for (const dir of order) {
  const pkgPath = join(root, dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

  if (isPublished(pkg.name, pkg.version)) {
    console.log(`\nSkip ${pkg.name}@${pkg.version} — already on npmjs`);
    skipped += 1;
    continue;
  }

  console.log(`\nPublishing ${pkg.name}@${pkg.version} to npmjs...`);
  run("npm", ["publish", "--access", "public"], join(root, dir));
  published += 1;
}

console.log(
  `\nDone. Published ${published}, skipped ${skipped}. https://www.npmjs.com/org/analytix`
);
