---
title: "Phase 2 — PostgresAdapter + scheme dispatch"
description: "pg Pool, Postgres DDL, port impl, createJordClient switch"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0010
---

# Phase 2 — PostgresAdapter + scheme dispatch

> Who: **sindri** · **saga** (DDL + timestamp types). `file:` tests must keep passing with no Postgres process.

Sprint index: [[README]] · Contract: [[01-dialect-contract]] · Current gate: `elements/jord/src/client.ts`, `url.ts`, `adapter/libsql.ts`.

## Status

**done** (2026-10-24)

## Modules (proposed)

| Module | Role |
|--------|------|
| `elements/jord/src/adapter/postgres.ts` | `PostgresAdapter.open(url)` → pool, migrate, port methods |
| `elements/jord/src/schema/migrate-postgres.ts` | `CREATE TABLE IF NOT EXISTS` for the same tables as `migrate.ts` |
| `url.ts` | `resolveDatabaseUrl` accepts `file:`, `postgres:`, `postgresql:` |
| `client.ts` | Dispatch adapter from scheme |

SQLite Drizzle tables stay the libSQL schema. Do not point `drizzle-orm/libsql` at a Postgres pool. Postgres code uses `pgTable` **or** raw SQL migrate + `db.execute` — pick one and cover it with a column-name parity check against the SQLite table list (`records`, `jord_jobs`, `jord_job_runs`, `jord_functions`, `jord_custom_apis`, `jord_policies`, `jord_triggers`).

## Port typing

`dialect: "libsql" | "postgres"`. Methods that are libSQL-only (`client` raw libSQL handle, `checkpointTruncate`, `snapshotTo`) must not be required for the Postgres class to typecheck. Prefer narrowing:

- Keep shared CRUD on `JordDriverPort`
- Move `checkpointTruncate` / libSQL `client` to `LibSqlAdapter` (callers in `cloud/jord` already know dialect), **or** no-op / throw a typed `unsupported` on Postgres

Do not leak `Client` from `@libsql/client` on the shared port if that forces Postgres to fake it.

## Dispatch

```
file:        → LibSqlAdapter.open
postgres:    → PostgresAdapter.open
postgresql:  → PostgresAdapter.open
libsql:      → throw (hosted libSQL later)
```

`LibSqlAdapter.open` still mkdir-parents and WAL pragmas. `PostgresAdapter.open` does not touch the filesystem.

## Tasks

- [ ] Add `pg` dependency in `@altr/jord` only
- [ ] Postgres migrate + adapter CRUD for records and control-plane tables
- [ ] Scheme dispatch + updated URL error text
- [ ] Unit test: `postgres://` no longer throws Slice 0; `libsql://` still throws
- [ ] Parity test of table/column names vs SQLite migrate (no live server required if it compares SQL or information maps)
- [ ] Live round-trip test skipped unless `JORD_TEST_POSTGRES_URL` is set (insert record, stale update → conflict, delete)

## Done when

A temp or opted-in Postgres URL can insert and OCC-update a `records` row through `createJordClient`, and the default `pnpm --filter @altr/jord test` stays green with the URL unset.
