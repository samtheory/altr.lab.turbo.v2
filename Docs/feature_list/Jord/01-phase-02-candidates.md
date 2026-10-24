---
title: "Jord — phase-02 soft candidates"
description: "Leftover / conditional intent not yet in the numbered S0021–S0027 queue"
created: 2026-10-18
updated: 2026-10-24
tags:
  - feature
  - jord
  - phase-02
  - backlog
---

# Jord — phase-02 soft candidates

> **Numbered phase-02 work lives in [[03-phase-02-features]]** and [[../../plan/Jord/phase-02/README]]. This note keeps only soft leftovers that were **not** promoted into S0021–S0027.

Architecture: [[02-architecture]]. Studio: [[03-jord-studio]]. Shipped: [[04-phase-01-capabilities]].

## Still conditional (not numbered)

| Candidate | Outcome | Promote when |
|-----------|---------|--------------|
| Artemis agent scratchpad | Writer uses bucket `artemis` on `records` via `@altr/jord-server` (not typed trading tables) | Bot has a scratchpad payload shape |
| Redis-compatible cache | One measured cache for live state / leaderboards | Live state needs it |
| Bot / second cloud process | Separate process if in-process writer is the wrong shape | Model / writer must leave jord-server |
| Hosted embed API · embedding CDC | Jord (or a sidecar) produces embeddings | Callers should not supply floats |
| Embedded Turso replicas | Read replicas beside primary | Product needs geo/read scale |

## Promoted into the numbered queue (do not re-open here)

| Was | Now |
|-----|-----|
| Remote blob store / multipart / S3 | [[../plan/Jord/phase-02/Jord-S0025/README\|Jord-S0025]] |
| True CDC / PG LISTEN / resume | [[../plan/Jord/phase-02/Jord-S0023/README\|Jord-S0023]] |
| Studio URL editor · migrate wizard | [[../plan/Jord/phase-02/Jord-S0024/README\|Jord-S0024]] |
| Non-`records` RLS / owner policies | [[../plan/Jord/phase-02/Jord-S0021/README\|Jord-S0021]] Part C |
| CI for Jord packages | [[../plan/Jord/phase-02/Jord-S0027/README\|Jord-S0027]] |

## Explicitly not Jord phase-02 cards

| Item | Home |
|------|------|
| Artemis trading domain / terminal | [[../../idea/artemis/README]] |
| Tia map engine | [[../tia/README]] |
| Apolyx kit carryovers | [[../ui-kit/01-apolyx-s0001-carryovers]] |
| OAuth / magic links | Deferred past S0021 |
| Functions v2 **implementation** | Plan-only [[../plan/Jord/phase-02/Jord-S0026/README\|Jord-S0026]] until approved |

## Rule

Do **not** invent new sprint ids here. Extend [[03-phase-02-features]] and add a card under `plan/Jord/phase-02/` when promoting.
