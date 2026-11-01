import type { ExportResult } from "@opentelemetry/core";
import { ExportResultCode } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

/** Drops spans — used when OTel is on but no OTLP endpoint is configured. */
export class NoopSpanExporter implements SpanExporter {
  export(
    _spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
