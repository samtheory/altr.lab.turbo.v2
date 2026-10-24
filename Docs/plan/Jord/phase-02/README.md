---
title: "plan/Jord/phase-02 — next Jord sprints"
description: "Phase-02 queue: S0021–S0027 from gap analysis; implement session-sized chunks"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - phase-02
  - readme
---

# plan / Jord / phase-02

> **Implementation home for S0021+.** Phase-01 archive: [[../phase-01/README]]. Hub: [[../README]]. Features: [[../../../feature_list/Jord/03-phase-02-features]]. Prompt: [[../../../report/Jord-next-phase2-prompt]].

| Item | Status |
|------|--------|
| Active sprint | [[Jord-S0021/README\|Jord-S0021]] — **awaiting planning approval** |
| Soft backlog | [[00-remaining-backlog]] |
| As-built | Update category under [[../../../tech_space/jord/README]] |

## Process (locked)

1. **Roadmap once** — features + cards already written.
2. **Implement small** — one session-sized chunk; stop for review (S0021 = Parts A → B → C).
3. **Do not** implement the whole phase in one run.
4. After verify → update `tech_space/jord/<category>/` → docs_man.

## Sprint index

| Id | Title | Depends | Session fit |
|----|-------|---------|-------------|
| [[Jord-S0021/README\|S0021]] | Migration + principal auth + unified policies | — | **3 stops** (A/B/C) |
| [[Jord-S0022/README\|S0022]] | Table API + OpenAPI | S0021 | 1–2 sessions |
| [[Jord-S0023/README\|S0023]] | Outbox CDC + realtime resume | S0021 (pref. S0022) | 1–2 sessions |
| [[Jord-S0024/README\|S0024]] | Studio power tools | S0021 | 1–2 sessions |
| [[Jord-S0025/README\|S0025]] | Storage v2 (S3) | S0021 | 1 session |
| [[Jord-S0026/README\|S0026]] | Functions v2 — **ADR only** | — | plan only |
| [[Jord-S0027/README\|S0027]] | CI for Jord packages | — | small; parallel with S0021 |

## Next action

Approve this plan → implement **S0021 Part A only** ([[Jord-S0021/01-migration]]) → stop.
