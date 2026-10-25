---
title: "Jord — policies, triggers, and Postgres RLS"
description: "Built-in policy rules, AFTER triggers, and native RLS compiled from jord_policies onto records"
created: 2026-10-24
updated: 2026-10-25
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

Threat model: [[../../../plan/Jord/phase-02/Jord-S0021/ADR-threat-model]].

**Policies** (`jord_policies`). Built-in rules: `role_in`, `bucket_in`, `bucket_eq`, `always`, `owner_eq`, `claim_eq`. Among matching policies, **any deny wins**; otherwise any allow. `user` and `anon` **default-deny** when the table has no `rls_enabled` row, when that flag is false, or when no rule matches. `operator` keeps the phase-01 allow when nothing matches. `service` bypasses. Deny is **403** `{ error: "policy_denied" }`. A non-service update that changes the owner column is **403** `{ reason: "owner_changed" }`. Inserts from a non-service caller force the owner column to the caller uid when an allow carries `owner_eq`.

Authoring accepts `records` or an existing user table. `PUT /schema/tables/:name/rls` stores `{ rls_enabled, owner_column }` in `jord_table_rls` (migration `0003_table_rls`). `JORD_POLICIES_DISABLED` skips middleware.

**Triggers** (`jord_triggers`). AFTER the write succeeds. Actions: `log`, `echo`, `invoke_function`. `invoke_function` runs as the caller unless the action config sets `as: "service"`. Errors are logged and do not roll back the write unless `failHard: true`. Trigger authoring is still `records` only. `JORD_TRIGGERS_DISABLED` skips them. There is no native `CREATE TRIGGER`.

**Postgres roles.** `JORD_MIGRATE_URL` is the table owner and runs migrations, `CREATE ROLE jord_app` when the owner has `CREATEROLE`, or a verify-only check (role exists, no `BYPASSRLS`, owns no table) and then `GRANT` plus `ENABLE` / `FORCE ROW LEVEL SECURITY` on tables whose `jord_table_rls.rls_enabled` is true. Runtime traffic stays `DATABASE_URL`. Boot refuses when those two URLs are the same host, port, database, and user. The runtime pool refuses a role that owns a public table or has `BYPASSRLS`. `file:` and `libsql:` ignore `JORD_MIGRATE_URL`.

**Postgres RLS on `records`.** Sync still writes `jord_rls_records_select|insert|update|delete`. The expression is deny-overrides, then allow, then ELSE only for `admin` / `editor` / `readonly`. Session GUCs `jord.role`, `jord.bucket`, and `jord.uid` use `set_config(..., true)` inside the transaction. `user` and `anon` are bound as those kinds, not as `readonly`. `getRecord` uses `SET LOCAL row_security = off` so middleware can still 403 after it loads the row. libSQL does not emit `CREATE POLICY`.

The pool-leak test is `elements/jord/src/adapter/postgres-uid-leak.test.ts`. It runs only when `JORD_TEST_POSTGRES_URL` is set.

## How

| Piece | Path |
|-------|------|
| Rule match | `cloud/jord/src/policies/` |
| AFTER runner | `cloud/jord/src/triggers/` |
| RLS planner | `elements/jord/src/schema/ddl-rls.ts` |
| `jord_app` grant plan | `elements/jord/src/schema/jord-app.ts` |
| Table flag | `elements/jord/migrations/*/0003_table_rls.sql` |
| Session bind | `PostgresAdapter` + auth middleware `bindRlsSession` |
| Route inventory | `cloud/jord/src/auth/route-inventory.ts` |
| Studio | Database → Policies, Triggers |

Owner migration runs from `startJordServer` before the runtime pool opens. Policy sync on `records` still runs when the Postgres adapter applies DDL.

## Example

An allow `role_in` for `user` on `records` does nothing until `PUT /schema/tables/records/rls` sets `rls_enabled: true`. After that, `GET /records` with a user access token returns **200**. A matching deny on the same operation returns **403** even when an allow also matches. libSQL never emits `CREATE POLICY`; the middleware is the gate the file tests cover.

## Not in Jord yet

A live Postgres run of the pool-leak test and of the same HTTP fixture (needs `JORD_TEST_POSTGRES_URL`). Native `CREATE POLICY` for user tables other than `records`. Dropping the middleware once RLS is present. Native SQL triggers, column-level policies, BEFORE triggers.
