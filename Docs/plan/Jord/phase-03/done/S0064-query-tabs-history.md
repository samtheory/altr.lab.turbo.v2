---
title: "S0064 — query tabs, saved queries and history"
description: "Multiple named query tabs with unsaved guards, saved queries per project, searchable per-user execution history in the SQL sidebar"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0064
  - done
---

# S0064 — query tabs, saved queries and history

> **Status:** **done** 2026-11-02 · **Depends on** [[S0063-monaco-sql-editor|S0063]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0028-sql-editor-v2|jord-F0028]] · After ship: [[../../../../tech_space/jord/studio/README#sql-editor-s0024--s0064]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** (UI) + **saga** (saved-query storage) |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/graft/` |
| **Suggested model** | `gpt-5.6-sol-medium` |
| **Est. time** | **2–3 h** |
| **Parallel?** | **No** |

## Goal

The SQL workspace gets tabs (create, rename, reorder, close with unsaved guard), saved queries stored per project, and a searchable execution history (timestamp, duration, status) that re-opens a past statement — with the history list living in the SQL contextual sidebar.

## What shipped

| Piece | Fact |
|-------|------|
| History source | `GET /sql/history` reads **`jord_sql_audit`** (search `q`, `failed=1`, `limit`) — no duplicate history table; in-memory list removed |
| Saved queries | Migration `0014_saved_queries.sql` → `jord_saved_queries`; CRUD at `/sql/saved-queries` (+ `/:id`) admin-only, writes via enqueueWrite |
| Studio BFF | `/api/sql/history`, `/api/sql/saved-queries`, `/api/sql/saved-queries/[id]` |
| Tabs | `SqlWorkspaceProvider` — create / rename (double-click) / drag reorder / close with dirty AlertDialog; persist `localStorage` `jord.studio.sql.tabs:v1:<projectSlug>` |
| Dirty model | `dirty = sql !== baseline`; baseline updates on successful execute or save |
| Open policy | Opening a **saved query** or **history** entry always creates a **new** tab |
| Sidebar | `StudioSqlSidebar` (Saved / History sections, search, failed-only filter) when `contextual === "queries"` |
| Shortcuts | `Ctrl/Cmd+Enter` run · `Ctrl/Cmd+T` new · `Ctrl/Cmd+W` close · `Ctrl/Cmd+S` save |

## Done when

- [x] Tabs survive reload and guard unsaved changes on close
- [x] Saved queries are per project and searchable
- [x] History comes from the audit source and re-opens a statement
- [x] Shortcuts work
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/jord-server exec vitest run src/sql/sql.test.ts` | **3 passed** · 1 skipped (PG sleep) · history from audit + saved CRUD · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio exec node --import tsx --test src/lib/studio-sql-workspace.test.ts` | **7 passed** · dirty/close/persist/reorder · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio typecheck` | exit 0 |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/studio/README.md` |
| Queue | [[../README]] |
