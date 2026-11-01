---
title: "Jord — overview"
description: "What Jord is, the three packages, the request path, and the invariants that still hold"
created: 2026-10-24
updated: 2026-11-01
tags:
  - tech-space
  - jord
  - overview
  - ci
  - migrations
  - health
  - http-log
  - s0035
  - s0036
  - s0038
  - s0039
  - otel
  - rate-limit
  - idempotency
---

# Jord — overview

> Open this first. Dialects: [[../dialects/README]]. Writes: [[../writes/README]]. Studio: [[../studio/README]].

## Why

One data plane for the lab: a file you can copy, a dialect port so Postgres and hosted libSQL share the same API, and a Studio that never opens the database file.

## What

| Package | Path | Role |
|---------|------|------|
| `@altr/jord` | `elements/jord` | `JordDriverPort`, adapters, schema, vectors, blobs metadata |
| `@altr/jord-server` | `cloud/jord` | Hono HTTP, one write queue, WAL hygiene on file libSQL |
| `@altr/jord-client` | `elements/jord-client` | Private fetch client. No `@altr/jord` dependency |
| `@altr/jord-studio` | `apps/jord-studio` | Next.js control plane. UI from `@altr/apolyx` only |

Default data: `data/jord.db` (gitignored). Blob bytes: `data/blobs/`. `@altr/base` is a leaf — it does not open Jord.

Server port **8787** (`PORT`). Studio port **3005**.

## How

```
Studio browser
  → apps/jord-studio BFF  (cookie session → Authorization bearer)
    → cloud/jord
      → enqueueWrite (hot mutations)
        → JordDriverPort
          → LibSqlAdapter | PostgresAdapter
```

`createJordClient({ url })` picks the adapter from `DATABASE_URL`. Boot runs the forward-only migration runner (below).

### Health probes (S0034)

Public, unauthenticated. Module: `cloud/jord/src/http/health.ts`. Never returns a URL or token.

| Path | Meaning | Body |
|------|---------|------|
| `GET /health/live` | Process is serving (no DB) | `{ ok: true }` → **200** |
| `GET /health/ready` | DB ping + baseline migration (`0001` in `jord_migrations`) + write queue present with finite `pending()` / `inFlight()` | `{ ok: true }` → **200**; else `{ ok: false, reasons: { db?, migrations?, queue? } }` → **503** |
| `GET /health` | **Back-compat alias** of live **plus** dialect labels | `{ ok, dialect, urlScheme, vectorBackend }` → **200** |

Load balancers / k8s should use **live** for liveness and **ready** for readiness. Prefer those over `/health` for new wiring.

### Structured JSON request logs (S0035)

Ops access log on **stdout** (`info`) / **stderr** (`error` for 5xx). Separate from Studio `LogBatcher` / `jord_logs`. Module: `cloud/jord/src/http/request-log.ts`. Wired early in `createJordApp` (after CORS).

| Field | Meaning |
|-------|---------|
| `level` | `info` (2xx/3xx/4xx) or `error` (5xx) |
| `msg` | always `"http"` |
| `requestId` | `x-request-id` when short/`[A-Za-z0-9._-]{1,64}`, else UUID |
| `method` / `path` | request method and path (no query) |
| `status` / `ms` | response status and elapsed ms |
| `principal` | kind only: `anon` \| `user` \| `service` \| `operator` \| `none` |
| `traceId` | present when OTel is on (S0039) — same id as the `jord.http` span |

**Never** logged: Authorization, cookies, bodies, header dumps.

| Knob | Default |
|------|---------|
| `JORD_HTTP_LOG=0` (or `false` / `off`) | disables; otherwise **on** |
| `/health` and `/health/*` | **skipped** (avoid LB/k8s probe spam) |

Tests inject `deps.httpLog`. Product log ring unchanged.

## Example

```bash
pnpm dev:jord
curl -s http://127.0.0.1:8787/health/live
curl -s http://127.0.0.1:8787/health/ready
curl -s http://127.0.0.1:8787/health
```

A file install answers `dialect: "libsql"` and `urlScheme: "file"` on `/health`.

## Boot migrations

Ad-hoc `CREATE TABLE IF NOT EXISTS` at boot cannot tell a changed file from a database that already adopted phase-01. The runner records what ran.

| Piece | Contract |
|-------|----------|
| History | `jord_migrations(id, name, checksum, applied_at)`. The runner creates this table. It is not part of the baseline file. |
| Files | `elements/jord/migrations/libsql/*.sql` and `elements/jord/migrations/postgres/*.sql`, ordered by `NNNN_name.sql` |
| Baseline | `0001_baseline` uses `CREATE TABLE IF NOT EXISTS` for the phase-01 control-plane tables. Existing rows stay. |
| Checksum | SHA-256 hex, lowercase, of the file after CRLF is turned into LF. Stored value must match the file. |
| Mismatch | `JordMigrationChecksumError` names the migration (`0001_baseline`) and boot stops. The SQL is not re-applied or skipped. |
| Second boot | Applied ids are skipped. `applied_at` stays the same. |
| libSQL lock | In-process mutex. The key is a SHA-256 of the database URL (the raw URL is not kept on the mutex map). |
| Postgres lock | `pg_advisory_lock(872021001)` on one pooled connection for the whole run, then unlock. |
| WAL | Unchanged: pragmas and truncate checkpoints run only for `file:`, before migrations. Hosted `libsql://` and Postgres do not. |

