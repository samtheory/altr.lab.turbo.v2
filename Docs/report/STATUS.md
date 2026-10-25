---
title: "Status — complete vs remaining"
description: "Jord phase-01 shipped; phase-02 execution complete through S0026 ADR; Functions runtime still gated"
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

Last updated: 2026-10-25 · Living map: [[../brain/00-Docs-Brain]] · Last ship: **Jord-S0026** (Functions v2 ADR only) · **Phase-01 closed** · **Phase-02 execution complete** (S0027…S0026) · **S0027** CI workflow in tree (Actions / branch-protection `jord` still **UNVERIFIED**) · Plan review: [[Jord-phase-02-plan-review]] · Shipped review: [[Jord-implemented-review]] · Phase-02 task rollup: [[jord-phase-02-report/00-phase-02-tasks]]

## Implemented

- **Jord phase-01 (S0001–S0020)** — matrix in [[Jord-implemented-review]] · handoff [[Jord-technical-brief]] · capabilities [[../feature_list/Jord/04-phase-01-capabilities]]
- Plans archive: [[../plan/Jord/phase-01/README]] · As-built manual: [[../tech_space/jord/README]]
- **`@altr/apolyx`** through **S0005** · Apolyx-first
- **Jord-S0027 (local)** — `.github/workflows/jord.yml` · CI note [[../tech_space/jord/overview/README#ci]] · card [[../plan/Jord/phase-02/Jord-S0027/README]]
- **Jord-S0021-A (local, file libSQL)** — forward-only `jord_migrations`, baseline `0001_baseline`, checksum refuse, phase-01 fixture · [[../tech_space/jord/overview/README#boot-migrations]] · card [[../plan/Jord/phase-02/Jord-S0021/01-migration]]
- **Jord-S0021-B (local, file libSQL)** — principals, HS256 JWT, async scrypt, console mail, refresh families · [[../tech_space/jord/auth/README]] · card [[../plan/Jord/phase-02/Jord-S0021/02-auth]]
- **Jord-S0021 ADR** — accepted for Part C · [[../plan/Jord/phase-02/Jord-S0021/ADR-threat-model]]
- **Jord-S0021-C (local, file libSQL)** — deny-overrides, user/anon default-deny, `jord_table_rls`, owner column, route inventory, `jord_app` grant plan · [[../tech_space/jord/policies/README]] · card [[../plan/Jord/phase-02/Jord-S0021/03-policy]]
- **Jord-S0028 (local, file libSQL)** — CORS allow-list, data-route rate limits, 1 MiB JSON cap, write-queue drain, Idempotency-Key · [[../tech_space/jord/overview/README#http-edge-s0028]] · [[../tech_space/jord/writes/README]] · card [[../plan/Jord/phase-02/Jord-S0028/README]]
- **Jord-S0022 (local, file libSQL)** — `/api/v1/:table`, OpenAPI, Studio playground · [[../tech_space/jord/apis/README]] · card [[../plan/Jord/phase-02/Jord-S0022/README]]
- **Jord-S0023 (local, file libSQL)** — `jord_changes` outbox, tracked tables, 410 `since`, single `jord.change` path · [[../tech_space/jord/realtime/README]] · card [[../plan/Jord/phase-02/Jord-S0023/README]]
- **Jord-S0029 (local)** — private `@altr/jord-client`: refresh once, table API, SSE `since`, 410 resync · [[../tech_space/jord/apis/README]] · card [[../plan/Jord/phase-02/Jord-S0029/README]]
- **Jord-S0024 (local, file libSQL)** — SQL console, migrate wizard, users admin, batched `jord_logs` · [[../tech_space/jord/studio/README]] · card [[../plan/Jord/phase-02/Jord-S0024/README]]
- **Jord-S0025 (local, file libSQL)** — Storage v2: local HMAC + S3 adapters, sign-time policy, pending/finalize/GC, copy-plan dry-run · [[../tech_space/jord/blobs/README]] · card [[../plan/Jord/phase-02/Jord-S0025/README]]
- **Jord-S0026 (ADR only)** — Functions v2 runtime decision: recommend `worker_threads`, reject `isolated-vm` · [[../tech_space/jord/apis/ADR-functions-v2]] · card [[../plan/Jord/phase-02/Jord-S0026/README]]

## In progress

_(None on the phase-02 numbered queue.)_

## Gate — do not implement yet

- **Functions v2 runtime** — S0026 ADR is written and recommends `worker_threads`. **Do not ship** a worker pool, loader, or user-handler path until a follow-up sprint is explicitly approved. Soft backlog: [[../plan/Jord/phase-02/00-remaining-backlog]].

## Environment caveats (closed cards, open boxes)

_(Postgres tests not run: `JORD_TEST_POSTGRES_URL` unset. Part C pool-leak and dialect-pair, S0022 RETURNING, and S0023 watermark race stay open as env gaps. S0027 branch protection still a manual admin step. Live S3 bucket not exercised.)_

## Planned (repo)

Phase-02 features: [[../feature_list/Jord/03-phase-02-features]] · Queue: [[../plan/Jord/phase-02/README]] · Task rollup: [[jord-phase-02-report/00-phase-02-tasks]]

Execution (complete): **S0027** → **S0021-A/B/ADR/C** → **S0028** → **S0022** → **S0023** → **S0029** → **S0024** → **S0025** → **S0026** (ADR only).

Soft leftovers: [[../feature_list/Jord/01-phase-02-candidates]] · Artemis · Tia

## Remaining (Apolyx)

[[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]
