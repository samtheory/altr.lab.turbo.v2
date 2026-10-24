---
title: "Phase 2 — policy SQL compile + PostgresAdapter sync"
description: "compilePolicySql, rebuild CREATE POLICY, FORCE/ENABLE RLS"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0017
  - engine
  - saga
---

# Phase 2 — engine compile + sync

> Who: **saga** · **sindri**.

Sprint: [[README]] · Contract: [[01-contract]]

## Status

**done** (2026-10-24)

## Port

| Method | Behavior |
|--------|----------|
| `compilePolicySql?(policy: JordPolicy): string \| null` | Postgres: one or more SQL statements for that policy; LibSql: `null` |
| `syncRecordsPoliciesRls?(): Promise<void>` | Load enabled `records` policies, drop managed, recreate, ENABLE (+ FORCE if locked) |

Alternatively a pure module `elements/jord/src/schema/ddl-rls.ts` used by `PostgresAdapter` — prefer pure planner + adapter exec (same pattern as S0016 DDL).

## Planner (`ddl-rls.ts` sketch)

- `planPolicyExpression(rules)` → SQL boolean
- `planCreatePolicy(policy)` → `CREATE POLICY jord_pol_<id> ON records AS … FOR … USING (…) WITH CHECK (…)`
- `planDropManagedPolicies(existingNames)` / `planSyncRecordsRls(policies)`

Escape literals; never interpolate unsanitized rule config into SQL without quoting helpers.

## Adapter

- `PostgresAdapter.syncRecordsPoliciesRls`: run planner SQL in a transaction
- `LibSqlAdapter`: no-op or omit method
- Optional: call sync once on `PostgresAdapter.open` after migrate so reboot reapplies

## Tests

- Unit: rule kinds → expected SQL fragments
- Unit: deny → RESTRICTIVE, allow → PERMISSIVE
- Optional integration: `JORD_TEST_POSTGRES_URL` — insert deny policy, set GUC, assert SELECT filtered / INSERT rejected

## Done when

- [ ] Pure planner + Postgres sync path exist and are tested without requiring Studio
