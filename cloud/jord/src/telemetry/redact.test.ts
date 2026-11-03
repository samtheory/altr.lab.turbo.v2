import type { IncomingMessage } from "node:http";

import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { describe, expect, it } from "vitest";

import {
  redactingHttpInstrumentationConfig,
  redactQueryString,
  redactUrl,
  redactUrlAttributes,
} from "./redact.js";

const PUB = "jord_pub_abcdef0123456789";
const SEC = "jord_sec_topsecretvalue";

describe("S0084 review: OTel query-string redaction", () => {
  it("redacts credential params (case-insensitive) and keeps the rest", () => {
    const q = redactQueryString(
      `apikey=${PUB}&table=notes&API_KEY=${SEC}&access_token=t1&Authorization=Bearer%20x&x-jord-key=${SEC}&limit=5`,
    );
    expect(q).not.toContain(PUB);
    expect(q).not.toContain(SEC);
    expect(q).not.toContain("t1");
    expect(new URLSearchParams(q).get("table")).toBe("notes");
    expect(new URLSearchParams(q).get("limit")).toBe("5");
    expect(new URLSearchParams(q).get("apikey")).toBe("REDACTED");
    expect(redactQueryString("")).toBe("");
  });

  it("redactUrl / redactUrlAttributes cover url.full, http.target, http.url, url.query", () => {
    expect(redactUrl(`/p/shop/realtime?apikey=${PUB}#frag`)).toBe("/p/shop/realtime?apikey=REDACTED");
    expect(redactUrl("/health")).toBe("/health");
    const out = redactUrlAttributes({
      "url.full": `http://h/p/shop/realtime?token=${SEC}`,
      "http.target": `/p/shop/realtime?apikey=${PUB}`,
      "http.url": `http://h/x?api_key=${SEC}`,
      "url.query": `apikey=${PUB}`,
      "url.path": "/p/shop/realtime",
    });
    expect(JSON.stringify(out)).not.toMatch(new RegExp(`${PUB}|${SEC}`));
    expect(out["url.path"]).toBeUndefined();
  });

  it("instrumentation hooks: incoming url.query is redacted and the span keeps no key", () => {
    const cfg = redactingHttpInstrumentationConfig();
    expect(cfg.redactedQueryParamsServer).toContain("apikey");
    const attrs = cfg.startIncomingSpanHook!({
      url: `/p/shop/realtime?apikey=${PUB}&table=t`,
      headers: {},
    } as IncomingMessage);
    expect(attrs["url.query"]).toBe("apikey=REDACTED&table=t");

    // requestHook rewrites URL attributes already on a real SDK span.
    const exporter = new InMemorySpanExporter();
    const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
    const span = provider.getTracer("t").startSpan("GET", {
      attributes: { "url.query": `apikey=${PUB}`, "url.full": `http://h/p?access_token=${SEC}` },
    });
    cfg.requestHook!(span, {} as IncomingMessage);
    span.end();
    const dumped = JSON.stringify(exporter.getFinishedSpans().map((s) => s.attributes));
    expect(dumped).not.toContain(PUB);
    expect(dumped).not.toContain(SEC);
    expect(dumped).toContain("REDACTED");
  });
});
