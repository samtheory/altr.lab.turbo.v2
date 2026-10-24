---
title: "Phase 1 — hosted libsql contract"
description: "URL scheme, auth token, WAL vs remote, what /health may say"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0019
  - libsql
  - contract
---

# Phase 1 — hosted libsql contract

> Who: **mimir** (scope) · **heimdall** (secrets / leak surface). Sprint: [[README]].

## Status

**done** (2026-10-24)

## Scheme table (locked)

| Scheme | Adapter | This sprint |
|--------|---------|-------------|
| `file:` | `LibSqlAdapter` | Unchanged. Default. Token **not** required |
| `postgres:` / `postgresql:` | `PostgresAdapter` | Unchanged |
| `libsql:` | `LibSqlAdapter` | **Open** — requires auth token env |
| anything else | — | Rejected (`JordSlice0UrlError` / existing message) |

`JordUrlScheme` / `ResolvedJordUrl` gain `"libsql"`. Dialect string on the port stays `"libsql"` for both file and hosted (one SQLite dialect family).

## Auth (locked)

| Variable | Role |
|----------|------|
| `LIBSQL_AUTH_TOKEN` | Primary token for `libsql://` |
| `TURSO_AUTH_TOKEN` | Alias if primary unset (matches lab `.env.example`) |

- Token is **never** part of `DATABASE_URL`.
- Empty/missing token + `libsql://` → fail at resolve/open with an explicit Jord error.
- Token must not appear in logs, `/health`, Studio JSON, or error messages that echo env.

## Local vs remote behavior (locked)

| Behavior | `file:` | `libsql://` |
|----------|---------|-------------|
| mkdir parent | Yes | No |
| WAL pragmas on open | Yes | **Skip** |
| Server WAL hygiene / truncate | Yes | **Skip** |
| `snapshotDatabase` / `snapshotTo` | Allowed | Unsupported (`JordUnsupportedError`) |
| `@libsql/client` | `{ url }` | `{ url, authToken }` |
| Policies / OCC / write queue | Same | Same |

## Health / Studio (locked)

- Keep `dialect: "libsql" | "postgres"`.
- May add **non-secret** `urlScheme: "file" | "libsql" | "postgres"` so Connection can say “hosted libSQL” without a URL.
- Browser never receives URL or token. No Studio editor for either in this sprint.

## Done when

- [ ] This table is the only scheme/auth truth for implementers
- [ ] heimdall sign-off: no secret in API responses or default logs
