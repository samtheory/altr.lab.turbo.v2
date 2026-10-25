---
title: "plan/Jord/phase-02.75 — leftovers before phase-03"
description: "To-do list of what phase-02 and phase-02.5 left open: CI proof, admin steps, and small correctness gaps found during the 02.5 live Postgres run"
created: 2026-10-25
updated: 2026-10-25
tags:
  - plan
  - jord
  - phase-02.75
  - readme
---

# plan / Jord / phase-02.75

> Who: **mimir**. Comes from: [[../phase-02.5/README|phase-02.5]] (code done 2026-10-25). Next: phase-03 planning from [[../../../feature_list/Jord/05-phase-03-candidates]].

Phase-02 and phase-02.5 pass every engine and server suite on file libSQL **and** live Postgres (as `jord_app`, FORCE RLS on). What is left is below. Group A blocks formal phase-02 acceptance. Groups B and C are small gaps found while closing 02.5; none is a known data leak. No new features here; feature work goes to phase-03.

## A. Proof and admin (blocks "phase-02 Accepted")

| # | To do | Who | Done when |
|---|-------|-----|-----------|
| A1 | Commit and push the phase-02.5 tree; open a PR | you | PR exists |
| A2 | First green `jord` and `jord-postgres` Actions runs | you → mimir reads the log | Run links pasted on [[../phase-02/Jord-S0027/README]] and phase-02.5 S0030; `jord-postgres` log shows the Postgres suites ran (no skipped Postgres files) |
| A3 | Branch protection requires `jord` and `jord-postgres` | repo admin | Screenshot or `gh api repos/:owner/:repo/branches/main/protection` output pasted |

## B. Correctness gaps (code)

| # | Gap | Today | Done when |
|---|-----|-------|-----------|
| B1 | ~~`renameTable` does not move `jord_table_rls`, `jord_policies`, or `jord_tracked_tables` rows to the new name~~ | **Done 2026-10-25.** Both adapters rename and move the rows of every table in `TABLE_NAME_METADATA` (`jord_table_rls`, `jord_policies`, `jord_triggers`, `jord_tracked_tables`) in one transaction. Postgres also drops the old `jord_rls_<old>_*` policies; the server's RLS sync recreates them under the new name | Test: part-c "a table rename keeps RLS, policies, outbox tracking and the row scope" (file + Postgres). Mutation: skip the row move → both fail on `jord_table_rls`; skip the policy drop → Postgres fails on the policy names |
| B2 | ~~Column retype rebuild under a **non-superuser** owner~~ | **Done 2026-10-26.** Harness option `openTestDb("postgres", { owner: "plain" })` creates the database `OWNER jord_owner_test` (`NOSUPERUSER NOBYPASSRLS`, no `CREATEROLE` needed because `jord_app` already exists) | Test: part-c "a non-superuser table owner keeps every row through retype and rename" (Postgres). It asserts the owner is not super and not bypass. Mutation: drop `NO FORCE ROW LEVEL SECURITY` from the rebuild → admin sees `[]` instead of rows 1–3 |
| B3 | Hosted `libsql://` has no atomic `jord.transaction` | Data and outbox are written in order but not atomically | Use the libSQL interactive transaction (or `batch`) for hosted URLs; test behind the hosted-live env |
| B4 | SQL console writes and the migrate wizard do not emit `jord.change` | Documented gap | Decide: emit a table-level "resync" event after a console write, or keep as documented and say so in Studio |
| B5 | ~~`/api/v1` PATCH emits `old: null`~~ | **Done 2026-10-26.** The PATCH reads the matching rows (`SELECT … FOR UPDATE` on Postgres) inside the write transaction, then updates only those primary keys and stores the prior row as `old_json` | Test: table-api "writes jord_changes…" asserts the update's `old_json` is `{ id: "1", title: "a" }` on file and Postgres. Mutation: hard-code `oldRow: null` → both fail |
| B6 | ~~`JORD_PG_WRITE_CONCURRENCY` was planned but never built~~ | **Moved to phase-03 P1 (decided 2026-10-26).** Postgres writes stay on the single queue (concurrency 1), which is correct and documented in invariant 2. Running above 1 needs the shared commit watermark, which is P1 work | Tracked on [[../../../feature_list/Jord/05-phase-03-candidates]] P1. Not built here |
| B7 | ~~Custom JWT claims~~ | **Moved to phase-03 P4 Auth v2 (decided 2026-10-26).** Tokens still carry `iss`, `aud`, `sub`, `email` only, so `claim_eq` scopes by `sub` or `email`. Picking the claim source is an Auth v2 design decision | Tracked on [[../../../feature_list/Jord/05-phase-03-candidates]] P4. Not built here |
| B8 | Test teardown noise: `idle postgres client error: terminating connection` | Harmless log when `DROP DATABASE … WITH (FORCE)` kills idle clients | Harness closes every pool (logs batcher, scheduler) before dropping, or filters the log in tests |

## C. Not exercised live

| # | Item | Done when |
|---|------|-----------|
| C1 | S3 / R2 storage adapter | MinIO service container in `jord-postgres` (or its own job) runs the sign → upload → finalize flow against the S3 adapter |
| C2 | Hosted `libsql://` engine test | Runs in CI with a Turso test database secret, or documented as manual-only |

## Already resolved in 02.5 (do not reopen)

- `getRecord` bypass read (`row_security = off`) as `jord_app`: works on live Postgres (admin 200 before and after RLS, user 403). Test: part-c "reads one record by id…".
- Background jobs without an RLS session: fixed (scheduler binds `admin`), test fails without the fix.

## Proof log

| Date | Item | Command | Result |
|------|------|---------|--------|
| 2026-10-25 | B1 | `pnpm --filter @altr/jord exec vitest run` | 22 files, 75 passed, 1 skipped |
| 2026-10-25 | B1 | `JORD_TEST_POSTGRES_URL=… pnpm --filter @altr/jord-server exec vitest run` | 15 files, 139 passed, 3 skipped |
| 2026-10-25 | B1 | same, file only | 15 files, 102 passed, 3 skipped |
| 2026-10-25 | B1 | typecheck `jord`, `jord-server`, `jord-client`, `jord-studio` | 0 errors each |
| 2026-10-26 | B2 | `JORD_TEST_POSTGRES_URL=… pnpm --filter @altr/jord-server exec vitest run` | 15 files, 140 passed, 4 skipped |
| 2026-10-26 | B2 | same, file only | 15 files, 102 passed, 4 skipped |
| 2026-10-26 | B2 | engine suite; typecheck `jord`, `jord-server` | 75 passed, 1 skipped; 0 errors |
| 2026-10-26 | B5 | `JORD_TEST_POSTGRES_URL=… pnpm --filter @altr/jord-server exec vitest run src/table-api` | 10 passed |
| 2026-10-26 | B5 | same, file only | 5 passed |
| 2026-10-26 | B5 | typecheck `@altr/jord-server` | 0 errors |

## Phase-03 planning

Phase-03 **needs a plan**: [[../../../feature_list/Jord/05-phase-03-candidates]] is still "Proposed, not approved" and there is no `plan/Jord/phase-03/` folder. Planning can start once group A is green. Items here that are really phase-03 scope (B6, B7, `LISTEN` fan-out) are cross-linked from the candidates page.
