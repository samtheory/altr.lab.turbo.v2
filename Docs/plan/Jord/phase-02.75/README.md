---
title: "plan/Jord/phase-02.75 — leftovers before phase-03"
description: "Closed 2026-10-26: CI-shaped local proof, correctness gaps, MinIO S3 live; hosted libSQL live is secret-gated / manual-only"
created: 2026-10-25
updated: 2026-10-26
tags:
  - plan
  - jord
  - phase-02.75
  - readme
  - closed
---

# plan / Jord / phase-02.75

> Who: **mimir**. Comes from: [[../phase-02.5/README|phase-02.5]] (code done 2026-10-25). **Status: closed 2026-10-26.** Next: phase-03 planning from [[../../../feature_list/Jord/INDEX]].

Phase-02 and phase-02.5 already passed every engine and server suite on file libSQL **and** live Postgres. This phase closed the leftover correctness gaps, exercised S3 against MinIO, and locked hosted `libsql://` live as secret-gated. No product features were added; B6 / B7 stay on phase-03.

## A. Proof and admin

| # | To do | Status | Done when / proof |
|---|-------|--------|-------------------|
| A1 | Land the phase-02.5 / 02.75 tree on the default branch | **Done** | On `main` (through `8f95541` and earlier). No open PR required once landed |
| A2 | First green `jord` + `jord-postgres` shape | **Done (local CI mirror 2026-10-26)** | Same containers as `.github/workflows/jord.yml`: `pgvector/pgvector:pg16` + MinIO. Suites below in the proof log show Postgres files ran (not skipped) and `s3-live` passed. Paste a GitHub Actions run URL onto [[../phase-02/Jord-S0027/README]] when `gh` is authenticated — that is ops visibility, not open code |
| A3 | Branch protection requires `jord` and `jord-postgres` | **Ops checklist (not code)** | Repo admin once. Commands: see [[../phase-02/Jord-S0027/README#branch-protection]]. Does not reopen this phase |

## B. Correctness gaps (code)

| # | Gap | Status |
|---|-----|--------|
| B1 | `renameTable` moves `TABLE_NAME_METADATA` rows; Postgres drops old `jord_rls_*` | **Done 2026-10-25** |
| B2 | Column retype / rename under non-superuser owner | **Done 2026-10-26** |
| B3 | Hosted `libsql://` atomic `jord.transaction` | **Done 2026-10-26.** Interactive `client.transaction("write")` with statement routing. Always-on proof: `openLibSqlWithInteractiveTxForTests` on `file:`. Live Turso: secret-gated (C2) |
| B4 | SQL console / migrate CDC | **Done 2026-10-26.** Console writes emit one `op: "resync"` per tracked table. Migrate wizard intentionally emits nothing here (writes the destination; same-DB target refused with 400) |
| B5 | `/api/v1` PATCH `old_json` | **Done 2026-10-26** |
| B6 | `JORD_PG_WRITE_CONCURRENCY` | **Moved to jord-F0013** (concurrency 1 stays correct) |
| B7 | Custom JWT claims | **Moved to phase-03 P4** |
| B8 | Idle postgres client teardown noise | **Done 2026-10-26.** Harness waits for disconnect before `DROP DATABASE … WITH (FORCE)`; pool `error` handler suppresses expected terminate / missing-database messages |

Extra (same window): WebSocket live delivery uses the same fail-closed policy gate as SSE (`liveDeliveryAllowed`).

## C. Live exercise

| # | Item | Status |
|---|------|--------|
| C1 | S3 / R2 storage adapter | **Done 2026-10-26.** MinIO service in `jord-postgres` job; `cloud/jord/src/storage/s3-live.test.ts` sign → upload → finalize green locally against MinIO |
| C2 | Hosted `libsql://` engine test | **Closed as secret-gated / manual-only.** CI wires `JORD_TEST_LIBSQL_URL` + `JORD_TEST_LIBSQL_AUTH_TOKEN` when present; without secrets the live case skips. Atomicity is still proven on every CI run via the forced interactive path (B3) |

## Already resolved in 02.5 (do not reopen)

- `getRecord` bypass read (`row_security = off`) as `jord_app`
- Background jobs bind an `admin` RLS session

## Proof log

| Date | Item | Command | Result |
|------|------|---------|--------|
| 2026-10-25 | B1 | `pnpm --filter @altr/jord exec vitest run` | 22 files, 75 passed, 1 skipped |
| 2026-10-25 | B1 | `JORD_TEST_POSTGRES_URL=… pnpm --filter @altr/jord-server exec vitest run` | 15 files, 139 passed, 3 skipped |
| 2026-10-26 | B2 | Postgres + file server suites | 140 / 102 passed |
| 2026-10-26 | B5 | `vitest run src/table-api` file + Postgres | 5 / 10 passed |
| 2026-10-26 | Closeout | `pnpm --filter @altr/jord typecheck` + `test` with live Postgres | 0 errors; **96 passed, 2 skipped** (hosted libSQL live) |
| 2026-10-26 | Closeout | `JORD_TEST_POSTGRES_URL` + MinIO env → `pnpm --filter @altr/jord-server typecheck` + `test` | 0 errors; **178 passed, 7 skipped**; `s3-live` **1 passed** |
| 2026-10-26 | Closeout | `jord-client` typecheck + test; `jord-studio` typecheck | 7 passed; 0 errors |

## Phase-03

Candidates: [[../../../feature_list/Jord/INDEX]] (**Proposed — needs a plan**). Create `plan/Jord/phase-03/` when the list is approved. B6, B7, and `LISTEN` fan-out stay there.
