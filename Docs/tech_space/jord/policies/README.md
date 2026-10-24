---
title: "Jord — policies, triggers, and Postgres RLS"
description: "Built-in policy rules, AFTER triggers, and native RLS compiled from jord_policies onto records"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - policies
  - triggers
  - rls
---

# Jord — policies, triggers, and Postgres RLS

> Who: anyone changing access rules. Roles: [[../auth/README]]. Dialects: [[../dialects/README]].

## Why

Studio authors rules without writing SQL. libSQL enforces them in the server. Postgres keeps that HTTP **403** and also compiles the same rows into native RLS so a raw SQL session cannot bypass them.

## What

**Policies** (`jord_policies`). Built-in rules: `role_in`, `bucket_in`, `bucket_eq`, `always`. Highest priority wins; deny beats allow at the same priority; if nothing matches, **allow**. Deny is **403** `{ error: "policy_denied", policyId, table, operation }`. Manage is admin (`canAlterSchema`). v1 table scope for authoring is `records`. `JORD_POLICIES_DISABLED` skips middleware.

**Triggers** (`jord_triggers`). AFTER the write succeeds. Actions: `log`, `echo`, `invoke_function`. Errors are logged and do not roll back the write unless `failHard: true`. `JORD_TRIGGERS_DISABLED` skips them. There is no native `CREATE TRIGGER`.

**Postgres RLS.** Source of truth stays `jord_policies`. Sync writes one policy per operation: `jord_rls_records_select|insert|update|delete`, with `CASE` priority and default-allow `ELSE TRUE`. When any compilable policy exists, Jord `ENABLE` + `FORCE ROW LEVEL SECURITY` on `records`. An empty set drops those policies and disables RLS. Session GUCs `jord.role` and `jord.bucket` are set with `set_config(..., true)` inside the records transaction. `getRecord` uses `SET LOCAL row_security = off` so middleware can still 403 after it loads the row. libSQL `compilePolicySql` returns null.

## How

| Piece | Path |
|-------|------|
| Rule match | `cloud/jord/src/policies/` |
| AFTER runner | `cloud/jord/src/triggers/` |
| RLS planner | `elements/jord/src/schema/ddl-rls.ts` |
| Session bind | `PostgresAdapter` + auth middleware `bindRlsSession` |
| Studio | Database → Policies, Triggers |

Sync runs after policy create/update/delete and again on `PostgresAdapter.open`.

## Example

A `role_in` rule that denies `readonly` on `select` for `records` makes `GET /realtime?table=records` return **403**. On Postgres the same `jord_policies` row is compiled into `jord_rls_records_select`. libSQL never emits `CREATE POLICY`; the middleware is the only gate.

## Not in Jord yet

RLS on tables other than `records`, dropping the middleware once RLS is present, native SQL triggers, column-level policies, BEFORE triggers.
