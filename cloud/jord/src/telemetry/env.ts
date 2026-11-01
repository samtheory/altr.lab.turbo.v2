/**
 * OTel knobs (S0039). Off by default — tests must not need a collector.
 *
 * - `JORD_OTEL_ENABLED=1` (or `true` / `on`) turns the pipeline on.
 * - `JORD_OTEL_ENDPOINT` or `OTEL_EXPORTER_OTLP_ENDPOINT` → OTLP/HTTP.
 *   When enabled with no endpoint, spans/metrics use a no-op exporter.
 */

export function resolveOtelEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.JORD_OTEL_ENABLED?.trim();
  if (raw === undefined || raw === "") return false;
  const lower = raw.toLowerCase();
  return raw === "1" || lower === "true" || lower === "on" || lower === "yes";
}

export function resolveOtelEndpoint(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const jord = env.JORD_OTEL_ENDPOINT?.trim();
  if (jord) return jord;
  const otlp = env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  return otlp || undefined;
}

export function resolveOtelServiceName(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const name = env.OTEL_SERVICE_NAME?.trim();
  return name || "jord-server";
}
