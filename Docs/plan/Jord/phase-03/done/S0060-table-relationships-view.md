---
title: "S0060 — per-table relationships view"
description: "Focus one table at the center: incoming and outgoing FKs with cardinality, click a neighbour to re-center, inspect a constraint's behavior"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0060
  - done
---

# S0060 — per-table relationships view

> **Status:** **done** 2026-11-02 · **Depends on** [[S0055-fk-relationship-editor|S0055]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0027-relationship-canvas|jord-F0027]] · After ship: [[../../../../tech_space/jord/schema/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/fixing-motion-performance/` |
| **Suggested model** | `gpt-5.6-sol-medium` |
| **Est. time** | **1.5–2 h** |
| **Parallel?** | **No** |

## Goal

A focused relationship view for one table: the table in the center, outgoing (references) on one side and incoming (referenced by) on the other, each edge labelled with cardinality and the `ON DELETE` / `ON UPDATE` behavior; clicking a neighbour re-centers; clicking an edge opens the constraint details.

## Done when

- [x] Incoming and outgoing FKs are separated and labelled with cardinality
- [x] Clicking a neighbour re-centers and updates the URL
- [x] Constraint detail shows the behaviors
- [x] Empty state links to add an FK
- [x] Typecheck + build pass; proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/jord-studio exec node --import tsx --test src/lib/studio-table-relations.test.ts` | **3 passed** · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio typecheck` | exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio build` | exit 0 |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/schema/README.md` (+ studio) |
| Queue | [[../README]] |
