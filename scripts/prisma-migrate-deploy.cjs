#!/usr/bin/env node
/**
 * Production-safe migrate deploy with recovery for a known failed-but-unapplied
 * migration (UTF-8 BOM in 20260806010000_usage_events). Safe to keep: only
 * rolls back that specific migration name when Prisma reports P3018 for it.
 */
const { spawnSync } = require("child_process");

const FAILED = "20260806010000_usage_events";

function run(args) {
  const result = spawnSync("npx", ["prisma", ...args], {
    encoding: "utf8",
    shell: true,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}

let result = run(["migrate", "deploy"]);
if (result.status === 0) {
  process.exit(0);
}

const blob = `${result.stdout || ""}\n${result.stderr || ""}`;
const isTargetFailure = blob.includes("P3018") && blob.includes(FAILED);

if (!isTargetFailure) {
  process.exit(result.status || 1);
}

console.error(
  `[migrate] Recovering failed unapplied migration ${FAILED} (BOM syntax error), then retrying deploy…`,
);
const resolve = run(["migrate", "resolve", "--rolled-back", FAILED]);
if (resolve.status !== 0) {
  process.exit(resolve.status || 1);
}

result = run(["migrate", "deploy"]);
process.exit(result.status || 0);
