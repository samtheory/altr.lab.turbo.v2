---
title: "Phase 1 — Postgres RLS contract"
description: "GUC names, allow/deny mapping, sync triggers, 403 authority"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0017
  - contract
  - rls
---

# Phase 1 — Postgres RLS contract

> Who: **mimir** · **saga** · **heimdall**.

Sprint: [[README]] · Prior policies: [[../../../tech_space/jord/08-s0009-triggers-policies]] · Dialect: [[../../../feature_list/Jord/02-architecture]]

## Status

**done** (2026-10-24)

## Lock

### Dual enforcement

| Layer | libSQL | Postgres |
|-------|--------|----------|
| HTTP gate | `evaluatePolicies` → 403 | **Same** (authoritative for API shape) |
| Native | n/a | RLS on `records` compiled from `jord_policies` |

Do **not** remove middleware on Postgres in this sprint. RLS protects anything that hits the pool without the gate (raw SQL, future multi-tenant connectors).

### Session GUCs

| Name | Set from | Used in SQL |
|------|----------|-------------|
| `jord.role` | Auth middleware role (`admin` \| `editor` \| `readonly`) | `role_in` |
| `jord.bucket` | Request bucket (query / body / row), or empty string | `bucket_in` / `bucket_eq` |

Set via `SELECT set_config('jord.role', $1, true)` (and bucket) at the start of each request’s DB work on Postgres. Empty bucket → bucket rules fail closed in SQL (`false` unless `always`).

### Mapping Jord policy → Postgres

| Jord | Postgres |
|------|----------|
| `operation: select` | `FOR SELECT` |
| `insert` | `FOR INSERT` |
| `update` | `FOR UPDATE` |
| `delete` | `FOR DELETE` |
| `effect: allow` | `AS PERMISSIVE` |
| `effect: deny` | `AS RESTRICTIVE` |
| `enabled: false` | Omitted from compile (drop if previously applied) |
| `table_name !== "records"` | Skip compile (v1); middleware may still ignore non-records |

### Rule expressions (AND within one policy)

| Kind | `USING` / `WITH CHECK` fragment |
|------|----------------------------------|
| `always` | `true` |
| `role_in` | `current_setting('jord.role', true) = ANY (ARRAY[…]::text[])` |
| `bucket_eq` | `bucket = '<literal>'` **and** GUC bucket equals same (or only column — lock in emit tests: prefer **column** for row filter + GUC check for writes) |
| `bucket_in` | `bucket = ANY (ARRAY[…])` |

Unknown rule kinds → policy **not** compiled (log / skip); middleware still evaluates.

### Naming + lifecycle

- Native policy name: `jord_pol_<id>` (stable, droppable)
- On sync: `DROP POLICY IF EXISTS jord_pol_<id> ON records` for all managed ids, then recreate enabled set; or drop-all `jord_pol_%` then recreate
- `ALTER TABLE records ENABLE ROW LEVEL SECURITY`
- Prefer `ALTER TABLE records FORCE ROW LEVEL SECURITY` so the connecting role cannot bypass as owner — **confirm** against how `PostgresAdapter` creates `records` (owner = migrate role). If FORCE is too harsh for lab migrations, document bypass and add FORCE in a follow-up

### Sync triggers

Call `syncRecordsRls()` (name TBD) after successful:

- `POST /policies`
- `PATCH /policies/:id`
- `DELETE /policies/:id`

Only when `deps.jord` is Postgres (dialect check / capability).

### Errors

| Case | Behavior |
|------|----------|
| Compile failure | Fail the manage write with 500/`rls_sync_failed`; do not leave `jord_policies` updated without sync **or** transactionally roll back policy row + DDL |
| Middleware deny | Unchanged 403 `policy_denied` |

## Done when

- [ ] This note is agreed enough to implement emit + sync without inventing a second policy model
