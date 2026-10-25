---
title: "Jord — overview"
description: "What Jord is, the three packages, the request path, and the invariants that still hold"
created: 2026-10-24
updated: 2026-10-25
tags:
  - tech-space
  - jord
  - overview
  - ci
  - migrations
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

`createJordClient({ url })` picks the adapter from `DATABASE_URL`. Boot runs the forward-only migration runner (below). `GET /health` returns `ok`, `dialect`, `urlScheme`, and `vectorBackend`. It never returns a URL or token.

## Example

```bash
pnpm dev:jord
curl -s http://127.0.0.1:8787/health
```

A file install answers `dialect: "libsql"` and `urlScheme: "file"`.

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

Job **`jord-postgres`** (not a required check yet) starts a `pgvector/pgvector:pg16` service container, sets `JORD_TEST_POSTGRES_URL` to it, and runs the `@altr/jord` and `@altr/jord-server` tests. No secret is needed, so forks run it too.

Server tests use `cloud/jord/src/testing/harness.ts`. `TEST_BACKENDS` is `["file"]`, plus `"postgres"` when `JORD_TEST_POSTGRES_URL` is set. For Postgres each test gets a fresh database, the owner migration, and a runtime pool as `jord_app`, so FORCE RLS applies exactly as in production. Suites on both backends: table API, policies (part-c), outbox, SQL console, storage metadata. Local run:

```powershell
docker run -d --name jord-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=jord_test -p 55432:5432 pgvector/pgvector:pg16
$env:JORD_TEST_POSTGRES_URL="postgres://postgres:postgres@localhost:55432/jord_test"
pnpm --filter @altr/jord-server test
```

Branch protection: requiring status check **`jord`** is a **manual admin** step after the first Actions run. Exact check label in the GitHub UI may be `jord` or `jord / jord` — confirm on the first green run.

## HTTP edge (S0028)

Before `/api/v1` exists, the server hardens the edge:

| Control | Default |
|---------|---------|
| CORS | `JORD_CORS_ORIGINS` comma allow-list. Unset → no `Access-Control-Allow-Origin` for cross-origin |
| JSON body | `JORD_MAX_JSON_BYTES` default **1 MiB** → **413** `payload_too_large`. Blob uploads keep the storage cap |
| Data rate limits | **120 / 60s** per route bucket + client on `/records`, schema rows, `/vectors`, `/blobs`, `/apis/generated`, `/x`. Auth keeps S0021-B **30 / 60s** |
| Idempotency | Optional `Idempotency-Key` on write paths; same key+principal+body replays; different body → **409**. TTL default 24h (`JORD_IDEMPOTENCY_TTL_MS`) |
| Shutdown | Drain the write queue, close realtime, then pools / WAL / HTTP |

Modules: `cloud/jord/src/http/`, `cloud/jord/src/idempotency/`, `queue.drain`, `RealtimeBus.close`. Writes detail: [[../writes/README]].

**Single-process stores.** The rate-limit buckets, the idempotency cache, and the SQL console history live **in memory** in one `jord-server` process. A restart clears them, and a second instance would not share them. The same holds for the realtime bus and the outbox commit watermark. Running more than one instance is phase-03 work.

## Not in Jord yet

Redis, a second bot process, remote S3, hosted embed APIs, and a Studio migration-history UI. Those stay candidates in [[../../../feature_list/Jord/01-phase-02-candidates]] or later phase-02 cards (Studio tools are S0024).
