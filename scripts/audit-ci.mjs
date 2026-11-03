#!/usr/bin/env node
// Blocking dependency audit for CI and local use (S0094, jord-F0019).
//
// Runs `pnpm audit --prod --audit-level=high --json`, drops advisories that
// are covered by a live entry in security/audit-allowlist.json, and fails on:
//   - any remaining high/critical advisory,
//   - any allowlist entry whose `expires` date is in the past,
//   - any malformed allowlist entry (malformed entries never suppress anything),
//   - a registry/network failure (reported distinctly from vulnerabilities).
//
// Pure helpers are exported for tests. No dependencies beyond Node itself.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const FAIL_SEVERITIES = new Set(["high", "critical"]);
export const MAX_EXPIRY_DAYS = 90;
const GHSA_RE = /^GHSA(-[23456789cfghjmpqrvwx]{4}){3}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NETWORK_RE =
  /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH|fetch failed|socket hang up|network/i;

export function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function daysBetween(fromDate, toDate) {
  const ms = Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

// Returns true when `expires` (YYYY-MM-DD) is strictly before `today`.
// An entry expiring today is still live.
export function isExpired(expires, today) {
  return expires < today;
}

function extractGhsa(url) {
  const m = typeof url === "string" ? url.match(/GHSA(?:-[a-z0-9]{4}){3}/i) : null;
  return m ? m[0].toUpperCase() : null;
}

function normalizeAdvisory(key, raw) {
  const id = String(raw.id ?? key);
  const ghsa = raw.github_advisory_id ?? extractGhsa(raw.url) ?? null;
  const cves = Array.isArray(raw.cves) ? raw.cves.map(String) : [];
  return {
    id,
    ghsa: ghsa ? String(ghsa).toUpperCase() : null,
    cves,
    package: String(raw.module_name ?? "(unknown)"),
    severity: String(raw.severity ?? "unknown").toLowerCase(),
    title: String(raw.title ?? ""),
    url: String(raw.url ?? ""),
    vulnerableVersions: String(raw.vulnerable_versions ?? ""),
  };
}

// Parses the stdout of `pnpm audit --json`.
// Returns { ok: true, advisories, reportedBlocking } or
// { ok: false, reason: "empty" | "invalid-json" | "api-error", message }.
export function parseAuditReport(stdout) {
  const text = String(stdout ?? "").trim();
  if (!text) return { ok: false, reason: "empty", message: "empty output" };

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, reason: "invalid-json", message: "output is not JSON" };
  }
  if (!json || typeof json !== "object") {
    return { ok: false, reason: "invalid-json", message: "output is not a JSON object" };
  }
  if (json.error) {
    const e = json.error;
    const message = [e.code, e.summary, e.detail].filter(Boolean).join(" | ") || "registry error";
    return { ok: false, reason: "api-error", message };
  }

  const advisories = [];
  const src = json.advisories && typeof json.advisories === "object" ? json.advisories : {};
  for (const [key, raw] of Object.entries(src)) {
    if (raw && typeof raw === "object") advisories.push(normalizeAdvisory(key, raw));
  }

  const v = json.metadata?.vulnerabilities ?? {};
  const reportedBlocking = (Number(v.high) || 0) + (Number(v.critical) || 0);
  return { ok: true, advisories, reportedBlocking };
}

// Classifies a failed pnpm run that produced no usable report.
export function classifyFailure(stderr) {
  return NETWORK_RE.test(String(stderr ?? "")) ? "network" : "audit-error";
}

