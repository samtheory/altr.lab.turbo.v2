import {
  context,
  SpanStatusCode,
  trace,
  type Attributes,
  type Span,
  type Tracer,
} from "@opentelemetry/api";

import { recordSqlError } from "./metrics.js";

const TRACER_NAME = "jord-server";

function getTracer(): Tracer {
  return trace.getTracer(TRACER_NAME);
}

async function withSpan<T>(
  name: string,
  attributes: Attributes,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = getTracer();
  const span = tracer.startSpan(name, { attributes });
  try {
    return await context.with(trace.setSpan(context.active(), span), () =>
      fn(span),
    );
  } catch (err) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err instanceof Error ? err.message : String(err),
    });
    span.recordException(err as Error);
    throw err;
  } finally {
    span.end();
  }
}

/**
 * Child span for SQL work. Attributes carry statement *kind* only —
 * never SQL text or bind parameters.
 */
export async function withSqlSpan<T>(
  attrs: { kind: string },
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await withSpan(
      "jord.sql",
      { "jord.sql.kind": attrs.kind },
      async () => fn(),
    );
  } catch (err) {
    recordSqlError();
    throw err;
  }
}

/** Child span for a write-queue job (wait time + kind, no payload). */
export async function withWriteSpan<T>(
  attrs: { kind: string; waitMs: number },
  fn: () => Promise<T>,
): Promise<T> {
  return withSpan(
    "jord.write",
    {
      "jord.write.kind": attrs.kind,
      "jord.write.wait_ms": attrs.waitMs,
    },
    async () => fn(),
  );
}

/**
 * Child span for storage adapter calls.
 * Attributes: op, bucket, optional byte count — never credentials or signed URLs.
 */
export async function withStorageSpan<T>(
  attrs: { op: string; bucket: string; bytes?: number },
  fn: () => Promise<T>,
): Promise<T> {
  const attributes: Attributes = {
    "jord.storage.op": attrs.op,
    "jord.storage.bucket": attrs.bucket,
  };
  if (attrs.bytes !== undefined) {
    attributes["jord.storage.bytes"] = attrs.bytes;
  }
  return withSpan("jord.storage", attributes, async () => fn());
}

export function activeTraceId(): string | undefined {
  const span = trace.getActiveSpan();
  if (!span) return undefined;
  const id = span.spanContext().traceId;
  // OTel uses all-zero when invalid / noop
  if (!id || /^0+$/.test(id)) return undefined;
  return id;
}
