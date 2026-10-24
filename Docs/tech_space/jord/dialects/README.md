---
title: "Jord — dialects"
description: "file libSQL, hosted libsql://, and Postgres: scheme dispatch, WAL, timestamps, health"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - dialects
  - libsql
  - postgres
---

# Jord — dialects

> Who: anyone changing `DATABASE_URL` or adapters. Port contract: [[../../../feature_list/Jord/02-architecture]]. Overview: [[../overview/README]].

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

Live tests stay skipped unless `JORD_TEST_POSTGRES_URL` or `JORD_TEST_LIBSQL_URL` is set.

## Not in Jord yet

Embedded replicas, a file→Turso or file→Postgres wizard, a Studio field that pastes a URL.
