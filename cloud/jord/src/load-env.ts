import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Best-effort `.env` load for local `pnpm dev:jord` (does not override existing env).
 *
 * Known Jord server knobs (non-exhaustive):
 * - `JORD_PG_WRITE_CONCURRENCY` — Postgres write-queue width, integer `1…8`, default `1`.
 *   Ignored on libSQL (always serial). Out-of-range values refuse boot.
 * - `JORD_OTEL_ENABLED` — opt-in OpenTelemetry (default off). With no endpoint, exporters are no-op.
 * - `JORD_OTEL_ENDPOINT` / `OTEL_EXPORTER_OTLP_ENDPOINT` — OTLP/HTTP base URL when enabled.
 * - See also: `JORD_CORS_ORIGINS`, `JORD_MAX_JSON_BYTES`, `JORD_HTTP_LOG`,
 *   `JORD_IDEMPOTENCY_TTL_MS`, `JORD_WAL_CHECKPOINT_MS`, `JORD_MIGRATE_URL`.
 * - Backup / restore-drill (S0040): `DATABASE_URL` is the live URL the scripts
 *   refuse to overwrite; optional `JORD_DATABASE_URL` alias; optional
 *   `JORD_BACKUP_PG_CONTAINER` when host `pg_dump`/`psql` are missing.
 */
export function loadLocalEnv(cwd: string = process.cwd()): void {
  const path = resolve(cwd, ".env");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
