---
title: "plan/Jord/phase-02.5 — phase-02 acceptance closeout"
description: "Fix queue for phase-02 acceptance gaps found in the 2026-10-25 mimir review: Postgres gate, outbox correctness, policy row scope, paperwork"
created: 2026-10-25
updated: 2026-10-27
tags:
  - plan
  - jord
  - phase-02.5
  - readme
---

# plan / Jord / phase-02.5

> Who: **mimir** (you fix, mimir reviews). Why this exists: the 2026-10-25 code-truth closeout found phase-02 **built on file libSQL but not accepted** — `owner_eq` row leak on `/api/v1` + Studio rows, outbox not same-transaction / `/api/v1` bypassed, zero live Postgres runs, CI Postgres never green. Those gaps are this queue. Phase-02 queue: [[../phase-02/README]]. Leftovers closed in [[../phase-02.75/README|phase-02.75]] (2026-10-26). Next: [[../../../feature_list/Jord/INDEX]].

**Status: code done (2026-10-25).** S0031, S0032, and S0033 are Done. S0030 is Done locally on live Postgres. CI boxes and leftovers moved to [[../phase-02.75/README|phase-02.75]] and are now closed there (branch protection remains admin-only on S0027).

**Process lock:** tick a box only with pasted command output; a placeholder or env-only “test” counts as **no test**.

## Already fixed in the review (2026-10-25)

| Fix | Where | Proof |
|-----|-------|-------|
| `owner_eq` row leak. `GET`/`PATCH`/`DELETE /api/v1/:table` and `GET /schema/tables/:name/rows` returned or changed **other users' rows** on file libSQL. The policy matched without a row, and no `WHERE` was added | Since generalized to `ListTableRowsInput.rowScope` (S0032) · `cloud/jord/src/table-api/routes.ts` · `cloud/jord/src/app.ts` | Test `scopes owner_eq reads and writes…` in `cloud/jord/src/policies/part-c.test.ts`. It fails without the fix (`['1','2']`) and passes with it |
| CI Postgres job never ran (secret-gated, engine tests only) | `.github/workflows/jord.yml`: `jord-postgres` uses a `pgvector/pgvector:pg16` service container and runs **both** `@altr/jord` and `@altr/jord-server` tests | Same suites pass locally on that image (below). First Actions run: phase-02.75 |

## Execution order

| # | Id | Title | Hats | Status | Done when |
|---|----|-------|------|--------|-----------|
| 1 | S0030 | Postgres live gate green | saga · heimdall | **Done locally** · CI run → 02.75 | `jord-postgres` job green on a PR with **zero** skipped Postgres tests |
| 2 | S0031 | Outbox correctness (F5 as written) | sindri · saga | **Done** | Outbox row commits in the **same transaction** as the data write, every write route emits, crash test proves no lost change |
| 3 | S0032 | Policy row scope completion | heimdall | **Done** | Every row-returning route is scoped for `owner_eq` **and** `claim_eq`; conformance test enumerates routes |
| 4 | S0033 | Phase-02 paperwork closeout | docs_man | **Done** | S0021 verify card ticked from proof; rollup/STATUS no longer claim things the code does not do |
| 5 | — | Manual: Actions + branch protection | **you** (repo admin) | Open → [[../phase-02.75/README\|02.75]] | Branch protection requires check `jord` (and `jord-postgres` once green) |

## Proof (2026-10-25)

Local `pgvector/pgvector:pg16` container, `JORD_TEST_POSTGRES_URL=postgres://postgres:postgres@localhost:55432/jord_test`.

| Command | Result |
|---------|--------|
| `pnpm --filter @altr/jord exec vitest run` | 22 files · 75 passed · 1 skipped (hosted `libsql://` live; needs Turso credentials) |
| `pnpm --filter @altr/jord-server exec vitest run` | 15 files · 137 passed · 3 skipped (the Postgres-only tests on their file pass) |
| `pnpm --filter @altr/jord-server exec vitest run` without `JORD_TEST_POSTGRES_URL` | 15 files · 101 passed · 3 skipped |
| `pnpm --filter @altr/jord-client exec vitest run` | 6 passed |
| `typecheck` for `@altr/jord`, `@altr/jord-server`, `@altr/jord-client`, `@altr/jord-studio` | 0 errors |

Mutation checks (each test was run against a broken build, then the code was restored):

| Break | Test that failed |
|-------|------------------|
| `claim_eq` ignored in `rowPredicateFrom` | `scopes claim_eq reads…`, `ORs two allow policies: owner OR claim…` |
| `readableWatermark` returns raw `MAX(seq)` | `a higher seq committing first is not readable…` (`expected 2 to be 0`) |
| Job runs with no RLS session | `a job run outside any request still sees RLS-protected rows` (`count: 0`) |

---

## S0030 — Postgres live gate green

**Status: Done locally.** The CI boxes are in phase-02.75.

Real bugs the first live run found, all fixed:

