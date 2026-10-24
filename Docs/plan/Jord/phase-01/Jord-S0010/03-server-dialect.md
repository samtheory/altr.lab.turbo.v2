---
title: "Phase 3 — server honors dialect"
description: "Health dialect, skip WAL on Postgres, keep write queue and policy middleware"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0010
---

# Phase 3 — server honors dialect

> Who: **sindri**. `cloud/jord/src/index.ts` already passes `DATABASE_URL` into `createJordClient`. WAL hygiene is libSQL-only today (`wal.ts`).

Sprint index: [[README]] · Contract: [[01-dialect-contract]] · Engine: [[02-postgres-adapter]]

## Status

**done** (2026-10-24)

## Behavior

| Piece | Rule |
|-------|------|
| Boot | `createJordClient({ url: env.DATABASE_URL })` — no second code path |
| `/health` | `{ ok: true, dialect }` from `jord.dialect` (replace the hardcoded `"libsql"`) |
| WAL | `startWalHygiene` + shutdown `truncateWalCheckpoint` only when `dialect === "libsql"` |
| Write queue | Unchanged for both dialects |
| Policies / triggers | Unchanged middleware and AFTER hooks |
| Logs | One boot line: dialect + scheme (`file` or `postgres`), no credentials |

## Tasks

- [ ] Health uses the live dialect
- [ ] Guard WAL start/stop
- [ ] Existing server tests still expect `libsql` on the temp `file:` app
- [ ] One test or type-level check that a postgres dialect string is allowed on the health shape

## Done when

`file:` server tests stay green, and a Postgres boot would not issue `PRAGMA wal_checkpoint`.
