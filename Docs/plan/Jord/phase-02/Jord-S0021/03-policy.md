---
title: "S0021 Part C — unified policy model"
description: "Deny-overrides, default-deny, route inventory, FORCE RLS, dialect conformance"
created: 2026-10-24
updated: 2026-10-25
tags:
  - plan
  - jord
  - Jord-S0021
  - jord-s0021-c
  - policies
---

# Part C — unified policy model

> Sprint: [[README]]. **Execution #5.** Blocked until [[ADR-threat-model]] is accepted and Part B is green. Tag: `jord-s0021-c`.

## Status

**in tree for file libSQL** (2026-10-25). ADR is accepted. Postgres pool-leak and dialect-conformance runs were not executed (`JORD_TEST_POSTGRES_URL` unset).

## Combination semantics

| Rule | Choice |
|------|--------|
| Combine | **Deny overrides allow** |
| No policy on a table | **Default-deny** for `anon` and `user` |
| `service` | **Bypasses** user policies |
| `operator` | Keeps the phase-01 role matrix (admin/editor/readonly). Not the same as a user row policy |
| Flag | Per-table **`rls_enabled`**. When false, the table stays on the phase-01 role matrix only (no owner predicate). When true, user/anon use policies |

## SQL shape

- `owner_eq(column)` → column = `auth.uid()`
- `claim_eq`
- SELECT / UPDATE / DELETE: parameterized `WHERE` (USING)
- UPDATE also **WITH CHECK** on the new row
- INSERT: policy check; force owner column to `auth.uid()` when configured
- A non-`service` principal **cannot change the owner column**

## Postgres RLS (defense in depth)

**Locked choice:** both of the following, because either alone is not enough.

1. Tables with `rls_enabled` are `ENABLE` + **`FORCE ROW LEVEL SECURITY`** (owner would otherwise bypass RLS).
2. The server connects as a **dedicated non-owner, non-superuser role** (`jord_app`), not as the role that owns the tables.

### Two URLs

| Env | Who | When |
|-----|-----|------|
| `JORD_MIGRATE_URL` | Table **owner**. Migration runner only | Part C migration step: create or verify `jord_app`, `GRANT`, `FORCE ROW LEVEL SECURITY`, policy DDL. **Not** used for request traffic |
| `DATABASE_URL` | Runtime. On Postgres this user **is** `jord_app` | Every request and the pool. All dialects (`file:`, `libsql://`, `postgres://`). **Name unchanged** — no second runtime env, no alias, no deprecation warning |

**Who runs the grant step, and when**

1. Operator (or CI) sets `JORD_MIGRATE_URL` to a Postgres URL whose role **owns** the application tables (or can create them). Prefer a role with **`CREATEROLE`**.
2. On boot / migrate, the **migration runner** (using `JORD_MIGRATE_URL` only for this step) ensures `jord_app` exists, grants `SELECT`/`INSERT`/`UPDATE`/`DELETE` (and any sequence usage), applies `ENABLE` + `FORCE ROW LEVEL SECURITY`, and records the migration in `jord_migrations`.
3. Runtime always opens the pool with **`DATABASE_URL`** as `jord_app`.

**`CREATEROLE` and fallback**

| Path | Behavior |
|------|----------|
| Migrate role has `CREATEROLE` | Runner creates `jord_app` if missing, then grants / FORCE RLS |
| Host denies `CREATEROLE` | Operator creates `jord_app` by hand. Runner **does not** create the role. It **verifies** the role exists, has **no `BYPASSRLS`**, **does not own** application tables, then applies grants / FORCE RLS. Fail with a clear message naming the failed check if any verification fails |

**Migrate URL ≠ runtime URL (Postgres):** refuse to boot if `JORD_MIGRATE_URL` and `DATABASE_URL` are the same connection. Compare **parsed** host, port, database, and user — not raw strings. Ignore query params and trailing slashes. Add a test.

