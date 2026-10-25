---
title: "Status — complete vs remaining"
description: "Jord phase-01 shipped; S0027 through S0022 in tree for file libSQL; next untouched stop is S0023"
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

Last updated: 2026-10-25 · Living map: [[../brain/00-Docs-Brain]] · Last ship: **Jord-S0022** (table API, file libSQL) · **Phase-01 closed** · **S0027** CI workflow in tree (Actions / branch-protection `jord` still **UNVERIFIED**) · Plan review: [[Jord-phase-02-plan-review]] · Shipped review: [[Jord-implemented-review]]

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

## In progress

_(Postgres tests not run: `JORD_TEST_POSTGRES_URL` unset. Part C pool-leak and dialect-pair boxes stay open. S0022 RETURNING was not run on Postgres. S0027 branch protection still a manual admin step.)_

## Planned (repo)

Phase-02 features: [[../feature_list/Jord/03-phase-02-features]] · Queue: [[../plan/Jord/phase-02/README]]

Execution (ids are not this order): **S0027** CI (workflow in tree) → **S0021-A** migrations (file libSQL in tree) → **S0021-B** principals (file libSQL in tree) → **S0021 ADR** accepted → **S0021-C** policies (file libSQL in tree; two Postgres boxes open) → **S0028** HTTP hardening (file libSQL in tree) → **S0022** table API (file libSQL in tree; Postgres RETURNING not run) → **S0023** CDC → **S0029** client → **S0024** Studio → **S0025** storage → **S0026** functions ADR only.

Soft leftovers: [[../feature_list/Jord/01-phase-02-candidates]] · Artemis · Tia

## Remaining (Apolyx)

[[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]
