---
title: "Jord-S0017 — native Postgres RLS from Jord policies"
description: "Compile jord_policies to records RLS; libSQL keeps middleware; API 403 unchanged"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - Jord-S0017
  - policies
  - rls
  - postgres
---

# Jord-S0017 — native Postgres RLS as-built

> Who: mimir / operators after S0017. Plan: [[../../plan/Jord/Jord-S0017/README]] · Prior: [[08-s0009-triggers-policies]] · Dialect: [[09-s0010-postgres]]

## Contract

| Piece | Decision |
|-------|----------|
| Source of truth | `jord_policies` rows (Studio CRUD unchanged) |
| libSQL | Application `evaluatePolicies` only; `compilePolicySql` → `null` |
| Postgres | One native policy per operation (`jord_rls_records_{select\|insert\|update\|delete}`) with `CASE` priority + default-allow `ELSE TRUE` |
| HTTP deny | Middleware still returns **403** `{ error: "policy_denied", … }` on both dialects |
| GUCs | `jord.role`, `jord.bucket` via `set_config(..., true)` inside records transactions |
| Force | `ENABLE` + `FORCE ROW LEVEL SECURITY` on `records` when any compilable policy exists |
| Empty set | Drop managed policies and `DISABLE` RLS (default allow) |
| Sync | After policy create/update/delete; also on `PostgresAdapter.open` |
| Env | `JORD_POLICIES_DISABLED` skips middleware **and** skips sync (leaves prior native policies) |
| Bypass read | `getRecord` uses `SET LOCAL row_security = off` so middleware can still 403 after load |

## Engine (`@altr/jord`)

| Piece | Role |
|-------|------|
| `schema/ddl-rls.ts` | Pure planner: match expr, sync plan, literals |
| Port | `bindRlsSession`, `compilePolicySql`, `syncRecordsPoliciesRls` |
| `PostgresAdapter` | AsyncLocalStorage session; `queryRecords` sets GUCs; sync DDL |
| `LibSqlAdapter` | No-op / null |

## Server (`@altr/jord-server`)

| Piece | Role |
|-------|------|
| Auth middleware chain | `bindRlsSession({ role, bucket from query })` |
| Records mutate path | Re-bind inside `enqueueWrite` with request bucket |
| Function `records_*` | Re-bind before list/insert/count |
| Policy manage | Sync RLS inside the same write-queue turn |

## Studio

| Piece | Behavior |
|-------|----------|
| Policies panel | Dialect hint from `/api/health` (Postgres RLS vs middleware-only) |

## Verify (2026-10-24)

- `pnpm --filter @altr/jord test` — includes `ddl-rls` planner tests
- `pnpm --filter @altr/jord typecheck`
- `pnpm --filter @altr/jord-server test` — middleware 403 regression
- `pnpm --filter @altr/jord-server typecheck`
- `pnpm --filter @altr/jord-studio typecheck`
- Optional: `JORD_TEST_POSTGRES_URL=postgres://… pnpm --filter @altr/jord test`

## Out of this ship

Non-`records` RLS, column-level / JWT claims, dropping middleware on Postgres, native SQLite triggers, realtime WebSockets (S0018), hosted `libsql://` (S0019), hard pgvector (S0020 — last numbered).
