---
title: "Jord — dialects"
description: "file libSQL, hosted libsql://, and Postgres: scheme dispatch, WAL, timestamps, health"
created: 2026-10-24
updated: 2026-10-26
tags:
  - tech-space
  - jord
  - dialects
  - libsql
  - postgres
---

# Jord — dialects

> Who: anyone changing `DATABASE_URL` or adapters. Port contract: [[../../../feature_list/Jord/done/jord-F0002-dialects]]. Overview: [[../overview/README]].

## Why

Callers depend on `JordDriverPort`, not on `@libsql/client` or `pg`. The same server boots against a laptop file, Turso, or Postgres.

## What

| Scheme | Adapter | `dialect` | `urlScheme` | WAL / snapshot |
|--------|---------|-----------|-------------|----------------|
| `file:` (default `file:./data/jord.db`) | `LibSqlAdapter` | `libsql` | `file` | pragmas + truncate checkpoint + `VACUUM INTO` |
| `libsql://` | same `LibSqlAdapter` | `libsql` | `libsql` | skipped |
| `postgres://` / `postgresql://` | `PostgresAdapter` | `postgres` | `postgres` | skipped |

Hosted libSQL auth: `LIBSQL_AUTH_TOKEN` (alias `TURSO_AUTH_TOKEN`). The token is never put in the URL or in `/health`.

File open sets `journal_mode=WAL`, `busy_timeout=5000`, `synchronous=NORMAL`, then `mkdir` of the parent directory. Server checkpoint: `PRAGMA wal_checkpoint(TRUNCATE)` every `JORD_WAL_CHECKPOINT_MS` (default 60s) and on `SIGINT` / `SIGTERM`, only when `urlScheme === "file"`.

Timestamps are millisecond integers. Postgres columns are `BIGINT`.

Unsupported schemes throw `JordUrlError`. Snapshot on a non-file URL throws `JordUnsupportedError`.

## How

| File | Role |
|------|------|
| `elements/jord/src/url.ts` | Scheme parse, `resolveLibsqlAuthToken` |
| `elements/jord/src/client.ts` | Dispatch |
| `elements/jord/src/adapter/libsql.ts` | File + remote open |
| `elements/jord/src/adapter/postgres.ts` | `pg` Pool, migrate |
| `cloud/jord` boot | `useWal = dialect === "libsql" && urlScheme === "file"` |

Studio **Database → Connection** reads `/api/health` and shows dialect + scheme. It cannot set `DATABASE_URL`.

## Example

```text
DATABASE_URL=libsql://your-db.turso.io
LIBSQL_AUTH_TOKEN=…
```

`/health` then includes `urlScheme: "libsql"` and still `dialect: "libsql"`. No host string.

Live Postgres tests run when `JORD_TEST_POSTGRES_URL` is set (always set on the `jord-postgres` Actions job).

### Hosted `libsql://` transactions (phase-02.75 B3 / C2)

`LibSqlAdapter.transaction` on `libsql://` uses an interactive `client.transaction("write")` and routes every `execute` / `batch` / `executeMultiple` into that stream, so data + outbox commit or roll back together. File `file:` keeps `BEGIN IMMEDIATE` on the shared connection.

| Proof | When it runs |
|-------|----------------|
| Forced interactive path on `file:` (`openLibSqlWithInteractiveTxForTests`) | Every engine CI / local run |
| Live Turso (`JORD_TEST_LIBSQL_URL` + `JORD_TEST_LIBSQL_AUTH_TOKEN`) | **Secret-gated / manual-only.** Wired in the `jord` job; skipped when secrets are absent. Do not use an org-wide token — one throwaway test database only |

## Not in Jord yet

Embedded replicas, a Studio field that pastes a URL. (File→Turso/Postgres wizard shipped in S0024.)
