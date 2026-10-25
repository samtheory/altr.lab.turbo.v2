---
title: "Jord — policies, triggers, and Postgres RLS"
description: "Built-in policy rules, row scope, AFTER triggers, and native RLS compiled from jord_policies onto records and user tables"
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

**Policies** (`jord_policies`). Built-in rules: `role_in`, `bucket_in`, `bucket_eq`, `always`, `owner_eq`, `claim_eq`. Among matching policies, **any deny wins**; otherwise any allow. `user` and `anon` **default-deny** when the table has no `rls_enabled` row, when that flag is false, or when no rule matches. `operator` keeps the phase-01 allow when nothing matches. `service` bypasses. Deny is **403** `{ error: "policy_denied" }`. A non-service update that changes a scoped column is **403** `{ reason: "owner_changed" }`.

**Row scope.** `owner_eq` (`column = caller uid`) and `claim_eq` (`column = caller claim`, for example `email`; `sub` is the uid) are row rules. Each matching allow becomes one predicate: the AND of its row rules. The decision is the **OR** of those predicates (`RowScope { anyOf }` in `elements/jord/src/port.ts`). If any matching allow has no row rule, there is no filter. So `owner_eq` OR `role_in(user)` allows every row, and `owner_eq` OR `claim_eq` returns the union. The server applies the scope to:

- `GET /schema/tables/:name/rows` (`listTableRows({ rowScope })`)
- `GET`, `count=exact`, `PATCH`, and `DELETE` on `/api/v1/:table`
- realtime delivery (the row is checked before an event is sent)

Rows outside the scope are not returned, and writes report `affected: 0`. A predicate on a column the table lacks is dropped; if none remain, no rows match (fail closed). Inserts from a non-service caller have the scoped columns stamped from the caller (`stampInsertScope`). A PATCH that would move a row out of scope is **403**.

**libSQL enforces row scope only in the server.** `bindRlsSession` is a no-op there and there is no database RLS. Raw SQL on libSQL (`/sql/execute`, the migrate wizard) is operator-only and sees every row.

Authoring accepts `records` or an existing user table. `PUT /schema/tables/:name/rls` stores `{ rls_enabled, owner_column }` in `jord_table_rls` (migration `0003_table_rls`). `JORD_POLICIES_DISABLED` skips middleware.

**Triggers** (`jord_triggers`). AFTER the write succeeds. Actions: `log`, `echo`, `invoke_function`. `invoke_function` runs as the caller unless the action config sets `as: "service"`. Errors are logged and do not roll back the write unless `failHard: true`. Trigger authoring is still `records` only. `JORD_TRIGGERS_DISABLED` skips them. There is no native `CREATE TRIGGER`.

**Postgres roles.** `JORD_MIGRATE_URL` is the table owner. It runs migrations, `CREATE ROLE jord_app` when it has `CREATEROLE` (otherwise a verify-only check: role exists, no `BYPASSRLS`, owns no table), and grants `jord_app` DML on all public tables and `USAGE, SELECT` on all sequences. `jord-server` keeps a second, owner connection for table DDL and policy sync; runtime traffic stays `DATABASE_URL` as `jord_app`. Boot refuses when those two URLs are the same host, port, database, and user. The runtime pool refuses a role that owns a public table or has `BYPASSRLS`. `file:` and `libsql:` ignore `JORD_MIGRATE_URL`.

**Postgres RLS.** `syncRecordsPoliciesRls()` compiles policies for `records` **and** every `rls_enabled` user table (`jord_rls_<table>_select|insert|update|delete`), enables and forces RLS on them, and re-grants `jord_app`, in one owner transaction. It runs after policy create/update/delete, `PUT …/rls`, create table, rename table, and column alter/drop (a column retype rebuilds the table). The expression is deny-overrides, then allow, then ELSE only for `admin` / `editor` / `readonly`. `owner_eq` compiles to `col = jord.uid`. `claim_eq` compiles to `col = (jord.claims::jsonb ->> claim)`. Bucket rules apply only to tables that have a `bucket` column. Every runtime query, transaction, and SQL console run sets the session GUCs `jord.role`, `jord.bucket`, `jord.uid`, and `jord.claims` with `set_config(..., true)` inside its transaction. `user` and `anon` are bound as those kinds, not as `readonly`. `getRecord` uses `SET LOCAL row_security = off` so middleware can still 403 after it loads the row.

**Rename.** `renameTable` moves the table's rows in `jord_table_rls`, `jord_policies`, `jord_triggers`, and `jord_tracked_tables` (`TABLE_NAME_METADATA` in `schema/ddl-alter.ts`) in the same transaction as the `ALTER TABLE … RENAME`, on both dialects. On Postgres it also drops the stale `jord_rls_<old>_*` policies; the RLS sync that follows recreates them as `jord_rls_<new>_*`. Old `jord_changes` rows keep the old table name (history is not rewritten).

## How

| Piece | Path |
|-------|------|
| Rule match + row scope | `cloud/jord/src/policies/evaluate.ts` |
| Scope → SQL | `elements/jord/src/schema/row-scope.ts` · `cloud/jord/src/table-api/sql.ts` |
| AFTER runner | `cloud/jord/src/triggers/` |
| RLS planner | `elements/jord/src/schema/ddl-rls.ts` (`planSyncTableRls`) |
| `jord_app` grant plan | `elements/jord/src/schema/jord-app.ts` |
| Table flag | `elements/jord/migrations/*/0003_table_rls.sql` |
| Session bind | `PostgresAdapter` + auth middleware `bindRlsSession` |
| Route inventory | `cloud/jord/src/auth/route-inventory.ts` |
| Studio | Database → Policies, Triggers |

Tests: `cloud/jord/src/policies/part-c.test.ts` runs on file libSQL and, when `JORD_TEST_POSTGRES_URL` is set, on a fresh Postgres database as `jord_app` (`cloud/jord/src/testing/harness.ts`). It includes a route conformance test (every mounted route, as a user, never returns another user's row) and a Postgres-only test that a raw `jord_app` query is filtered by the database. Another Postgres-only test runs a column retype and a table rename with a non-superuser owner and checks no row is lost. The pool-leak test is `elements/jord/src/adapter/postgres-uid-leak.test.ts`.

## Example

An allow `role_in` for `user` on `records` does nothing until `PUT /schema/tables/records/rls` sets `rls_enabled: true`. After that, `GET /records` with a user access token returns **200**. A matching deny on the same operation returns **403** even when an allow also matches.

A `lab_notes` table with allow `claim_eq { claim: "email", column: "owner_email" }`: a user whose token carries `email: a@x.test` sees only rows with that `owner_email`, on `/api/v1`, Studio rows, and realtime.

## Not in Jord yet

Custom JWT claims (tokens carry `iss`, `aud`, `sub`, `email` only). Dropping the middleware once RLS is present. Native SQL triggers, column-level policies, BEFORE triggers. See [[../../../plan/Jord/phase-02.75/README|phase-02.75]].
