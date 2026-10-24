---
title: "Jord-S0010 — Studio S8 Postgres connection as-built"
description: "PostgresAdapter, scheme dispatch, health dialect, Studio Connection page"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - Jord-S0010
  - jord-studio
  - postgres
---

# Jord-S0010 — Studio S8 Postgres connection as-built

> Who: mimir / operators after S8. Plan: [[../../plan/Jord/Jord-S0010/README]] · Prior: [[08-s0009-triggers-policies]] · Architecture: [[../../feature_list/Jord/02-architecture]] · Intent: [[../../feature_list/Jord/03-jord-studio]].

## Contract

| Piece | Decision |
|-------|----------|
| Schemes | `file:` → LibSqlAdapter · `postgres://` / `postgresql://` → PostgresAdapter · `libsql://` still rejected (hosted later) |
| Default | `file:./data/jord.db` |
| Driver | `pg` `Pool` in `@altr/jord` only |
| Timestamps | Postgres `BIGINT` ms (not 32-bit integer) |
| OCC | Same `version = version + 1 WHERE version = $n` → HTTP **409** |
| Policies / triggers | Same server middleware on both dialects (no `CREATE POLICY` / native triggers) |
| WAL | libSQL only — no-op / skipped on Postgres |
| Snapshot | `VACUUM INTO` libSQL only; Postgres → `JordUnsupportedError` |
| Health | `{ ok: true, dialect: "libsql" \| "postgres" }` — **no** URL / host / password |
| Studio | Read-only Connection page; cannot set `DATABASE_URL` |
| Live tests | Gated on `JORD_TEST_POSTGRES_URL` (default suite skips) |

## Engine (`@altr/jord`)

| Piece | Role |
|-------|------|
| `url.ts` / `errors.ts` | `resolveDatabaseUrl`; `JordUrlError` / `JordUnsupportedError` |
| `client.ts` | Scheme dispatch |
| `adapter/postgres.ts` | `PostgresAdapter.open` → pool + migrate + port CRUD |
| `schema/migrate-postgres.ts` | Idempotent Postgres DDL (parity with SQLite control-plane tables) |
| `schema/table-names.ts` | Shared table name list for parity tests |
| Port | `dialect: "libsql" \| "postgres"`; optional `client` / `db` (libSQL only) |

## Server (`@altr/jord-server`)

| Piece | Behavior |
|-------|----------|
| Boot | One `createJordClient({ url: env.DATABASE_URL })` |
| `/health` | Live `jord.dialect` |
| WAL hygiene / shutdown checkpoint | Only when `dialect === "libsql"` |
| Write queue + policies | Unchanged for both dialects |
| Logs | Boot line: `dialect=` + `scheme=` (`file` or `postgres`), no credentials |

## Studio (`apps/jord-studio`)

| Piece | Behavior |
|-------|----------|
| Nav **Database → Connection** | `live` → `/database/connection` |
| `ConnectionPanel` | Fetches BFF `/api/health`; shows dialect badge |
| Roles | Any signed-in role can view; no manage-connection action |
| Secrets | Page never renders or POSTs a connection string |

## Verify (2026-10-24)

- `pnpm --filter @altr/jord test` — 16 passed, 1 skipped (live Postgres)
- `pnpm --filter @altr/jord typecheck`
- `pnpm --filter @altr/jord-server test` — 20 passed
- `pnpm --filter @altr/jord-server typecheck`
- `pnpm --filter @altr/jord-studio typecheck`

Optional: `JORD_TEST_POSTGRES_URL=postgres://… pnpm --filter @altr/jord test`

## Out of this ship

Hosted `libsql://`, native Postgres RLS / `CREATE TRIGGER`, `pgvector`, realtime/blobs UI, Studio URL editor, migrating an existing `file:` DB into Postgres.
