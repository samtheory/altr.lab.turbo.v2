---
title: "feature_list/Jord — intent map"
description: "Valid Jord intent: Slice 0, phase-01 capabilities, phase-02 features + soft candidates"
created: 2026-10-18
updated: 2026-10-25
tags:
  - feature
  - jord
  - readme
  - phase-01
  - phase-02
---

# feature_list / Jord

> **Intent layer** for Jord (engine) and Jord Studio (control plane). Open this first when deciding *what* Jord is meant to be. As-built detail lives in `tech_space/jord/`. Sprint cards live in `plan/Jord/`.

Map: [[../../brain/00-Docs-Brain]] · Idea: [[../../idea/Jord/README]] · Plan: [[../../plan/Jord/README]] · As-built: [[../../tech_space/jord/README]] · Review: [[../../report/Jord-implemented-review]] · Status: [[../../report/STATUS]] · Builder: [[../../agents/mimir/00-index|mimir]]

## How to read this folder

| Note | Role | Status |
|------|------|--------|
| [[00-intent]] | Slice 0 foundation contract (file libSQL, WAL, OCC `records`) | **Shipped** — locked baseline |
| [[04-phase-01-capabilities]] | What we have after phase-01 | **Authoritative shipped intent** |
| [[02-architecture]] | Ports, dialects, concurrency, seams | Current (matches phase-01 code) |
| [[03-jord-studio]] | Studio surfaces and build order | Phase-01 Studio **shipped** |
| [[03-phase-02-features]] | **What to implement in phase-02** (acceptance criteria) | **Execution complete** — S0027…S0026 (S0026 ADR only; runtime gated) |
| [[01-phase-02-candidates]] | Soft leftovers not in the numbered queue | Conditional only |

## Truth map (phase-aware)

| Layer | Path | Phase |
|-------|------|-------|
| Intent (this folder) | `feature_list/Jord/` | Living |
| Shipped plans | [[../../plan/Jord/phase-01/README\|plan/Jord/phase-01]] | **phase-01 done** (S0001–S0020) |
| Next plans | [[../../plan/Jord/phase-02/README\|plan/Jord/phase-02]] | **Execution complete** (S0027…S0026); Functions runtime soft backlog · [[../../plan/Jord/phase-02/00-task-rollup]] |
| As-built | [[../../tech_space/jord/README]] | Living categories |
| Code | `elements/jord` · `cloud/jord` · `apps/jord-studio` · `data/jord.db` · `data/blobs/` | Source of truth |

```mermaid
flowchart LR
  FL[feature_list/Jord] --> P1[plan/Jord/phase-01]
  FL --> P2[plan/Jord/phase-02]
  P1 -->|shipped| TS[tech_space/jord categories]
  P2 -->|next sprints| CODE[code]
  CODE -->|update category| TS
  TS --> RP[report]
```

## Gate

1. ~~Apolyx-S0005~~ — closed.
2. ~~Jord phase-01 (S0001–S0020)~~ — closed 2026-10-24.
3. Phase-02 features locked in [[03-phase-02-features]]; implement session-sized under `plan/Jord/phase-02/`.
4. Apps stay Apolyx-first (`.cursor/rules/apolyx-first.mdc`).
