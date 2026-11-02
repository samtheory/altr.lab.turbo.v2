---
title: "S0056 — grid column ops, filter builder and saved views"
description: "Consume the Apolyx DataGrid in Studio: reorder/pin/resize/hide columns, typed filter builder, quick search, named per-table views"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0056
  - done
---

# S0056 — grid column ops, filter builder and saved views

> **Status:** **done** 2026-11-02 · **Unblocked by** kit [[../../../../feature_list/ui-kit/apolyx-F0008-datagrid|apolyx-F0008]] (column ops slice) · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0025-tables-workspace-v2|jord-F0025]] · After ship: [[../../../../tech_space/jord/studio/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** (Studio consumes the kit; build any missing grid capability in `elements/ui-kit`, never locally) |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/vercel-react-best-practices/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** — do not fork a second table implementation in the app |

## Goal

The Tables screen renders through `@altr/apolyx` DataGrid with header actions (sort, filter, hide/show, pin left/right, resize, drag reorder, reset), a typed filter builder usable above the grid, quick search, and named views (filters + order + widths) saved per table per project.

## Done when

- [x] Every header op works and survives reload via the view
- [x] Filter operators match column types
- [x] Saved views are per table per project
- [x] No second grid implementation in the app
- [x] Typecheck + build pass; proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/apolyx test` | **169 passed** · exit 0 (includes `data-grid.test.tsx`) |
| 2026-11-02 | `pnpm --filter @altr/apolyx typecheck` | exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio typecheck` | exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio exec node --import tsx --test src/lib/studio-table-views.test.ts src/lib/studio-workspace-tabs.test.ts` | **10 passed** · exit 0 |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/studio/README.md` + `Docs/tech_space/ui-kit/README.md` |
| Queue | [[../README]] |
