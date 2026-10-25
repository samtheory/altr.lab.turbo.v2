---
title: "plan/Jord — phase hub"
description: "Jord plan root: phase-01 archive (S0001–S0020) and phase-02 queue (S0021–S0027)"
created: 2026-10-18
updated: 2026-10-25
tags:
  - plan
  - jord
  - readme
  - phase-01
  - phase-02
---

# plan / Jord

> Sprint cards for Jord. **phase-01** is closed archive. **phase-02** holds S0021–S0027 from the gap analysis.

Intent: [[../../feature_list/Jord/README]] · Capabilities: [[../../feature_list/Jord/04-phase-01-capabilities]] · Phase-02 features: [[../../feature_list/Jord/03-phase-02-features]] · As-built: [[../../tech_space/jord/README]] · Review: [[../../report/Jord-implemented-review]] · Prompt: [[../../report/Jord-next-phase2-prompt]] · Status: [[../../report/STATUS]]

## Phases

| Phase | Folder | Status | Entry |
|-------|--------|--------|-------|
| **01** | [[phase-01/README]] | **Closed** — Jord-S0001 … Jord-S0020 | Lab data plane + Studio through hard vectors |
| **02** | [[phase-02/README]] | **Accepted on local proof** (file + live Postgres) · CI run + branch protection pending · Functions runtime gated · [[../../report/jord-phase-02-report/00-phase-02-tasks]] | Features: [[../../feature_list/Jord/03-phase-02-features]] |
| **02.5** | [[phase-02.5/README]] | **Code done** (2026-10-25): S0030 locally · S0031 · S0032 · S0033 | Review: [[../../report/Jord-phase-02-closeout-review]] |
| **02.75** | [[phase-02.75/README]] | **Active**: CI proof + admin (A), small correctness gaps (B), live S3 / hosted libSQL (C) | From 02.5 |
| **03** | _(not created)_ | **Proposed — needs a plan**; start after 02.75 group A | Candidates: [[../../feature_list/Jord/05-phase-03-candidates]] |

```mermaid
flowchart LR
  FL[feature_list] --> P1[phase-01 archive]
  FL --> P2[phase-02 next]
  P1 --> TS[tech_space/jord categories]
  P2 -->|implement| CODE[code]
  CODE -->|update category| TS
```

## Conductor rule

1. Do not reopen phase-01 cards for new scope — archive only.
2. New sprints land under the active phase folder (`plan/Jord/phase-02.75/` now; never under phase-01).
3. Numbered work is [[../../feature_list/Jord/03-phase-02-features]]; soft leftovers stay in [[../../feature_list/Jord/01-phase-02-candidates]] / [[phase-02/00-remaining-backlog]].
4. Implement **session-sized** chunks; stop for review (especially S0021 A→B→C).
5. After ship → update the matching note under `tech_space/jord/<category>/` → docs_man refreshes report + brain.

Roadmap: [[../00-roadmap-apolyx-jord-artemis]] · Agent: [[../../agents/mimir/00-index|mimir]]
