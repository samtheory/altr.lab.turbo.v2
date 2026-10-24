---
title: "Jord phase-02 — remaining backlog"
description: "Soft leftovers after the S0021–S0027 queue is defined; promote only if needed"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - backlog
  - phase-02
---

# Jord phase-02 — remaining backlog

> Who: **mimir**. Numbered queue: [[README]]. Features: [[../../../feature_list/Jord/03-phase-02-features]]. Soft candidates: [[../../../feature_list/Jord/01-phase-02-candidates]]. Prompt: [[../../../report/Jord-next-phase2-prompt]].

**Next when approved:** [[Jord-S0027/README|Jord-S0027]] CI, then [[Jord-S0021/README|Jord-S0021]] Part A.  
**New cards:** [[Jord-S0028/README|Jord-S0028]] hardening (before the table API) · [[Jord-S0029/README|Jord-S0029]] client (after CDC).

## Numbered (do not duplicate)

S0021 → S0027 are indexed on [[README]]. Track progress there.

## Soft leftovers (not numbered)

| Item | Notes |
|------|-------|
| Redis-compatible cache | When live state needs it |
| Bot / second cloud process | When in-process writer is the wrong shape |
| Hosted embed API · embedding CDC | Callers still supply floats after S0020 |
| Embedded Turso replicas | S0019 deferred |
| Functions v2 **implementation** | Only after [[Jord-S0026/README\|S0026]] ADR approval |

## Explicitly not Jord sprint cards

| Item | Home |
|------|------|
| Artemis trading domain / terminal | [[../../../idea/artemis/README]] |
| Tia map engine | [[../../../feature_list/tia/README]] |
| Apolyx kit carryovers | [[../../../feature_list/ui-kit/01-apolyx-s0001-carryovers]] |
| OAuth / magic links | Past S0021 |
| npm publish | Lab infra |

## Rule

Prefer extending [[../../../feature_list/Jord/03-phase-02-features]] over inventing ad-hoc sprint ids from this list.
