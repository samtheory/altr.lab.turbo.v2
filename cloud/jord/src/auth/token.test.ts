import { describe, expect, it } from "vitest";

import {
  resolveBearerRole,
  signSessionToken,
} from "./token.js";

describe("session tokens", () => {
  const secret = "unit-secret";

  it("raw secret maps to defaultRole", () => {
    expect(resolveBearerRole(secret, secret, "editor")).toBe("editor");
  });

  it("signed token carries role until expiry", () => {
    const token = signSessionToken("readonly", secret, 60_000, 1_000);
    expect(resolveBearerRole(token, secret, "admin", 1_500)).toBe("readonly");
  });

  it("expired signed token is rejected", () => {
    const token = signSessionToken("admin", secret, 100, 1_000);
    expect(resolveBearerRole(token, secret, "admin", 2_000)).toBeNull();
  });

  it("tampered signature is rejected", () => {
    const token = signSessionToken("admin", secret);
    const bad = `${token.slice(0, -4)}xxxx`;
    expect(resolveBearerRole(bad, secret, "admin")).toBeNull();
  });
});
