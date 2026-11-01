import { context, SpanStatusCode, trace } from "@opentelemetry/api";
import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

import type { JordAuthVariables } from "../auth/index.js";
import { isHttpLogSkippedPath, resolveRequestId } from "../http/request-log.js";
import { isTelemetryEnabled } from "./init.js";
import { recordRequest } from "./metrics.js";

export type JordTelemetryVariables = {
  requestId?: string;
  traceId?: string;
};

export type JordHttpVariables = JordAuthVariables & JordTelemetryVariables;

/**
 * Manual HTTP span for Hono (covers `app.request` and Node serve).
 * Expects to run after request-log has set `requestId`, or resolves one itself.
 * Skips health probes for span noise (metrics still skipped too).
 */
export function createOtelHttpMiddleware(): MiddlewareHandler<{
  Variables: JordHttpVariables;
}> {
  return createMiddleware<{ Variables: JordHttpVariables }>(async (c, next) => {
    if (!isTelemetryEnabled()) {
      await next();
      return;
    }

    const path = c.req.path;
    const skip = isHttpLogSkippedPath(path);
    if (skip) {
      await next();
      return;
    }

    const requestId =
      c.get("requestId") ?? resolveRequestId(c.req.header("x-request-id"));
    c.set("requestId", requestId);

    const tracer = trace.getTracer("jord-server");
    const span = tracer.startSpan("jord.http", {
      attributes: {
        "http.request.method": c.req.method,
        "http.route": path,
        "jord.request_id": requestId,
      },
    });
    const traceId = span.spanContext().traceId;
    if (traceId && !/^0+$/.test(traceId)) {
      c.set("traceId", traceId);
    }

    try {
      await context.with(trace.setSpan(context.active(), span), () => next());
      const status = c.res.status;
      span.setAttribute("http.response.status_code", status);
      if (status >= 500) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      recordRequest(path, status);
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      span.recordException(err as Error);
      recordRequest(path, 500);
      throw err;
    } finally {
      span.end();
    }
  });
}