On `file:` and `libsql://` there are no SQL roles. `JORD_MIGRATE_URL` is ignored. One `DATABASE_URL` remains the lab default.

**Startup check (Postgres only):** refuse to serve if the `DATABASE_URL` role owns any application table or has `BYPASSRLS`. `file:` / `libsql://` skip this check. Missing `JORD_MIGRATE_URL` on Postgres fails the migration step with an error that names the variable.

`set_config('jord.uid', $1, true)` or `SET LOCAL` **inside the transaction only**. Never on a pooled connection outside a transaction.

Test: concurrent requests with different uids on a **small pool** must not leak rows.

## Surface inventory

Each surface declares one access rule. A **route inventory test fails** if any mounted route has no declaration.

| Surface | Guard |
|---------|-------|
| `/records` | Role check + policy WHERE when `rls_enabled`; `service` bypass |
| Schema row routes (user-table DML) | Same predicate as `/records` |
| Schema DDL | `operator` admin only |
| Generated API | Same predicate; honor the disable list |
| Table API `/api/v1` | Same predicate when S0022 mounts it; inventory lists it before the route exists |
| Vectors | `operator` or `service` until a namespace is bound to an `rls_enabled` table; then filter hits with the same predicate. `anon`/`user` default-deny otherwise |
| Blobs | Policy check on metadata; `anon`/`user` default-deny with no blob policy. Sign-time check is S0025 |
| Realtime | Must present a principal. Delivery filter is S0023. Expired JWT closed in Part B |
| Custom `/x/:slug` | Caller principal. Steps do not escalate |
| Built-in function steps | Run as the **caller** principal |
| Triggers `invoke_function` | Default **caller**. Escalate to `service` only when an admin sets an explicit `as: service` on that trigger |
| Jobs | Run as **`service`**. Not callable by `anon` or `user` |

## Dialect conformance

One shared fixture file runs against **both** adapters: file libSQL always, Postgres when `JORD_TEST_POSTGRES_URL` is set. Same policy → same allow/deny.

## R4. Doc ownership (this card)

This card's PR updates `Docs/tech_space/jord/policies/README.md` (including the link to the threat-model ADR). Verify does not write that page.

## Definition of Done (`jord-s0021-c`)

- [x] Deny-overrides and default-deny covered by tests
- [x] UPDATE USING + WITH CHECK; owner column immutable for non-service
- [x] `FORCE ROW LEVEL SECURITY` + non-owner `jord_app` documented in `tech_space/jord/policies` and applied by the migration using `JORD_MIGRATE_URL`
- [x] Grant step ownership (runner + when) documented; no silent manual-only grant in the happy path
- [x] `CREATEROLE` path creates `jord_app`; without `CREATEROLE`, verify-only path checks exists / no `BYPASSRLS` / non-owner then grants — clear fail on any miss
- [x] On Postgres, refuse to boot if migrate and runtime URLs match (parsed host, port, database, user); test covers it
- [x] Startup check refuses a Postgres runtime role that owns tables or has `BYPASSRLS`
- [x] Runtime stays **`DATABASE_URL`** (name unchanged; no second runtime env, no alias, no deprecation warning)
- [x] `file:` boot still works with only `DATABASE_URL` (no migrate URL)
- [x] Pool leak test green on Postgres. Proof (phase-02.5 S0030, 2026-10-25, live PG): `postgres-uid-leak.test.ts` › "clears jord.uid when the transaction ends" passed
- [x] Shared dialect conformance suite green on file libSQL and Postgres. Proof: `part-c.test.ts` now runs `describe.each(["file","postgres"])` through `src/testing/harness.ts` (Postgres runtime is the `jord_app` role, FORCE RLS on). 15 shared tests pass on each backend, plus a Postgres-only test that FORCE RLS filters a raw `jord_app` query in the database
- [x] Route inventory test fails on an undeclared route
- [x] `service` bypass and existing `role_in` / `bucket_in` still work
