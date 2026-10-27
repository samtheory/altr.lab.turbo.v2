---
title: "feature_list/Jord — intent map"
description: "Jord intent indexed as jord-F####. done/ shipped, todo/ open, INDEX is the id table."
created: 2026-10-18
updated: 2026-10-27
tags:
  - feature
  - jord
  - readme
---

# feature_list / Jord

> Intent for Jord + Studio. **Feature ids:** [[INDEX]] (`jord-F0001`…). Brain: [[../../brain/00-Docs-Brain]]. As-built: [[../../tech_space/jord/README]]. Plans: [[../../plan/Jord/README]]. Status: [[../../report/STATUS]].

## Layout

| Folder | Role | Open |
|--------|------|------|
| [[INDEX]] | Stable `jord-F####` table | Cite IDs from plan / tech_space |
| [[done/README\|done/]] | Shipped `jord-F0001`…`F0012` | [[done/jord-F0001-overview]] |
| [[todo/README\|todo/]] | Open `jord-F0013`… | [[todo/jord-F0013-production-ops]] · tasks [[../../plan/Jord/phase-03/README]] |

```mermaid
flowchart LR
  IX[INDEX jord-F####]
  IX --> DONE[done F0001-F0012]
  IX --> TODO[todo F0013+]
  TODO --> P3[plan phase-03 tasks]
  DONE --> TS[tech_space/jord]
```

## Gate

1. ~~Phase-01 / 02 / 02.5 / 02.75~~ — closed or accepted.
2. **Phase-03** — implement plan tasks under parent feature **jord-F0013+** ([[../../plan/Jord/phase-03/README]]).
3. Apps stay Apolyx-first.
