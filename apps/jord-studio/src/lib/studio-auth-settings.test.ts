import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  allowlistErrors,
  buildClaimsPreview,
  DEFAULT_AUTH_RATE_LIMITS,
  emptyAuthSettings,
  formatJwtFingerprint,
  normalizeRateLimits,
  parseAllowlistText,
  parseClaimsJson,
  validateRedirectPattern,
} from "./studio-auth-settings.js";

describe("studio auth settings S0071", () => {
  it("ships today's defaults", () => {
    const defaults = emptyAuthSettings();
    assert.equal(defaults.email_password_enabled, true);
    assert.equal(defaults.anonymous_enabled, true);
    assert.equal(defaults.jwt_key_configured, false);
    assert.deepEqual(defaults.custom_claims, {});
    assert.equal(defaults.rate_limits.signup, DEFAULT_AUTH_RATE_LIMITS.signup);
  });

  it("normalizes rate limits and ignores junk", () => {
    assert.deepEqual(normalizeRateLimits({ signup: 5, nope: 2 }), {
      ...DEFAULT_AUTH_RATE_LIMITS,
      signup: 5,
    });
    assert.deepEqual(normalizeRateLimits("bad"), DEFAULT_AUTH_RATE_LIMITS);
  });

  it("validates redirect patterns like the server", () => {
    assert.equal(validateRedirectPattern("https://*.example.com/**"), null);
    assert.equal(validateRedirectPattern("https://app.example.com"), null);
    assert.notEqual(validateRedirectPattern("mailto:ada@lab.test"), null);
    assert.notEqual(validateRedirectPattern("//evil.test/cb"), null);
    assert.notEqual(validateRedirectPattern("https://user:pw@x.test"), null);
    assert.equal(validateRedirectPattern("https://a.test/*"), null);
    assert.equal(validateRedirectPattern("https://a.test/***"), null);
  });

  it("parses allowlist text and reports the offending line", () => {
    const rows = parseAllowlistText(
      " https://a.test/** \n\njavascript:alert(1)\n",
    );
    assert.deepEqual(rows, ["https://a.test/**", "javascript:alert(1)"]);
    assert.deepEqual(allowlistErrors(rows), [
      "Line 2: Pattern must start with http:// or https://",
    ]);
  });

  it("builds a preview where reserved claims win", () => {
    const preview = buildClaimsPreview({
      customClaims: { plan: "pro", role: "admin" },
      ttlSeconds: 900,
      nowMs: 1_700_000_000_000,
    });
    assert.equal(preview.claims.role, "user");
    assert.equal(preview.claims.plan, "pro");
    assert.equal(preview.claims.iss, "jord");
    assert.equal(preview.claims.exp, 1_700_000_000 + 900);
    assert.equal(preview.header.kid, "current");
    assert.equal(preview.ttlMinutes, 15);
  });

  it("accepts objects only and refuses reserved claim keys", () => {
    assert.deepEqual(parseClaimsJson("{}"), { ok: true, value: {} });
    assert.equal(parseClaimsJson("[]").ok, false);
    assert.equal(parseClaimsJson("{bad").ok, false);
    const reserved = parseClaimsJson('{"sub":"x"}');
    assert.equal(reserved.ok, false);
    if (!reserved.ok) assert.match(reserved.error, /reserved/);
  });

  it("groups fingerprints for display", () => {
    assert.equal(formatJwtFingerprint(null), "—");
    assert.equal(formatJwtFingerprint("abcdef1234567890"), "abcd ef12 3456 7890");
  });
});
