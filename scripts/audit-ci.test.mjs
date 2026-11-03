// Unit tests for the pure policy functions in audit-ci.mjs.
// Run: node --test scripts/audit-ci.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyFailure,
  evaluateAudit,
  isExpired,
  parseAuditReport,
  validateAllowlist,
} from "./audit-ci.mjs";

const TODAY = "2026-11-03";

const adv = (overrides = {}) => ({
  id: "1124252",
  ghsa: "GHSA-6G55-P6WH-862Q",
  cves: [],
  package: "postcss",
  severity: "high",
  title: "PostCSS: arbitrary file read",
  url: "https://github.com/advisories/GHSA-6g55-p6wh-862q",
  vulnerableVersions: "<8.5.10",
  ...overrides,
});

const goodEntry = (overrides = {}) => ({
  package: "postcss",
  advisory: "GHSA-6G55-P6WH-862Q",
  reason: "Only reachable through build-time tooling; remove on next Next.js bump.",
  expires: "2027-01-31",
  ...overrides,
});

test("expired allowlist entry fails the gate even with no matching advisory", () => {
  const { entries, errors } = validateAllowlist(
    [goodEntry({ expires: "2026-10-01" })],
    TODAY,
  );
  assert.deepEqual(errors, []);
  assert.equal(entries.length, 1);
  const result = evaluateAudit({ advisories: [], allowlist: entries, today: TODAY });
  assert.equal(result.pass, false);
  assert.equal(result.expired.length, 1);
  assert.equal(result.expired[0].expires, "2026-10-01");
});

test("expired entry does not suppress its advisory, so the high finding also blocks", () => {
  const { entries } = validateAllowlist([goodEntry({ expires: "2026-10-01" })], TODAY);
  const result = evaluateAudit({ advisories: [adv()], allowlist: entries, today: TODAY });
  assert.equal(result.pass, false);
  assert.equal(result.blocking.length, 1);
  assert.equal(result.suppressed.length, 0);
});

test("active allowlist entry suppresses a matching high advisory (by GHSA or number)", () => {
  const { entries } = validateAllowlist([goodEntry()], TODAY);
  const byGhsa = evaluateAudit({ advisories: [adv()], allowlist: entries, today: TODAY });
  assert.equal(byGhsa.pass, true);
  assert.equal(byGhsa.suppressed.length, 1);

  const byNumber = validateAllowlist([goodEntry({ advisory: "1124252" })], TODAY).entries;
  const res = evaluateAudit({ advisories: [adv()], allowlist: byNumber, today: TODAY });
  assert.equal(res.pass, true);
});

test("entry expiring today is still live", () => {
  assert.equal(isExpired(TODAY, TODAY), false);
  assert.equal(isExpired("2026-11-02", TODAY), true);
});

test("unlisted high or critical advisory fails", () => {
  const result = evaluateAudit({
    advisories: [adv({ severity: "critical", package: "next" })],
    allowlist: [],
    today: TODAY,
  });
  assert.equal(result.pass, false);
  assert.equal(result.blocking[0].package, "next");
});

test("an allowlist entry for a different package does not suppress", () => {
  const { entries } = validateAllowlist([goodEntry({ package: "sharp" })], TODAY);
  const result = evaluateAudit({ advisories: [adv()], allowlist: entries, today: TODAY });
  assert.equal(result.pass, false);
});

test("low and moderate advisories are ignored", () => {
  const result = evaluateAudit({
    advisories: [adv({ severity: "moderate" }), adv({ severity: "low", id: "9" })],
    allowlist: [],
    today: TODAY,
  });
  assert.equal(result.pass, true);
  assert.equal(result.ignored, 2);
  assert.equal(result.blocking.length, 0);
});

test("malformed allowlist entries are rejected and never suppress", () => {
  const raw = [
    goodEntry({ reason: "short" }), // reason too short
    goodEntry({ expires: "2027-02-30" }), // impossible date
    goodEntry({ expires: "2027-06-01" }), // more than 90 days out
    { package: "postcss", advisory: "GHSA-6G55-P6WH-862Q", expires: "2027-01-31" }, // no reason
    goodEntry({ advisory: "not-an-id" }),
    "postcss",
  ];
  const { entries, errors } = validateAllowlist(raw, TODAY);
  assert.equal(entries.length, 0);
  assert.equal(errors.length, 6);

  const result = evaluateAudit({
    advisories: [adv()],
    allowlist: entries,
    malformed: errors,
    today: TODAY,
  });
  assert.equal(result.pass, false);
  assert.equal(result.blocking.length, 1);
});

test("allowlist that is not an array is rejected", () => {
  const { entries, errors } = validateAllowlist({ postcss: goodEntry() }, TODAY);
  assert.equal(entries.length, 0);
  assert.equal(errors.length, 1);
});

test("parseAuditReport reads the pnpm advisories map and counts", () => {
  const stdout = JSON.stringify({
    advisories: {
      1242817: {
        id: 1242817,
        module_name: "next",
        severity: "critical",
        github_advisory_id: "GHSA-2464-FHR4-W9XW",
        title: "Next.js RCE",
        url: "https://github.com/advisories/GHSA-2464-fhr4-w9xw",
      },
      1000: { id: 1000, module_name: "x", severity: "low", title: "t", url: "" },
    },
    metadata: { vulnerabilities: { low: 1, high: 0, critical: 1 } },
  });
  const r = parseAuditReport(stdout);
  assert.equal(r.ok, true);
  assert.equal(r.advisories.length, 2);
  const next = r.advisories.find((a) => a.id === "1242817");
  assert.equal(next.ghsa, "GHSA-2464-FHR4-W9XW");
  assert.equal(r.reportedBlocking, 1);
});

test("unreadable high/critical advisories fail the gate instead of passing silently", () => {
  const result = evaluateAudit({
    advisories: [],
    reportedBlocking: 2,
    allowlist: [],
    today: TODAY,
  });
  assert.equal(result.pass, false);
  assert.equal(result.unreadable, 2);
});

test("network and API errors are classified apart from vulnerabilities", () => {
  const apiErr = parseAuditReport(
    JSON.stringify({ error: { code: "ERR_PNPM_AUDIT_ENOTFOUND", summary: "getaddrinfo ENOTFOUND registry" } }),
  );
  assert.equal(apiErr.ok, false);
  assert.equal(apiErr.reason, "api-error");
  assert.equal(classifyFailure("[ERROR] GET https://registry.npmjs.org/pnpm: fetch failed"), "network");
  assert.equal(classifyFailure("ERR_PNPM_SOMETHING unexpected"), "audit-error");
  assert.equal(parseAuditReport("").reason, "empty");
  assert.equal(parseAuditReport("not json").reason, "invalid-json");
});
