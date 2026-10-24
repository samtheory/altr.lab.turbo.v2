---
title: "Jord-S0019 — hosted libsql:// (Turso)"
description: "Same LibSqlAdapter for remote libsql:// + LIBSQL_AUTH_TOKEN; file: stays default; WAL file-only"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - Jord-S0019
  - jord-studio
  - libsql
  - turso
---

# Jord-S0019 — hosted libsql as-built

> Who: mimir / operators after S0019. Plan: [[../../plan/Jord/Jord-S0019/README]] · Prior: [[17-s0018-realtime-ws]]

## Contract

| Piece | Decision |
|-------|----------|
| Adapter | Same `LibSqlAdapter` — no third dialect class |
| Schemes | `file:` (default) · `libsql://` (hosted) · `postgres://` / `postgresql://` |
| Auth | `LIBSQL_AUTH_TOKEN` primary; `TURSO_AUTH_TOKEN` alias. Never in URL or JSON |
| Dialect | `"libsql"` for both file and hosted |
| `urlScheme` | `"file" \| "libsql" \| "postgres"` on port + `/health` (no host/path) |
| WAL | Open pragmas + server hygiene + truncate **only** when `urlScheme === "file"` |
| Snapshot | File-only; hosted throws `JordUnsupportedError` |
| Live tests | `JORD_TEST_LIBSQL_URL` + token — skipped in default CI |

## Engine

| File | Role |
|------|------|
| `url.ts` | Accepts `libsql:`; `resolveLibsqlAuthToken` / `requireLibsqlAuthToken` |
| `client.ts` | Routes file + libsql → `LibSqlAdapter.open` |
| `adapter/libsql.ts` | Remote open with `authToken`; skips mkdir/WAL; `urlScheme` field |
| `adapter/postgres.ts` | `urlScheme: "postgres"` |

## Server / Studio

| Piece | Role |
|-------|------|
| `cloud/jord` boot | `useWal = dialect === "libsql" && urlScheme === "file"` |
| `GET /health` | `{ ok, dialect, urlScheme }` — no URL/token |
| Connection panel | Shows dialect + scheme; documents `libsql://` + token env |

## Verify (2026-10-24)

- `@altr/jord` typecheck + test — pass (hosted live skipped without env)
- `@altr/jord-server` typecheck + test — pass
- `@altr/jord-studio` typecheck — pass

## Explicitly out / next

Embedded replicas · file→Turso wizard · Studio paste-URL · hard sqlite-vec / `pgvector` (**[[../../plan/Jord/00-remaining-backlog|Jord-S0020]] — last numbered**).
