/**
 * S0084 review — keep credentials sent in query strings (`?apikey=`, a
 * mistakenly sent secret, OAuth `access_token`, …) out of OTel HTTP spans.
 *
 * `@opentelemetry/instrumentation-http` records `url.query` (incoming) and
 * `url.full` (outgoing) with only cloud-signature params redacted. Jord
 * redacts every param whose name looks like a credential, case-insensitively.
 */

import type { Attributes, Span } from "@opentelemetry/api";
import type { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";

export const REDACTED = "REDACTED";

/** Exact names always redacted (plus anything matching SENSITIVE_PARAM_RE). */
export const SENSITIVE_QUERY_PARAMS = [
  "apikey",
  "api_key",
  "api-key",
  "key",
  "token",
  "access_token",
  "refresh_token",
  "id_token",
  "authorization",
  "auth",
  "secret",
  "password",
  "jwt",
  "code",
  "sig",
  "signature",
] as const;

const SENSITIVE_NAMES = new Set<string>(SENSITIVE_QUERY_PARAMS);
const SENSITIVE_PARAM_RE = /key|token|secret|passw|auth|sig|credential|session|jwt/i;

export function isSensitiveQueryParam(name: string): boolean {
  const lower = name.toLowerCase();
  return SENSITIVE_NAMES.has(lower) || SENSITIVE_PARAM_RE.test(lower);
}

/** Redact sensitive values in a query string (leading `?` optional). Pure. */
export function redactQueryString(query: string): string {
  const q = query.startsWith("?") ? query.slice(1) : query;
  if (!q) return q;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(q);
  } catch {
    return REDACTED;
  }
  const out = new URLSearchParams();
  for (const [k, v] of params) out.append(k, isSensitiveQueryParam(k) ? REDACTED : v);
  return out.toString();
}

/** Redact the query (and drop any fragment) of a URL or request target. Pure. */
export function redactUrl(url: string): string {
  const hash = url.indexOf("#");
  const noHash = hash >= 0 ? url.slice(0, hash) : url;
  const qi = noHash.indexOf("?");
  if (qi < 0) return noHash;
  const redacted = redactQueryString(noHash.slice(qi + 1));
  return redacted ? `${noHash.slice(0, qi)}?${redacted}` : noHash.slice(0, qi);
}

const URL_ATTRS = ["url.full", "http.url", "http.target"] as const;

/** Redacted replacements for any URL-bearing attributes present. Pure. */
export function redactUrlAttributes(attrs: Attributes): Attributes {
  const out: Attributes = {};
  for (const k of URL_ATTRS) {
    const v = attrs[k];
    if (typeof v === "string") out[k] = redactUrl(v);
  }
  const q = attrs["url.query"];
  if (typeof q === "string") out["url.query"] = redactQueryString(q);
  return out;
}

/** HttpInstrumentation config that never records credential query values. */
export function redactingHttpInstrumentationConfig(): HttpInstrumentationConfig {
  const names = [...SENSITIVE_QUERY_PARAMS, ...SENSITIVE_QUERY_PARAMS.map((n) => n.toUpperCase())];
  return {
    // Built-in exact-name redaction (both directions)…
    redactedQueryParamsServer: names,
    redactedQueryParams: [
      ...names,
      "Signature",
      "AWSAccessKeyId",
      "X-Goog-Signature",
      "X-Amz-Signature",
      "X-Amz-Credential",
      "X-Amz-Security-Token",
    ],
    // …then pattern-based, case-insensitive redaction. Hook attributes are
    // merged over the incoming request attributes at span start.
    startIncomingSpanHook: (request) => {
      const target = request.url ?? "";
      const qi = target.indexOf("?");
      if (qi < 0) return {};
      return { "url.query": redactQueryString(target.slice(qi + 1).split("#")[0] ?? "") };
    },
    // Belt and braces for any URL attribute already on the span (outgoing
    // `url.full`, legacy `http.target` / `http.url`).
    requestHook: (span: Span) => {
      const attrs = (span as unknown as { attributes?: Attributes }).attributes;
      if (!attrs) return;
      span.setAttributes(redactUrlAttributes(attrs));
    },
  };
}
