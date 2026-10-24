---
title: "Phase 1 — Postgres dialect contract"
description: "URL schemes, driver, timestamps, what stays on the port — lock before code"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0010
  - postgres
---

# Phase 1 — Postgres dialect contract

> Who: **mimir** (scope) · **saga** (SQL / timestamp width). Server and Studio implement against this note.

Sprint index: [[README]] · Architecture: [[../../../../feature_list/Jord/02-architecture]] · Slice 0 URL gate: `elements/jord/src/url.ts` (`JordSlice0UrlError` today rejects every non-`file:` URL).

## Status

**done** (2026-10-24)

## Scheme table (locked)

| Scheme | Adapter | This sprint |
|--------|---------|-------------|
| `file:` | `LibSqlAdapter` | Unchanged. Default `file:./data/jord.db` |
| `postgres:` / `postgresql:` | `PostgresAdapter` | **Open** |
| `libsql:` | — | Still rejected. Message must name hosted libSQL as a later slice, not “use Postgres” |
| anything else | — | Rejected with the scheme name |

`JordDriverPort.dialect` becomes `"libsql" | "postgres"`. Callers branch on that field. They do not import `@libsql/client` or `pg` outside the adapter files.

## Driver (locked)

| Piece | Choice |
|-------|--------|
| Client | `pg` `Pool` (pooling is the architecture requirement) |
| ORM | `drizzle-orm/node-postgres` |
| Package home | `@altr/jord` dependencies only. `@altr/jord-server` and Studio keep depending on the port |

Do not add `postgres` (postgres.js) and `pg` together.

## What moves with the driver

Same port methods as today: records CRUD + OCC, jobs, functions, custom APIs, policies, triggers, `listTables` / `describeTable` / `addColumn`, close.

| Behavior | libSQL | Postgres |
|----------|--------|----------|
| Migrate on open | Existing `CREATE TABLE IF NOT EXISTS` | Equivalent Postgres DDL in `ensure*Schema` split by dialect, or a postgres migrate module called only from `PostgresAdapter.open` |
| OCC | `version = version + 1 WHERE version = ?` → conflict | Same SQL shape → HTTP **409** |
| Timestamps | SQLite `INTEGER` ms | **`bigint` ms**. Drizzle `integer` on Postgres is 32-bit and will overflow unix ms |
| Booleans | SQLite integer 0/1 | Postgres `boolean` |
| Write queue | `enqueueWrite` | **Keep** `enqueueWrite` (product batching). Do not special-case it away in this sprint |
| WAL truncate | Server hygiene | **Skip.** No `PRAGMA wal_checkpoint` on a Postgres pool |
| Snapshot `VACUUM INTO` | libSQL only | `snapshotTo` returns a clear unsupported error on Postgres |
| `compileTriggerSql` | `null` | Still `null`. Native trigger SQL stays deferred |
| Policies | App middleware | **Same middleware.** No `CREATE POLICY` |

## Studio-visible facts

`GET /health` (already public) grows:

```json
{ "ok": true, "dialect": "libsql" | "postgres" }
```

Optional read-only `GET /meta` (auth) may add `{ "dialect", "scheme" }` where `scheme` is `file` or `postgres` — **never** the host, user, password, or full URL.

## Env

| Var | Role |
|-----|------|
| `DATABASE_URL` | Unchanged name. `file:` default if unset |
| `JORD_TEST_POSTGRES_URL` | Opt-in integration tests only. Absent → skip, do not fail the default suite |

## Out of contract

- Reading `DATABASE_URL` from Studio or the browser
- Migrating an existing `file:` database into Postgres
- pgvector, RLS compile, hosted libSQL

## Tasks

- [ ] Lock scheme table and driver (`pg` Pool + drizzle node-postgres)
- [ ] Lock bigint timestamps on Postgres
- [ ] Lock health dialect field and “no URL in JSON”
- [ ] Lock policy enforcement stays in server middleware

## Done when

Implementers can build the adapter and Studio badge without inventing a second records model or a connection-string form.