| Bug | Fix |
|-----|-----|
| Every Postgres boot failed: the migration splitter cut `$$` function bodies at `;` | `elements/jord/src/schema/migrations/split-sql.ts` keeps `'…'` strings and `$tag$…$tag$` bodies whole |
| `jord_app` could not use sequences (BIGSERIAL inserts failed) | Owner migration and RLS sync grant DML on all tables and `USAGE, SELECT` on all sequences |
| Table DDL and policy sync ran on the `jord_app` pool, which owns nothing | `jord-server` opens a second owner connection (`JORD_MIGRATE_URL`) for DDL and sync (`JordAppDeps.ddl`) |
| FORCE RLS on user tables with no `CREATE POLICY` denied everything | `planSyncTableRls` compiles policies for every `rls_enabled` table, not only `records` |
| User-table queries, transactions, and the SQL console ran without the session GUCs | All runtime SQL goes through one `exec` path that sets `jord.role/bucket/uid/claims` in its transaction; the SQL console uses the same `BEGIN [READ ONLY]` + GUCs |
| pgvector probe ran DDL as `jord_app` | Runtime only checks the column exists |
| An idle pool client killed by the server crashed the process (no `error` listener) | `pool.on("error")` logs instead |
| Column retype rebuild copied rows in a plain transaction; a non-superuser owner under FORCE RLS would copy nothing | `NO FORCE ROW LEVEL SECURITY` on the old table inside the rebuild transaction, and RLS is re-synced after rename / alter / drop column |
| Scheduled jobs ran with no session and saw no rows on RLS tables | The scheduler binds an `admin` session for each run |

**Done when.**

- [ ] `jord-postgres` green on a PR; vitest output shows no skipped Postgres files → phase-02.75 (needs a push). Locally: no skipped Postgres file
- [x] Watermark race test is real and green (`outbox.test.ts`)
- [x] Phase-02 cards' Postgres boxes ticked from the local run (S0021-A/C, S0022, S0023). S0024 `statement_timeout` and S0025 metadata now run on both dialects
- [ ] `jord-postgres` added to required checks → phase-02.75 (repo admin)

Dual-backend harness: `cloud/jord/src/testing/harness.ts`. On Postgres each test gets a fresh database, the owner migration, and a runtime pool **as `jord_app`**. Suites on both: table API, policies (part-c), outbox, SQL console, storage metadata, job scheduler.

---

## S0031 — Outbox correctness

**Status: Done.**

| Gap | Now |
|-----|-----|
| Not same-transaction | `writeChangeAs(principal)` in `cloud/jord/src/app.ts` runs the data write and `outbox.appendChange` in one `jord.transaction` (new on `JordDriverPort`) |
| Outside the write queue | The whole transaction is one `enqueueWrite` job |
| Errors swallowed | A failed outbox insert rolls back the data and fails the request (5xx) |
| `/api/v1/:table` writes emit nothing | POST / PATCH / DELETE emit from the `RETURNING` rows |
| Watermark is a no-op | `appendChange` marks the seq in flight; `settle` completes it after commit or abandons it after rollback |
| `pg_notify` missing | The trigger exists (`postgres/0004_outbox.sql`). `LISTEN` fan-out is **moved to phase-03** (multi-instance) and struck from F5 |
| `/records` emit is fire-and-forget | Goes through the same helper |

**Done when.**

- [x] Test: throw between data write and fan-out leaves **both or neither** rows. `outbox.test.ts`: "jord.transaction commits … or neither" and "a failing outbox insert rolls back the API write and publishes nothing" (a database trigger makes the outbox insert fail; the data row is gone and no event is published), on both dialects
- [x] Test: `POST/PATCH/DELETE /api/v1/:table` on a tracked table produces `jord_changes` rows and SSE `jord.change` (`table-api.test.ts`)
- [x] Grep proof: no `jord_changes` insert outside the transactional helper. `outbox.test.ts` › "no source file outside realtime/outbox.ts inserts into jord_changes" walks `cloud/jord/src` and `elements/jord/src`
- [x] F5 acceptance text matches code (pg_notify decided: trigger only, `LISTEN` in phase-03)

---

## S0032 — Policy row scope completion

**Status: Done.**

`PolicyDecision.constraint` became `scope?: RowScope` (`{ anyOf: RowPredicate[] }`). Each matching allow contributes the AND of its `owner_eq` / `claim_eq` rules; the scope is their OR; any matching allow with no row rule means no filter. Applied in the table API (select, count, update, delete, insert stamp), Studio rows (GET, POST stamp, PATCH keep-scope), and realtime delivery. On Postgres the same rules compile into `CREATE POLICY` (`claim_eq` reads `jord.claims`). User JWT principals now carry `sub` in `claims`, so `claim_eq { claim: "sub" }` matches in the server the same way it compiles in SQL.

**Done when.**

- [x] `claim_eq` leak test fails before, passes after (mutation check above)
- [x] Two-allow OR test returns the union: owner OR claim → union; owner OR role → every row
- [x] Route conformance test green: "no mounted row-returning route leaks a row outside the caller's scope" probes every route in the mounted inventory plus `/api/v1` filter variants as a user, on both dialects
- [x] Documented in [[../../../tech_space/jord/policies/README]]: libSQL enforces row scope only in the server

---

## S0033 — Phase-02 paperwork closeout

**Status: Done.**

- [x] [[../phase-02/Jord-S0021/04-verify]] boxes ticked from command output
- [x] [[../phase-02/Jord-S0021/README]] "A, B, and C each have their own DoD green" ticked
- [x] F1–F5 statuses in [[../../../feature_list/Jord/done/README]] updated from proof
- [x] [[../phase-02/00-task-rollup]] "single change event path" is now true
- [x] Pre-approval plan-review snapshot retired (plan cards + this closeout are the record)
- [x] In-memory stores (rate limit, idempotency, SQL history, realtime bus, watermark) stated in [[../../../tech_space/jord/overview/README]]
- [x] STATUS + brain refreshed. Phase-02 is **accepted on local proof**; the CI run and branch protection are tracked in phase-02.75

## Rule

No new features here. Anything that is not a phase-02 acceptance gap goes to [[../../../feature_list/Jord/INDEX]] or, if it is a leftover gap, [[../phase-02.75/README|phase-02.75]].
