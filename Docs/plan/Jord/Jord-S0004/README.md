---
title: "Jord-S0004 — Studio S2 schema foundation"
description: "Active plan: libSQL schema introspect, Studio schema browser/visualizer, additive live save"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0004
  - jord-studio
  - sprint
---

# Jord-S0004 — Studio S2 schema foundation

> Who: **mimir** conducts; **sindri/saga** for engine+server; **apollo** for Studio UI. **Status: ready — implement next.** Intent: [[../../../feature_list/Jord/03-jord-studio]] (phase **S2**). Prior Studio: [[../Jord-S0003/README]] · [[../../../tech_space/jord/02-s0003-studio-shell]]. Engine: [[../../../tech_space/jord/00-s0001-slice0]].

**Sprint id:** `Jord-S0004`  
**Opened:** 2026-10-21 · **Ready:** 2026-10-21 · **Owner:** mimir  
**Do not** start auth, jobs, Postgres adapter runtime, realtime, blobs, or vectors in this sprint.

## Why this sprint

Studio can edit **rows** of `records`. Studio S2 needs **schema**: see tables/columns (SQL truth), a simple visualizer, and a narrow **live save** path so “schema” is not export-SQL-only.

Today code only has idempotent `CREATE TABLE records` (`elements/jord/src/schema/migrate.ts`). There is no introspect API and the Database → Schema nav item is a placeholder.

## Goal

1. **Engine:** list tables + columns from the open libSQL file (PRAGMA / sqlite_master).
2. **Server:** HTTP schema routes through the write-safe process (reads are fine; DDL applies via the write queue).
3. **Studio:** Schema page under Database — browser + minimal visualizer; wire side nav live.
4. **Live save (v1):** additive only — `ADD COLUMN` with SQL preview; no DROP / RENAME / multi-table create in this sprint.

## Phases

Run in order. Engine before UI.

| # | Card | Delivers | Default hat |
|---|------|----------|-------------|
| 1 | [[01-engine-introspect]] | `listTables` / `describeTable` on `JordDriverPort` | **sindri** (+ saga types) |
| 2 | [[02-server-schema-routes]] | `GET` schema + `POST` additive DDL (queued) | **sindri** |
| 3 | [[03-studio-schema-browser]] | BFF + Schema page; nav “Schema visualizer” live | **apollo** |
| 4 | [[04-schema-visualizer]] | Simple table/column graph (or structured canvas) | **apollo** |
| 5 | [[05-live-save-add-column]] | Preview + apply `ADD COLUMN` for an existing table | saga + apollo |
| 6 | [[06-verify]] | Tests / typecheck / smoke; docs_man tech_space | heimdall + **docs_man** |

## Plan-level decisions

1. **Still `file:` only.** No hosted libSQL, no PostgresAdapter install.
2. **Introspect = SQL catalog**, not Drizzle-only. Prefer `sqlite_master` + `PRAGMA table_info` so user-created tables (later) show up.
3. **Slice 0 `records` remains the primary table.** Visualizer must work with one table; design for N tables.
4. **Live save v1 = additive.** Allowed: `ALTER TABLE … ADD COLUMN …` with type whitelist (`TEXT`, `INTEGER`, `REAL`, `BLOB`). Forbidden: DROP, RENAME, CREATE TABLE UI, foreign keys UI.
5. **DDL goes through `@altr/jord-server` write queue** (same invariant as row writes). Studio never opens `data/jord.db`.
6. **Apolyx-first** for all Studio UI. Missing kit control → apollo builds in kit first.
7. **Out of sprint:** migrations history UI, drizzle-kit pipeline, relations/FK editor, auth, jobs, Artemis screens.

## Definition of done

- [ ] Every card's "Done when" holds
- [ ] Studio Database → Schema shows live `records` columns from the running DB
- [ ] Operator can preview and apply one additive column; refresh introspect shows it
- [ ] `pnpm --filter @altr/jord test` + `@altr/jord-server test` + `@altr/jord-studio typecheck` pass
- [ ] tech_space note after ship (card 6)
- [ ] No kit primitives invented in `apps/jord-studio`

## Links

- Track: [[../README]]
- Studio S2 intent: [[../../../feature_list/Jord/03-jord-studio]]
- Later slices: [[../../../feature_list/Jord/01-later]]
- Architecture: [[../../../feature_list/Jord/02-architecture]]
