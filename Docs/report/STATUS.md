---
title: "Status — complete vs remaining"
description: "Jord phase-01 shipped; phase-02 accepted; phase-02.75 closed 2026-10-26; phase-03 candidates open for planning; Functions runtime still gated"
created: 2026-09-19
updated: 2026-10-27
tags:
  - report
  - status
  - jord
  - phase-01
  - phase-02
---

# Status

Last updated: 2026-10-27 · Living map: [[../brain/00-Docs-Brain]] · Last ship: **phase-02.75 closed** [[../plan/Jord/phase-02.75/README]] (hosted libSQL atomic tx, console `resync`, PATCH `old`, MinIO S3 live, teardown noise filtered; local CI mirror with pgvector + MinIO) · **Phase-01 closed** · **Phase-02 accepted** · Closeout: [[../plan/Jord/phase-02.5/README]] · Shipped review: [[Jord-implemented-review]] · Phase-02 task rollup: [[../plan/Jord/phase-02/00-task-rollup]]

## Implemented

- **Jord phase-01 (S0001–S0020)** — matrix in [[Jord-implemented-review]] · capabilities [[../feature_list/Jord/done/README]] · as-built [[../tech_space/jord/README]]
- Plans archive: [[../plan/Jord/phase-01/README]]
- **`@altr/apolyx`** through **S0005** · Apolyx-first · screenshots [[../tech_space/ui-kit/assets]]
- **Jord-S0027** — `.github/workflows/jord.yml` (`jord` + `jord-postgres` with MinIO) · local CI mirror green 2026-10-26 · branch protection still a one-shot admin step · [[../tech_space/jord/overview/README#ci]] · card [[../plan/Jord/phase-02/Jord-S0027/README]]
- **Jord-S0021-A/B/ADR/C** through **Jord-S0026** — see [[../plan/Jord/phase-02/00-task-rollup]]
- **Phase-02.5 (S0030–S0033)** — live Postgres gate, transactional outbox, row scope · [[../plan/Jord/phase-02.5/README]]
- **Phase-02.75** — B1–B5, B8, C1 done; B6/B7 → phase-03; C2 secret-gated / manual-only · [[../plan/Jord/phase-02.75/README]]

## In progress

- **Phase-03** — **Active single-task queue**: [[../plan/Jord/phase-03/README]]. First cards: [[../plan/Jord/phase-03/S0034-health-probes|S0034]] · [[../plan/Jord/phase-03/S0035-structured-json-logs|S0035]] under parent **[[../feature_list/Jord/todo/jord-F0013-production-ops|jord-F0013]]**. Feature index: [[../feature_list/Jord/INDEX]].
- **S0027 branch protection** — ops only; commands on the S0027 card. Not open product debt.

## Gate — do not implement yet

- **Functions v2 runtime** — S0026 ADR recommends `worker_threads`. **Do not ship** until approved. Feature: [[../feature_list/Jord/todo/jord-F0015-functions-runtime|jord-F0015]].

## Environment caveats

_(Postgres + MinIO exercised locally 2026-10-26. Hosted `libsql://` live test runs only when Turso secrets are set; atomicity is proven every run via the forced interactive path. Branch protection is admin.)_

## Planned (repo)

Feature map: [[../feature_list/Jord/README]] · **done/** [[../feature_list/Jord/done/README]] · **todo/** [[../feature_list/Jord/todo/README]] · Phase-03 tasks: [[../plan/Jord/phase-03/README]] · Queue hub: [[../plan/Jord/README]] · Task template: [[../agents/templates/plan-task]] · Phase-02 rollup: [[../plan/Jord/phase-02/00-task-rollup]]

Soft leftovers: [[../feature_list/Jord/todo/jord-F0020-soft-leftovers|jord-F0020]] · Artemis · Tia

## Remaining (Apolyx)

[[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]
