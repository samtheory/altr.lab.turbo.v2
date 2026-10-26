---
title: "Status — complete vs remaining"
description: "Jord phase-01 shipped; phase-02 accepted; phase-02.75 closed 2026-10-26; phase-03 candidates open for planning; Functions runtime still gated"
created: 2026-09-19
updated: 2026-10-26
tags:
  - report
  - status
  - jord
  - phase-01
  - phase-02
---

# Status

Last updated: 2026-10-26 · Living map: [[../brain/00-Docs-Brain]] · Last ship: **phase-02.75 closed** [[../plan/Jord/phase-02.75/README]] (hosted libSQL atomic tx, console `resync`, PATCH `old`, MinIO S3 live, teardown noise filtered; local CI mirror with pgvector + MinIO) · **Phase-01 closed** · **Phase-02 accepted** · Closeout review [[Jord-phase-02-closeout-review]] · Plan review (historical): [[Jord-phase-02-plan-review]] · Shipped review: [[Jord-implemented-review]] · Phase-02 task rollup: [[jord-phase-02-report/00-phase-02-tasks]]

## Implemented

- **Jord phase-01 (S0001–S0020)** — matrix in [[Jord-implemented-review]] · handoff [[Jord-technical-brief]] · capabilities [[../feature_list/Jord/04-phase-01-capabilities]]
- Plans archive: [[../plan/Jord/phase-01/README]] · As-built manual: [[../tech_space/jord/README]]
- **`@altr/apolyx`** through **S0005** · Apolyx-first
- **Jord-S0027** — `.github/workflows/jord.yml` (`jord` + `jord-postgres` with MinIO) · local CI mirror green 2026-10-26 · branch protection still a one-shot admin step · [[../tech_space/jord/overview/README#ci]] · card [[../plan/Jord/phase-02/Jord-S0027/README]]
- **Jord-S0021-A/B/ADR/C** through **Jord-S0026** — as before; see prior STATUS lines and the phase-02 rollup
- **Phase-02.5 (S0030–S0033)** — live Postgres gate, transactional outbox, row scope · [[../plan/Jord/phase-02.5/README]]
- **Phase-02.75** — B1–B5, B8, C1 done; B6/B7 → phase-03; C2 secret-gated / manual-only · [[../plan/Jord/phase-02.75/README]]

## In progress

- **Phase-03** — **Proposed, needs a plan**: [[../feature_list/Jord/05-phase-03-candidates]]. Planning may start; create `plan/Jord/phase-03/` when the list is approved.
- **S0027 branch protection** — ops only; commands on the S0027 card. Not open product debt.

## Gate — do not implement yet

- **Functions v2 runtime** — S0026 ADR recommends `worker_threads`. **Do not ship** a worker pool until a follow-up sprint is approved. Soft backlog: [[../plan/Jord/phase-02/00-remaining-backlog]]. Phase-03 P3.

## Environment caveats

_(Postgres + MinIO exercised locally 2026-10-26. Hosted `libsql://` live test runs only when Turso secrets are set; atomicity is proven every run via the forced interactive path. Branch protection is admin.)_

## Planned (repo)

Phase-02 features: [[../feature_list/Jord/03-phase-02-features]] · Queue: [[../plan/Jord/README]] · Task rollup: [[jord-phase-02-report/00-phase-02-tasks]] · Phase-03 candidates: [[../feature_list/Jord/05-phase-03-candidates]]

Soft leftovers: [[../feature_list/Jord/01-phase-02-candidates]] · Artemis · Tia

## Remaining (Apolyx)

[[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]