Code: `elements/jord/src/schema/migrations/runner.ts`. `ensureRecordsSchema` and `ensurePostgresSchema` call that runner from adapter `open`.

Fixture: `cloud/jord/fixtures/phase-01-baseline.sql`. Header `-- source: eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c`. It is a text dump from that commit (phase-01 `CREATE TABLE` path plus seed `records.id = phase-01-seed`). Regenerate with `pnpm --filter @altr/jord-server dump:phase-01-baseline` only inside a worktree of that commit. The script refuses when `jord_migrations` already exists.

Opening that fixture and then booting keeps the seed row and writes one `jord_migrations` row whose checksum equals the baseline file.

Postgres lock tests live in `elements/jord/src/schema/migrations/migrations.test.ts` and run only when `JORD_TEST_POSTGRES_URL` is set. They passed on live Postgres on 2026-10-25. The splitter (`split-sql.ts`) keeps `'…'` strings and `$tag$…$tag$` bodies whole; before that fix every Postgres boot failed on the outbox trigger function.

## CI

Workflow: `.github/workflows/jord.yml` (job name **`jord`**). Triggers: `pull_request` and `push` to `main`. No path filter. Runner: **Node 22 (LTS)** + pnpm from root `packageManager` (`10.27.0`). Local `node -v` may be a newer Current line (e.g. 25); CI stays on LTS for support window and native libSQL binary coverage.

| Package | CI runs |
|---------|---------|
| `@altr/jord` | `typecheck` + `test` (file libSQL always) |
| `@altr/jord-server` | `typecheck` + `test` |
| `@altr/jord-client` | `typecheck` + `test` (mock fetch; no engine) |
| `@altr/jord-studio` | `typecheck` only (no `test` script in package.json) |

Local equivalent:

```bash
pnpm install --frozen-lockfile
pnpm --filter @altr/jord typecheck
pnpm --filter @altr/jord test
pnpm --filter @altr/jord-server typecheck
pnpm --filter @altr/jord-server test
pnpm --filter @altr/jord-client typecheck
pnpm --filter @altr/jord-client test
pnpm --filter @altr/jord-studio typecheck
```

