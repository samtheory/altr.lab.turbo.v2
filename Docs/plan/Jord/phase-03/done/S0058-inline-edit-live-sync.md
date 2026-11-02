---
title: "S0058 — inline double-click edit + optimistic write + live merge"
description: "Double-click a cell to edit with typed editors, optimistic update reconciled on write-queue ack, realtime merges that never clobber the cell being edited"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0058
  - done
---

# S0058 — inline double-click edit + optimistic write + live merge

> **Status:** **done** 2026-11-02 · **Depends on** [[S0057-row-ops-pagination|S0057]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0025-tables-workspace-v2|jord-F0025]] · After ship: [[../../../../tech_space/jord/studio/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** (UI state) + **sindri** (conditional write contract) |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/graft/` · `.agents/skills/vercel-react-best-practices/` |
| **Suggested model** | `claude-sonnet-5-5-high` — optimistic + concurrent edit edge cases |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** |

## Goal

Double-click a cell → typed editor → Enter commits / ESC cancels. The value updates optimistically, reconciles with the write-queue ack, rolls back with a visible error on rejection, and realtime events from other clients merge into the grid without overwriting a cell currently being edited.

## Done when

- [x] Double-click edits persist and show the server value
- [x] Rejected write restores the previous cell with a visible error
- [x] Concurrent realtime event does not clobber an in-progress edit
- [x] Deleted-by-other row disappears (or warns if being edited)
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/jord exec vitest run src/schema/row-write.test.ts` | **3 passed** · exit 0 (includes `old` CAS plan) |
| 2026-11-02 | `pnpm --filter @altr/apolyx test` | **176 passed** · exit 0 (edit helpers + double-click commit) |
| 2026-11-02 | `pnpm --filter @altr/apolyx typecheck` | exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord typecheck` | exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-server typecheck` | exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio exec node --import tsx --test src/lib/studio-inline-edit.test.ts` | **4 passed** · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio typecheck` | exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio build` | exit 0 |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/studio/README.md` |
| Queue | [[../README]] |
