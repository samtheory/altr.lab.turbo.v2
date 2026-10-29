import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

import type { JordAuthVariables } from "../auth/index.js";
import type { PrincipalKind } from "../auth/principal.js";

/** Kind-only principal for ops logs — never uid/tokens. */
export type HttpLogPrincipal = PrincipalKind | "none";

export type HttpRequestLogLevel = "info" | "error";

export type HttpRequestLog = {
  level: HttpRequestLogLevel;
  msg: "http";
  requestId: string;
  method: string;
  path: string;
  status: number;
  ms: number;
  principal: HttpLogPrincipal;
};

export type HttpRequestLogWriter = (line: HttpRequestLog) => void;

const MAX_REQUEST_ID_LEN = 64;
const REQUEST_ID_RE = /^[A-Za-z0-9._-]{1,64}$/;

/**
 * Health probes are skipped at info to avoid LB/k8s spam.
 * Documented in tech_space/jord/overview.
 */
export function isHttpLogSkippedPath(path: string): boolean {
  return path === "/health" || path.startsWith("/health/");
}

export function resolveHttpLogEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.JORD_HTTP_LOG?.trim();
  if (raw === undefined || raw === "") return true;
  return raw !== "0" && raw.toLowerCase() !== "false" && raw.toLowerCase() !== "off";
}

export function resolveRequestId(header: string | undefined): string {
  const trimmed = header?.trim();
  if (trimmed && trimmed.length <= MAX_REQUEST_ID_LEN && REQUEST_ID_RE.test(trimmed)) {
    return trimmed;
  }
  return crypto.randomUUID();
}

export function defaultHttpLogWriter(line: HttpRequestLog): void {
  const text = JSON.stringify(line);
  if (line.level === "error") {
    console.error(text);
  } else {
    console.log(text);
  }
}

function principalKindFromContext(
  getPrincipal: () => unknown,
): HttpLogPrincipal {
  try {
    const principal = getPrincipal();
    if (
      principal &&
      typeof principal === "object" &&
      "kind" in principal &&
      typeof (principal as { kind: unknown }).kind === "string"
    ) {
      const kind = (principal as { kind: string }).kind;
      if (
        kind === "anon" ||
        kind === "user" ||
        kind === "service" ||
        kind === "operator"
      ) {
        return kind;
      }
    }
  } catch {
    // Variable unset on public / pre-auth paths.
  }
  return "none";
}

export type HttpRequestLogOptions = {
  enabled?: boolean;
  write?: HttpRequestLogWriter;
};

export function createHttpRequestLogMiddleware(
  options: HttpRequestLogOptions = {},
): MiddlewareHandler<{ Variables: JordAuthVariables }> {
  const enabled = options.enabled ?? true;
  const write = options.write ?? defaultHttpLogWriter;

  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      if (!enabled) {
        await next();
        return;
      }

      const path = c.req.path;
      const skip = isHttpLogSkippedPath(path);
      const start = Date.now();
      const requestId = resolveRequestId(c.req.header("x-request-id"));

      try {
        await next();
      } finally {
        if (skip) return;

        const status = c.res.status;
        const level: HttpRequestLogLevel = status >= 500 ? "error" : "info";
        const line: HttpRequestLog = {
          level,
          msg: "http",
          requestId,
          method: c.req.method,
          path,
          status,
          ms: Math.max(0, Date.now() - start),
          principal: principalKindFromContext(() => c.get("principal")),
        };
        write(line);
      }
    },
  );
}
