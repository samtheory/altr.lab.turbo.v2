import { metrics, trace } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  PeriodicExportingMetricReader,
  type IMetricReader,
} from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  SimpleSpanProcessor,
  type SpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

import {
  resolveOtelEnabled,
  resolveOtelEndpoint,
  resolveOtelServiceName,
} from "./env.js";
import { initJordMetrics, resetJordMetricsForTests } from "./metrics.js";
import { NoopSpanExporter } from "./noop-exporter.js";
import { redactingHttpInstrumentationConfig } from "./redact.js";

export type TelemetryHandle = {
  shutdown: () => Promise<void>;
  /** True when the SDK was started for this process. */
  enabled: boolean;
};

export type InitTelemetryOptions = {
  env?: NodeJS.ProcessEnv;
  /**
   * Test/prod override for the span exporter. When set, OTel starts even if
   * `JORD_OTEL_ENABLED` is unset (tests inject `InMemorySpanExporter`).
   */
  spanExporter?: SpanExporter;
  /** Extra metric readers (tests). */
  metricReaders?: IMetricReader[];
  /**
   * Register `@opentelemetry/instrumentation-http` (Node `http`/`https`).
   * Default true for `startJordServer`. Tests using `app.request` should pass false —
   * Hono fetch is covered by the manual `jord.http` middleware instead.
   */
  httpAutoInstrument?: boolean;
};

let active: NodeSDK | null = null;
let activeEnabled = false;

function otlpTraceUrl(endpoint: string): string {
  const base = endpoint.replace(/\/$/, "");
  return base.endsWith("/v1/traces") ? base : `${base}/v1/traces`;
}

function otlpMetricUrl(endpoint: string): string {
  const base = endpoint.replace(/\/$/, "");
  return base.endsWith("/v1/metrics") ? base : `${base}/v1/metrics`;
}

/**
 * Start the opt-in OTel pipeline. Safe to call when disabled (no-op).
 * Idempotent while already started.
 */
export function initTelemetry(
  options: InitTelemetryOptions = {},
): TelemetryHandle {
  if (active) {
    return {
      enabled: activeEnabled,
      shutdown: shutdownTelemetry,
    };
  }

  const env = options.env ?? process.env;
  const forced = options.spanExporter !== undefined;
  const enabled = forced || resolveOtelEnabled(env);
  if (!enabled) {
    activeEnabled = false;
    return { enabled: false, shutdown: shutdownTelemetry };
  }

  const endpoint = resolveOtelEndpoint(env);
  const exporter: SpanExporter =
    options.spanExporter ??
    (endpoint
      ? new OTLPTraceExporter({ url: otlpTraceUrl(endpoint) })
      : new NoopSpanExporter());

  const metricReaders: IMetricReader[] = [...(options.metricReaders ?? [])];
  if (!forced && endpoint) {
    metricReaders.push(
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: otlpMetricUrl(endpoint) }),
        exportIntervalMillis: 60_000,
      }),
    );
  }

  const httpAuto = options.httpAutoInstrument !== false;
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: resolveOtelServiceName(env),
    }),
    spanProcessors: [new SimpleSpanProcessor(exporter)],
    metricReaders,
    // Query strings may carry `?apikey=` (WS upgrade) or a mistakenly sent
    // secret: never record credential values in url.query / url.full.
    instrumentations: httpAuto
      ? [new HttpInstrumentation(redactingHttpInstrumentationConfig())]
      : [],
    autoDetectResources: false,
  });

  sdk.start();
  initJordMetrics();
  active = sdk;
  activeEnabled = true;

  return { enabled: true, shutdown: shutdownTelemetry };
}

export async function shutdownTelemetry(): Promise<void> {
  const sdk = active;
  active = null;
  activeEnabled = false;
  resetJordMetricsForTests();
  if (!sdk) {
    // Ensure subsequent gets use noop providers after a forced test shutdown.
    trace.disable();
    metrics.disable();
    return;
  }
  try {
    await sdk.shutdown();
  } finally {
    trace.disable();
    metrics.disable();
  }
}

export function isTelemetryEnabled(): boolean {
  return activeEnabled;
}
