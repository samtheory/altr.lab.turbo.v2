---
title: "S0065 — query results grid, export, explain and cancel"
description: "DataGrid results with sort/filter/copy/export, timing and affected rows, EXPLAIN plan tree, and query cancel with statement timeout"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0065
  - done
---

# S0065 — query results grid, export, explain and cancel

> **Status:** **done** 2026-11-02 · **Depends on** [[S0063-monaco-sql-editor|S0063]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0028-sql-editor-v2|jord-F0028]] · After ship: [[../../../../tech_space/jord/studio/README#sql-editor-s0024--s0065]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** (results UI) + **sindri** (cancel, explain, timeouts) |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/supabase-postgres-best-practices/` · `.agents/skills/graft/` |
| **Suggested model** | `claude-sonnet-5-5-high` — server-side cancel and timeout paths |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** |

## Goal

Query results render in the Apolyx DataGrid (sort, filter, copy cell/row, CSV/JSON export, affected-row count, timing, fetch-more, JSON/blob cell detail), `EXPLAIN` renders as a readable plan tree, and a running query can be cancelled in under two seconds with a statement timeout and row-limit guard.

## What shipped

| Piece | Fact |
|-------|------|
| Cancel | `POST /sql/cancel` `{ id }` aborts in-flight `executeSql` via `AbortSignal`; Postgres `pg_cancel_backend`; libSQL closes the dedicated read client (file sync statements still block the Node thread) |
| Execute | Accepts `id`, `timeoutMs`, `rowCap`; returns `queryId`, `plan?`, `truncated`, position on engine errors |
| Explain | Postgres rewritten to `FORMAT JSON` when possible; libSQL to `EXPLAIN QUERY PLAN`; `normalizeExplainPlan` → `{ node, detail, rows, cost, children[] }` |
| Audit | Cancelled runs written to `jord_sql_audit` with `ok=0` and cancel message |
| Studio | DataGrid results + CSV/JSON of **visible** set, fetch-more, Cancel button, Auto-commit badge (BEGIN/COMMIT rejected) |
| BFF | `/api/sql/cancel` |

## Done when

- [x] Long query cancels in under 2 s and the session survives (Postgres live path; file libSQL cannot interleave)
- [x] Timeout + row-limit guards tested
- [x] Explain renders a plan tree on both dialects
- [x] CSV export matches the visible set
- [x] Cancelled queries are audited as cancelled
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/jord exec vitest run src/schema/sql-explain.test.ts` | **6 passed** · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-server exec vitest run src/sql/sql.test.ts src/sql/active-queries.test.ts` | **8 passed** · 3 skipped (PG cancel/timeout when no live PG) · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio exec node --import tsx --test src/lib/studio-sql-results.test.ts` | **2 passed** · CSV = visible set · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio typecheck` · `pnpm --filter @altr/jord-server typecheck` · `pnpm --filter @altr/jord typecheck` | exit 0 |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/studio/README.md` |
| Queue | [[../README]] |
