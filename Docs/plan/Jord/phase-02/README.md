---
title: "plan/Jord/phase-02 — next Jord sprints"
description: "Execution order after the hardening addendum: S0027 first, then S0021, S0028, S0022…"
created: 2026-10-24
updated: 2026-10-25
tags:
  - plan
  - jord
  - phase-02
  - readme
---

# plan / Jord / phase-02

> Phase-01 archive: [[../phase-01/README]]. Features: [[../../../feature_list/Jord/03-phase-02-features]]. Review: [[../../../report/Jord-phase-02-plan-review]].

| Item | Status |
|------|--------|
| Active sprint | **S0028 HTTP hardening in the tree** (file libSQL). Next untouched stop is [[Jord-S0022/README\|S0022]]. Two S0021-C Postgres boxes stay open and do not block this stop. |
| Done in tree | [[Jord-S0027/README\|S0027]] CI workflow · [[Jord-S0021/01-migration\|S0021 Part A]] migration runner · [[Jord-S0021/02-auth\|S0021 Part B]] principals |
| Soft backlog | [[00-remaining-backlog]] |

Ids are **not** execution order. S0027 runs first. S0028 and S0029 are new.

## Execution order

| # | Id | Title | Blocked by |
|---|-----|-------|------------|
| 1 | [[Jord-S0027/README\|S0027]] | CI (safety net) | — |
| 2 | [[Jord-S0021/README\|S0021]] A | Migrations (`jord-s0021-a`) | S0027 |
| 3 | [[Jord-S0021/02-auth\|S0021]] B | Principals (`jord-s0021-b`) | A |
| 4 | [[Jord-S0021/ADR-threat-model\|ADR]] | Threat model (accepted before C) | S0021-B |
| 5 | [[Jord-S0021/03-policy\|S0021]] C | Policies (`jord-s0021-c`) | B + ADR |
| 6 | [[Jord-S0028/README\|S0028]] | HTTP hardening | S0021-C |
| 7 | [[Jord-S0022/README\|S0022]] | Table API + OpenAPI | S0028 |
| 8 | [[Jord-S0023/README\|S0023]] | Outbox CDC | S0022 |
| 9 | [[Jord-S0029/README\|S0029]] | `@altr/jord-client` | S0023 |
| 10 | [[Jord-S0024/README\|S0024]] | Studio power tools | S0029 |
| 11 | [[Jord-S0025/README\|S0025]] | Storage v2 | S0024 |
| 12 | [[Jord-S0026/README\|S0026]] | Functions v2 ADR only | — (no product blocker) |

## Process

1. One stop per session. Stop for review.
2. S0027 through S0028 are in the tree (file libSQL). Two S0021-C Postgres boxes stay open and do not block later stops. Next untouched stop is S0022.
3. Each card's PR updates its own `tech_space/jord/*` page. Verify reconciles links, ticks features, and refreshes STATUS. It writes no new content.
