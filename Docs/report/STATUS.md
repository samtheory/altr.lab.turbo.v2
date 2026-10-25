---
title: "Status — complete vs remaining"
description: "Jord phase-01 shipped; phase-02 accepted on local proof after phase-02.5; phase-02.75 holds CI proof and small gaps; Functions runtime still gated"
created: 2026-09-19
updated: 2026-10-25
tags:
  - report
  - status
  - jord
  - phase-01
  - phase-02
---

# Status

Last updated: 2026-10-25 · Living map: [[../brain/00-Docs-Brain]] · Last ship: **phase-02.5** (S0030 Postgres gate locally, S0031 transactional outbox, S0032 row scope, S0033 paperwork) · **Phase-01 closed** · **Phase-02 accepted on local proof** (every server suite on file libSQL and live Postgres as `jord_app`; closeout review [[Jord-phase-02-closeout-review]]) · **Phase-02.75 active** [[../plan/Jord/phase-02.75/README]] (first green Actions run, branch protection, small gaps) · Plan review (historical): [[Jord-phase-02-plan-review]] · Shipped review: [[Jord-implemented-review]] · Phase-02 task rollup: [[jord-phase-02-report/00-phase-02-tasks]]

## Implemented

- **Jord phase-01 (S0001–S0020)** — matrix in [[Jord-implemented-review]] · handoff [[Jord-technical-brief]] · capabilities [[../feature_list/Jord/04-phase-01-capabilities]]
- Plans archive: [[../plan/Jord/phase-01/README]] · As-built manual: [[../tech_space/jord/README]]
- **`@altr/apolyx`** through **S0005** · Apolyx-first
- **Jord-S0027 (local)** — `.github/workflows/jord.yml` · CI note [[../tech_space/jord/overview/README#ci]] · card [[../plan/Jord/phase-02/Jord-S0027/README]]
- **Jord-S0021-A (file + live Postgres)** — forward-only `jord_migrations`, baseline `0001_baseline`, checksum refuse, phase-01 fixture · [[../tech_space/jord/overview/README#boot-migrations]] · card [[../plan/Jord/phase-02/Jord-S0021/01-migration]]
- **Jord-S0021-B (file + live Postgres)** — principals, HS256 JWT, async scrypt, console mail, refresh families · [[../tech_space/jord/auth/README]] · card [[../plan/Jord/phase-02/Jord-S0021/02-auth]]
- **Jord-S0021 ADR** — accepted for Part C · [[../plan/Jord/phase-02/Jord-S0021/ADR-threat-model]]
- **Jord-S0021-C (file + live Postgres)** — deny-overrides, user/anon default-deny, `jord_table_rls`, owner column, route inventory, `jord_app` grant plan · [[../tech_space/jord/policies/README]] · card [[../plan/Jord/phase-02/Jord-S0021/03-policy]]
- **Jord-S0028 (file + live Postgres)** — CORS allow-list, data-route rate limits, 1 MiB JSON cap, write-queue drain, Idempotency-Key · [[../tech_space/jord/overview/README#http-edge-s0028]] · [[../tech_space/jord/writes/README]] · card [[../plan/Jord/phase-02/Jord-S0028/README]]
- **Jord-S0022 (file + live Postgres)** — `/api/v1/:table`, OpenAPI, Studio playground · [[../tech_space/jord/apis/README]] · card [[../plan/Jord/phase-02/Jord-S0022/README]]
- **Jord-S0023 (file + live Postgres)** — `jord_changes` outbox, tracked tables, 410 `since`, single `jord.change` path · [[../tech_space/jord/realtime/README]] · card [[../plan/Jord/phase-02/Jord-S0023/README]]
- **Jord-S0029 (local)** — private `@altr/jord-client`: refresh once, table API, SSE `since`, 410 resync · [[../tech_space/jord/apis/README]] · card [[../plan/Jord/phase-02/Jord-S0029/README]]
- **Jord-S0024 (file + live Postgres)** — SQL console, migrate wizard, users admin, batched `jord_logs` · [[../tech_space/jord/studio/README]] · card [[../plan/Jord/phase-02/Jord-S0024/README]]
- **Jord-S0025 (file + live Postgres)** — Storage v2: local HMAC + S3 adapters, sign-time policy, pending/finalize/GC, copy-plan dry-run · [[../tech_space/jord/blobs/README]] · card [[../plan/Jord/phase-02/Jord-S0025/README]]
- **Jord-S0026 (ADR only)** — Functions v2 runtime decision: recommend `worker_threads`, reject `isolated-vm` · [[../tech_space/jord/apis/ADR-functions-v2]] · card [[../plan/Jord/phase-02/Jord-S0026/README]]

## In progress

- **Phase-02.5 — code done** ([[../plan/Jord/phase-02.5/README]]). S0030: dual-backend harness, live Postgres runs for table API / policies / outbox / SQL console / storage / jobs, nine real Postgres bugs fixed. S0031: one transactional outbox helper for every write route, real watermark, fail-closed. S0032: `owner_eq` + `claim_eq` row scope ORed across allows, user-table `CREATE POLICY`, route conformance test. S0033: verify card, features, rollup, tech_space.
- **Phase-02.75 — active** ([[../plan/Jord/phase-02.75/README]]): A) push, first green `jord` + `jord-postgres` Actions runs, branch protection; B) rename-table RLS move (B1 done 2026-10-25), non-superuser rebuild test (B2 done 2026-10-26), hosted libSQL atomic tx, console emits, PATCH `old` (B5 done 2026-10-26), `JORD_PG_WRITE_CONCURRENCY`, custom claims; C) live S3 (MinIO), hosted libSQL CI.
- **Phase-03** needs a plan (no folder yet): [[../feature_list/Jord/05-phase-03-candidates]]. Start after 02.75 group A.

## Gate — do not implement yet

- **Functions v2 runtime** — S0026 ADR is written and recommends `worker_threads`. **Do not ship** a worker pool, loader, or user-handler path until a follow-up sprint is explicitly approved. Soft backlog: [[../plan/Jord/phase-02/00-remaining-backlog]].

## Environment caveats (closed cards, open boxes)

_(Postgres boxes closed from a local `pgvector/pgvector:pg16` run on 2026-10-25. Still open: the first green `jord-postgres` Actions run, S0027 branch protection (manual admin), live S3 bucket, hosted `libsql://` live test. All tracked in [[../plan/Jord/phase-02.75/README]].)_

## Planned (repo)

Phase-02 features: [[../feature_list/Jord/03-phase-02-features]] · Queue: [[../plan/Jord/phase-02/README]] · Task rollup: [[jord-phase-02-report/00-phase-02-tasks]]

Execution (complete): **S0027** → **S0021-A/B/ADR/C** → **S0028** → **S0022** → **S0023** → **S0029** → **S0024** → **S0025** → **S0026** (ADR only).

Soft leftovers: [[../feature_list/Jord/01-phase-02-candidates]] · Artemis · Tia

## Remaining (Apolyx)

[[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]