// Validates raw allowlist JSON. Returns { entries, errors }.
// Malformed entries are excluded from `entries` so they can never suppress.
export function validateAllowlist(raw, today) {
  const errors = [];
  const entries = [];
  if (!Array.isArray(raw)) {
    return { entries, errors: ["allowlist must be a JSON array"] };
  }
  raw.forEach((item, i) => {
    const where = `entry #${i + 1}`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${where}: not an object`);
      return;
    }
    const problems = [];
    const { package: pkg, advisory, reason, expires } = item;
    if (typeof pkg !== "string" || pkg.trim() === "") problems.push("package is required");
    if (typeof advisory !== "string" || advisory.trim() === "") {
      problems.push("advisory is required (GHSA id or advisory number as a string)");
    } else if (!GHSA_RE.test(advisory.trim()) && !/^\d+$/.test(advisory.trim())) {
      problems.push(`advisory "${advisory}" is not a GHSA id or numeric advisory`);
    }
    if (typeof reason !== "string" || reason.trim().length < 10) {
      problems.push("reason is required (at least 10 characters)");
    }
    if (typeof expires !== "string" || !DATE_RE.test(expires) || Number.isNaN(Date.parse(`${expires}T00:00:00Z`))) {
      problems.push("expires is required as YYYY-MM-DD");
    } else if (today && daysBetween(today, expires) > MAX_EXPIRY_DAYS) {
      problems.push(`expires is more than ${MAX_EXPIRY_DAYS} days after today`);
    }
    if (problems.length) {
      errors.push(`${where} (${pkg ?? "?"} ${advisory ?? "?"}): ${problems.join("; ")}`);
      return;
    }
    entries.push({
      package: pkg.trim(),
      advisory: advisory.trim().toUpperCase(),
      reason: reason.trim(),
      expires,
    });
  });
  return { entries, errors };
}

function advisoryMatches(entry, adv) {
  if (entry.package !== adv.package) return false;
  const ids = [adv.id, adv.ghsa, ...adv.cves].filter(Boolean).map((x) => String(x).toUpperCase());
  return ids.includes(entry.advisory);
}

// Core policy. Pure: no I/O.
// Returns { pass, blocking, suppressed, expired, ignored, unreadable, malformed }.
export function evaluateAudit({ advisories, reportedBlocking = 0, allowlist, malformed = [], today }) {
  const live = allowlist.filter((e) => !isExpired(e.expires, today));
  const expired = allowlist.filter((e) => isExpired(e.expires, today));

  const blocking = [];
  const suppressed = [];
  let ignored = 0;
  for (const adv of advisories) {
    if (!FAIL_SEVERITIES.has(adv.severity)) {
      ignored += 1;
      continue;
    }
    const entry = live.find((e) => advisoryMatches(e, adv));
    if (entry) suppressed.push({ advisory: adv, entry });
    else blocking.push(adv);
  }

  // The report says there are high/critical findings we could not read.
  const parsedBlocking = advisories.filter((a) => FAIL_SEVERITIES.has(a.severity)).length;
  const unreadable = Math.max(0, reportedBlocking - parsedBlocking);

  const pass =
    blocking.length === 0 && expired.length === 0 && malformed.length === 0 && unreadable === 0;
  return { pass, blocking, suppressed, expired, ignored, unreadable, malformed };
}

function readAllowlist(path, today) {
  if (!existsSync(path)) {
    return { entries: [], errors: [`allowlist file not found: ${path}`] };
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    return { entries: [], errors: [`allowlist is not valid JSON: ${err.message}`] };
  }
  return validateAllowlist(raw, today);
}

function runPnpmAudit(cwd) {
  const args = ["audit", "--prod", "--audit-level=high", "--json"];
  const opts = { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 };
  // Under `pnpm audit:ci`, npm_execpath points at pnpm's JS entry: run it with
  // node directly (no shell, works on Windows where pnpm is pnpm.cmd).
  const execpath = process.env.npm_execpath;
  if (execpath && /pnpm/i.test(execpath) && /\.[cm]?js$/i.test(execpath)) {
    return spawnSync(process.execPath, [execpath, ...args], opts);
  }
  return spawnSync("pnpm", args, { ...opts, shell: process.platform === "win32" });
}

function formatSummary(result, counts) {
  const lines = [];
  lines.push(
    `pnpm audit (prod, high+): ${counts.total} advisories ` +
      `(critical ${counts.critical}, high ${counts.high}, below high ${result.ignored})`,
  );
  for (const { advisory, entry } of result.suppressed) {
    lines.push(`  allowed  ${advisory.package} ${advisory.id} (until ${entry.expires}): ${entry.reason}`);
  }
  for (const adv of result.blocking) {
    const ref = adv.ghsa ?? adv.id;
    lines.push(`  FAIL     [${adv.severity}] ${adv.package} ${ref} - ${adv.title}`);
    if (adv.url) lines.push(`           ${adv.url}`);
  }
  for (const e of result.expired) {
    lines.push(`  FAIL     expired allowlist entry: ${e.package} ${e.advisory} expired ${e.expires}`);
  }
  for (const m of result.malformed) {
    lines.push(`  FAIL     malformed allowlist ${m}`);
  }
  if (result.unreadable > 0) {
    lines.push(`  FAIL     ${result.unreadable} high/critical advisories reported but not readable`);
  }
  lines.push(result.pass ? "audit:ci PASS" : "audit:ci FAIL");
  return lines.join("\n");
}

// One-line failure. Network failures are labelled so they are never read as
// vulnerability findings.
function failLine(kind, detail) {
  if (kind === "network") {
    console.error(
      `audit:ci FAIL (NETWORK): could not reach the npm registry via pnpm audit (not a vulnerability finding): ${detail}`,
    );
  } else {
    console.error(`audit:ci FAIL (AUDIT ERROR): pnpm audit gave no usable report: ${detail}`);
  }
  return 1;
}

export function main({ root = resolve(dirname(fileURLToPath(import.meta.url)), ".."), today = todayUtc() } = {}) {
  const allowlistPath = resolve(root, "security", "audit-allowlist.json");
  const { entries, errors } = readAllowlist(allowlistPath, today);

  const run = runPnpmAudit(root);
  if (run.error) return failLine("audit-error", `could not start pnpm (${run.error.message})`);

  let parsed = parseAuditReport(run.stdout);
  if (!parsed.ok) {
    if (parsed.reason === "api-error") {
      return failLine(NETWORK_RE.test(parsed.message) ? "network" : "audit-error", parsed.message);
    }
    // Empty or non-JSON stdout: fall back to pnpm's exit code.
    if (run.status !== 0) {
      const first = String(run.stderr ?? "").trim().split(/\r?\n/)[0] || `exit ${run.status}`;
      return failLine(classifyFailure(run.stderr), first);
    }
    console.warn("audit:ci WARN: pnpm audit exited 0 without a JSON report; treating as clean.");
    parsed = { ok: true, advisories: [], reportedBlocking: 0 };
  }

  const result = evaluateAudit({
    advisories: parsed.advisories,
    reportedBlocking: parsed.reportedBlocking,
    allowlist: entries,
    malformed: errors,
    today,
  });

  const counts = {
    total: result.blocking.length + result.suppressed.length + result.ignored,
    critical: 0,
    high: 0,
  };
  for (const adv of [...result.blocking, ...result.suppressed.map((s) => s.advisory)]) {
    if (adv.severity === "critical") counts.critical += 1;
    else if (adv.severity === "high") counts.high += 1;
  }
  console.log(formatSummary(result, counts));
  return result.pass ? 0 : 1;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  process.exitCode = main();
}
