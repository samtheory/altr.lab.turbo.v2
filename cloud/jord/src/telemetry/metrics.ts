import { metrics, type Counter, type Meter } from "@opentelemetry/api";

const METER_NAME = "jord-server";

let meter: Meter | null = null;
let requestsTotal: Counter | null = null;
let sqlErrorsTotal: Counter | null = null;
let blobBytesWritten: Counter | null = null;
let queueDepthProvider: (() => number) | null = null;
let gaugeRegistered = false;

export function initJordMetrics(): void {
  meter = metrics.getMeter(METER_NAME);
  requestsTotal = meter.createCounter("jord_requests_total", {
    description: "HTTP requests by route template and status",
  });
  sqlErrorsTotal = meter.createCounter("jord_sql_errors_total", {
    description: "SQL console / driver errors (no statement text)",
  });
  blobBytesWritten = meter.createCounter("jord_blob_bytes_written", {
    description: "Object bytes written through JordStoragePort.putObject",
  });

  if (!gaugeRegistered) {
    gaugeRegistered = true;
    meter
      .createObservableGauge("jord_write_queue_depth", {
        description: "Write-queue pending + in-flight jobs",
      })
      .addCallback((obs) => {
        obs.observe(queueDepthProvider?.() ?? 0);
      });
  }
}

/** Reset metric handles after SDK shutdown (tests). */
export function resetJordMetricsForTests(): void {
  meter = null;
  requestsTotal = null;
  sqlErrorsTotal = null;
  blobBytesWritten = null;
  queueDepthProvider = null;
  // gaugeRegistered stays true — ObservableGauge cannot be re-registered on a new meter safely across providers; tests re-init SDK once per file.
}

export function setWriteQueueDepthProvider(provider: (() => number) | null): void {
  queueDepthProvider = provider;
}

export function recordRequest(route: string, status: number): void {
  requestsTotal?.add(1, { route, status: String(status) });
}

export function recordSqlError(): void {
  sqlErrorsTotal?.add(1);
}

export function recordBlobBytesWritten(bytes: number): void {
  if (bytes > 0) blobBytesWritten?.add(bytes);
}