Job **`jord-postgres`** starts `pgvector/pgvector:pg16` and a MinIO service container, sets `JORD_TEST_POSTGRES_URL` and `JORD_TEST_S3_*`, and runs `@altr/jord` + `@altr/jord-server` tests (including `s3-live`). No Postgres secret is needed, so forks run it too. Hosted libSQL secrets on the `jord` job are optional (see [[../dialects/README#hosted-libsql-transactions-phase-0275-b3--c2]]).

Server tests use `cloud/jord/src/testing/harness.ts`. `TEST_BACKENDS` is `["file"]`, plus `"postgres"` when `JORD_TEST_POSTGRES_URL` is set. For Postgres each test gets a fresh database, the owner migration, and a runtime pool as `jord_app`, so FORCE RLS applies exactly as in production. `openTestDb("postgres", { owner: "plain" })` makes the table owner a `NOSUPERUSER NOBYPASSRLS` role (`jord_owner_test`). Suites on both backends: table API, policies (part-c), outbox, SQL console / resync, storage metadata + MinIO live. Local mirror:

```powershell
docker run -d --name jord-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=jord_test -p 55432:5432 pgvector/pgvector:pg16
docker run -d --name jord-minio -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin -p 9000:9000 bitnamilegacy/minio@sha256:451fe6858cb770cc9d0e77ba811ce287420f781c7c1b806a386f6896471a349c
$env:JORD_TEST_POSTGRES_URL="postgres://postgres:postgres@localhost:55432/jord_test"
$env:JORD_TEST_S3_ENDPOINT="http://localhost:9000"
$env:JORD_TEST_S3_ACCESS_KEY_ID="minioadmin"
$env:JORD_TEST_S3_SECRET_ACCESS_KEY="minioadmin"
pnpm --filter @altr/jord-server test
```

Branch protection requiring **`jord`** and **`jord-postgres`** is a **manual admin** step — commands on [[../../../plan/Jord/phase-02/Jord-S0027/README#branch-protection]].

## HTTP edge (S0028)

Before `/api/v1` exists, the server hardens the edge:

| Control | Default |
|---------|---------|
| CORS | `JORD_CORS_ORIGINS` comma allow-list. Unset → no `Access-Control-Allow-Origin` for cross-origin |
| JSON body | `JORD_MAX_JSON_BYTES` default **1 MiB** → **413** `payload_too_large`. Blob uploads keep the storage cap |
| Data rate limits | **120 / 60s** per route bucket + client on `/records`, schema rows, `/vectors`, `/blobs`, `/apis/generated`, `/x`. Auth keeps S0021-B **30 / 60s** (still in-process) |
| Idempotency | Optional `Idempotency-Key` on write paths; same key+principal+body replays; different body → **409**. TTL default 24h (`JORD_IDEMPOTENCY_TTL_MS`) |
| Shutdown | Drain the write queue, close realtime, then pools / WAL / HTTP |

Modules: `cloud/jord/src/http/`, `cloud/jord/src/idempotency/`, `queue.drain`, `RealtimeBus.close`. Writes detail: [[../writes/README]]. Shared PG stores: [[../apis/README#shared-rate-limit--idempotency-s0036]].

### Shared rate limit + idempotency (S0036)

On **Postgres**, data-route rate counters and idempotency replay live in the project DB so N instances share one budget and one cache. **libSQL** keeps the in-process memory path (offline / single file). Migration `0007_rate_limit_idempotency`. No Redis.

| Store | Table | Selection |
|-------|-------|-----------|
| Rate limit | `jord_rate_limits(bucket, window_start, count)` | `dialect === "postgres"` → `createPostgresRateLimitStore`; else memory |
| Idempotency | `jord_idempotency(key, principal, route, request_hash, status, response_json, expires_at)` | same dialect gate → `createPostgresIdempotencyStore` |

- Rate check is one upsert: `INSERT … ON CONFLICT DO UPDATE … RETURNING count`. PG windows are **fixed** and aligned to the **DB clock** (memory still opens a window on first hit).
- Idempotency key is `(key, principal)`; `route` is informational. Replay returns stored status + body; hash mismatch → **409** `idempotency_conflict`.
- Sweeper job kind `shared_state_sweep` (seeded on Postgres only) deletes expired idempotency rows and old rate windows. Modules: `http/rate-limit-store.ts`, `idempotency/pg-store.ts`, `idempotency/sweep.ts`.
- Failure policy: rate-limit DB errors **fail open** (log + allow); idempotency lookup failure → **500**; failed `remember` after a committed write is logged only.

**Still process-local:** SQL console history, auth route rate limits (30/min). Realtime LISTEN fan-out + shared watermark are multi-instance on Postgres ([[../../../plan/Jord/phase-03/done/S0037-listen-seq-fanout|S0037]]).

### Postgres write concurrency (S0038)

| Env | Default | Notes |
|-----|---------|-------|
| `JORD_PG_WRITE_CONCURRENCY` | `1` | Postgres only. Integer **1…8**; invalid → boot fails. libSQL always serial (warns once if set > 1). |

Documented in `cloud/jord/src/load-env.ts`. As-built: [[../writes/README]]. Card: [[../../../plan/Jord/phase-03/done/S0038-pg-write-concurrency|S0038]].

### OpenTelemetry (S0039)

Opt-in. Module: `cloud/jord/src/telemetry/`. Boot calls `initTelemetry` before `serve` so Node HTTP auto-instrumentation can wrap the listener; Hono also gets a manual `jord.http` span (covers `app.request` in tests).

| Env | Default | Notes |
|-----|---------|-------|
| `JORD_OTEL_ENABLED` | off | `1` / `true` / `on` / `yes` enables the SDK |
| `JORD_OTEL_ENDPOINT` or `OTEL_EXPORTER_OTLP_ENDPOINT` | unset | OTLP/HTTP base; when enabled with no endpoint → **no-op** span exporter (no collector required) |
| `OTEL_SERVICE_NAME` | `jord-server` | resource `service.name` |

| Span | Attributes (never SQL text, params, tokens, or signed URLs) |
|------|--------------------------------------------------------------|
| `jord.http` | method, route, status, `jord.request_id` |
| `jord.write` | `jord.write.kind`, `jord.write.wait_ms` |
| `jord.sql` | `jord.sql.kind` (`select` \| `execute`) |
| `jord.storage` | `jord.storage.op`, `jord.storage.bucket`, optional `jord.storage.bytes` |

| Metric | Meaning |
|--------|---------|
| `jord_requests_total{route,status}` | HTTP completions (health skipped) |
| `jord_sql_errors_total` | SQL span failures |
| `jord_write_queue_depth` | Observable gauge → `queue.pending()` |
| `jord_blob_bytes_written` | Bytes through `putObject` |

JSON request logs include `traceId` when OTel is on. Card: [[../../../plan/Jord/phase-03/done/S0039-otel-traces|S0039]].

## Not in Jord yet

Redis, a second bot process, remote S3, hosted embed APIs, and a Studio migration-history UI. Those stay candidates in [[../../../feature_list/Jord/INDEX]] or later phase-02 cards (Studio tools are S0024). Backup drill / Dockerfile remain open on [[../../../plan/Jord/phase-03/README|phase-03]].
