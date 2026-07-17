#!/usr/bin/env node
/**
 * Measure TTFB / total time for hot routes.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 npm run perf:routes
 *   BASE_URL=https://your-deploy.example npm run perf:routes
 *   SPORT=AMERICAN_FOOTBALL npm run perf:routes
 */

import { spawnSync } from "node:child_process";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SPORT = process.env.SPORT ?? "SOCCER";

const ROUTES = [
  "/dashboard",
  "/players",
  "/scouting",
  "/teams",
  "/tournaments/nba",
  "/tournaments/nfl",
  "/tournaments/college-football",
];

function measure(path) {
  const url = `${BASE_URL}${path}`;
  const result = spawnSync(
    "curl",
    [
      "-sS",
      "-D",
      "-",
      "-o",
      "/dev/null",
      "-w",
      "\n__METRICS__%{http_code}\t%{time_starttransfer}\t%{time_total}\t%{size_download}",
      "-H",
      `Cookie: fip-sport=${SPORT}`,
      "-H",
      "Accept: text/html",
      url,
    ],
    { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 }
  );

  if (result.error) {
    return { path, ok: false, error: result.error.message };
  }
  if (result.status !== 0) {
    return { path, ok: false, error: result.stderr?.trim() || `curl exit ${result.status}` };
  }

  const raw = result.stdout;
  const marker = raw.lastIndexOf("__METRICS__");
  if (marker < 0) {
    return { path, ok: false, error: "unexpected curl output" };
  }

  const headerBlock = raw.slice(0, marker);
  const [status, ttfb, total, size] = raw.slice(marker + "__METRICS__".length).trim().split("\t");
  const cacheLine = headerBlock
    .split(/\r?\n/)
    .find((line) => /^cache-control:/i.test(line));
  const cacheControl = cacheLine ? cacheLine.replace(/^cache-control:\s*/i, "").trim() : "—";

  const code = Number(status);
  return {
    path,
    ok: code >= 200 && code < 400,
    status: code,
    ttfbMs: Math.round(Number(ttfb) * 1000),
    totalMs: Math.round(Number(total) * 1000),
    bytes: Number(size),
    cacheControl,
  };
}

console.log(`BASE_URL=${BASE_URL}  SPORT=${SPORT}\n`);
console.log(
  [
    "route".padEnd(32),
    "status".padStart(6),
    "ttfb".padStart(8),
    "total".padStart(8),
    "bytes".padStart(10),
    "cache-control",
  ].join("  ")
);
console.log("-".repeat(100));

let failed = 0;
for (const path of ROUTES) {
  const row = measure(path);
  if (!row.ok) {
    failed += 1;
    console.log(`${path.padEnd(32)}  FAIL  ${row.error ?? row.status}`);
    continue;
  }
  console.log(
    [
      path.padEnd(32),
      String(row.status).padStart(6),
      `${row.ttfbMs}ms`.padStart(8),
      `${row.totalMs}ms`.padStart(8),
      String(row.bytes).padStart(10),
      row.cacheControl,
    ].join("  ")
  );
}

if (failed > 0) {
  console.error(`\n${failed} route(s) failed.`);
  process.exit(1);
}

console.log("\nTip: hubs (/tournaments/*) should show s-maxage=180 after deploy with Phase 3 headers.");
