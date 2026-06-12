#!/usr/bin/env node
/**
 * Build and publish client packages to GitHub Packages.
 * Requires: GITHUB_TOKEN (classic PAT with write:packages) or NODE_AUTH_TOKEN
 * Requires: scope already configured via configure-github-scope.mjs
 */
import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const order = ["packages/core", "packages/react", "packages/dashboard"];

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Building packages...");
run("npm", ["run", "build:packages"], root);

for (const dir of order) {
  const pkgPath = join(root, dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  console.log(`\nPublishing ${pkg.name}@${pkg.version}...`);
  run("npm", ["publish"], join(root, dir));
}

console.log("\nAll packages published to GitHub Packages.");
