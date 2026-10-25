import { describe, expect, it } from "vitest";

import { redactMeta, redactSecrets } from "./redact.js";

describe("S0024 log redaction", () => {
  it("redacts Authorization and token-shaped strings", () => {
    expect(redactSecrets('Authorization: Bearer abc.def.ghi')).toContain(
      "[redacted]",
    );
    expect(redactSecrets("token eyJhbGciOiJIUzI1NiJ9.aaa.bbb")).toContain(
      "[redacted-jwt]",
    );
    expect(redactMeta({ authorization: "Bearer secret", note: "ok" })).toEqual({
      authorization: "[redacted]",
      note: "ok",
    });
  });
});
