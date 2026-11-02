---
title: "S0057 — row operations, pagination and 10k-row performance"
description: "Insert from the inspector, duplicate, delete, multi-select bulk delete, fetch-more pagination and virtualized 10k-row scrolling"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0057
  - done
---

# S0057 — row operations, pagination and 10k-row performance

> **Status:** **done** 2026-11-02 · **Depends on** [[S0056-grid-column-ops|S0056]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0025-tables-workspace-v2|jord-F0025]] · After ship: [[../../../../tech_space/jord/studio/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** (UI) with **sindri** for the fetch contract |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/vercel-react-best-practices/` · `.agents/skills/graft/` |
| **Suggested model** | `gpt-5.6-sol-medium` |
| **Est. time** | **2–3 h** |
| **Parallel?** | **No** |

## Goal

Row-level operations work from the grid and the inspector — insert row (typed form from the column model), duplicate, delete with confirm, multi-select + bulk delete — over a paginated fetch that keeps 10k rows scrolling without jank.

## Done when

- [x] Insert/duplicate/delete/bulk delete all work and reflect in the grid after ack
- [x] Bulk delete reports per-row failures instead of pretending success
- [x] 10k rows scroll at the measured target (virtualized window &lt; 200 DOM rows for 10k)
- [x] Empty state offers insert
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/apolyx test` | **171 passed** · exit 0 (includes selection + 10k virtualization) |
| 2026-11-02 | `pnpm --filter @altr/apolyx typecheck` | exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio exec node --import tsx --test src/lib/studio-row-ops.test.ts src/lib/studio-inspector.test.ts` | **14 passed** · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio typecheck` | exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio build` | exit 0 |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/studio/README.md` |
| Queue | [[../README]] |
