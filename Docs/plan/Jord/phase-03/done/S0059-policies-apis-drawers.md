---
title: "S0059 — per-table Policies and APIs drawers"
description: "Right-inspector drawers for a table: policy list/edit with affected-row preview, and the API catalogue with example calls and try-it"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0059
  - done
---

# S0059 — per-table Policies and APIs drawers

> **Status:** **done** 2026-11-02 · **Depends on** [[S0048-right-inspector|S0048]] + [[S0056-grid-column-ops|S0056]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0025-tables-workspace-v2|jord-F0025]] · After ship: [[../../../../tech_space/jord/studio/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/graft/` · `.agents/skills/web-design-guidelines/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** |

## Goal

Two buttons on the table (grid header and row action) open `?inspector=policies` and `?inspector=apis`: the first manages policies for that table with a preview of affected rows, the second documents every way to call the table — routes, auth header, copyable `curl`/`fetch`, a try-it runner, and the realtime channel name.

## Done when

- [x] Both drawers deep-link and open for the active table
- [x] Policy create/edit/delete works with a real affected-row preview
- [x] API examples are copyable and the try-it runner returns the live response
- [x] A saved policy is reflected in the API drawer
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/jord-studio exec node --import tsx --test src/lib/studio-inspector.test.ts src/lib/studio-table-policies.test.ts src/lib/studio-table-apis.test.ts` | **14 passed** · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio typecheck` | exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio build` | exit 0 |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/studio/README.md` |
| Queue | [[../README]] |
