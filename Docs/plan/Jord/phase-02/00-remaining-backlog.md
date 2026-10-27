---
title: "Jord phase-02 — remaining backlog"
description: "Soft leftovers after the phase-02 numbered queue; promote only if needed"
created: 2026-10-24
updated: 2026-10-25
tags:
  - plan
  - jord
  - backlog
  - phase-02
---

# Jord phase-02 — remaining backlog

> Who: **mimir**. Numbered queue: [[README]] (**complete** through S0026 ADR). Features: [[../../../feature_list/Jord/done/README]]. Soft candidates: [[../../../feature_list/Jord/INDEX]]. Progress: [[00-task-rollup]].

**Numbered queue:** finished (S0027…S0026). Soft leftovers below are not automatic next work.

## Numbered (do not duplicate)

S0021 → S0027 are indexed on [[README]]. Track progress there.

## Soft leftovers (not numbered)

| Item | Notes |
|------|-------|
| Redis-compatible cache | When live state needs it |
| Bot / second cloud process | When in-process writer is the wrong shape |
| Hosted embed API · embedding CDC | Callers still supply floats after S0020 |
| Embedded Turso replicas | S0019 deferred |
| Functions v2 **implementation** | [[Jord-S0026/README\|S0026]] ADR written ([[../../../tech_space/jord/apis/ADR-functions-v2\|recommend worker_threads]]). Still **do not implement** until a follow-up sprint is explicitly approved |

## Explicitly not Jord sprint cards

| Item | Home |
|------|------|
| Artemis trading domain / terminal | [[../../../idea/artemis/README]] |
| Tia map engine | [[../../../feature_list/tia/README]] |
| Apolyx kit carryovers | [[../../../feature_list/ui-kit/01-apolyx-s0001-carryovers]] |
| OAuth / magic links | Past S0021 |
| npm publish | Lab infra |

## Rule

Prefer extending [[../../../feature_list/Jord/done/README]] over inventing ad-hoc sprint ids from this list.
